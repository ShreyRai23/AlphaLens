import { Router } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { initializeJob, runAgentWorkflow } from '../agent/runner.js';
import { getJob, jobEmitter } from '../agent/jobStore.js';
import AnalysisReport from '../models/AnalysisReport.js';

const router = Router();

/** How long (in hours) a cached report is considered fresh */
const CACHE_TTL_HOURS = 24;

// ─── POST /api/jobs ───────────────────────────────────────────────────────────
// Accepts a company name, checks for a fresh cached report, and either
// returns it instantly (200) or fires a new background workflow (202).
router.post(
  '/',
  authGuard,
  asyncHandler(async (req, res) => {
    const { companyName } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!companyName || typeof companyName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'companyName is required and must be a string.',
      });
    }

    const trimmed = companyName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Company name must be between 2 and 100 characters.',
      });
    }

    const normalizedName = trimmed.toLowerCase();
    const userId = req.user.userId;

    // ── Cache check: fresh completed report within TTL window ───────────────
    const cutoffDate = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);

    const cachedReport = await AnalysisReport.findOne({
      companyName: normalizedName,
      status: 'completed',
      createdAt: { $gte: cutoffDate },
    }).sort({ createdAt: -1 });

    if (cachedReport) {
      console.log(
        `💾 [Jobs] Cache HIT for "${normalizedName}" (age: ${Math.round((Date.now() - cachedReport.createdAt) / 60000)}m)`
      );
      return res.status(200).json({
        success: true,
        cached: true,
        jobId: cachedReport.jobId,
        status: 'completed',
        cachedAt: cachedReport.createdAt,
        message: `Serving cached analysis for "${cachedReport.companyNameDisplay}". Freshness: within ${CACHE_TTL_HOURS}h.`,
        report: cachedReport.report,
      });
    }

    // ── Cache MISS: initialize and fire background workflow ─────────────────
    const jobId = await initializeJob(trimmed, userId);

    console.log(
      `🚀 [Jobs] Cache MISS for "${normalizedName}" — dispatching job ${jobId}`
    );

    // Fire-and-forget: setImmediate yields the event loop back to Express
    // so the 202 response is sent BEFORE the workflow begins executing.
    setImmediate(() => {
      runAgentWorkflow(jobId, trimmed, userId).catch((err) =>
        console.error(`[Jobs] Uncaught runner error for job ${jobId}:`, err.message)
      );
    });

    return res.status(202).json({
      success: true,
      cached: false,
      jobId,
      status: 'pending',
      message: `Research initiated for "${trimmed}". Poll GET /api/jobs/${jobId} for live status.`,
      pollUrl: `/api/jobs/${jobId}`,
    });
  })
);

// ─── GET /api/jobs/:jobId ─────────────────────────────────────────────────────
// Returns current job status. Checks in-memory store first (O(1)), falls back
// to MongoDB for jobs from a previous process run.
router.get(
  '/:jobId',
  authGuard,
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    // ── In-memory store: sub-millisecond for live jobs ──────────────────────
    const memJob = getJob(jobId);

    if (memJob) {
      return res.status(200).json({
        success: true,
        source: 'memory',
        jobId: memJob.jobId,
        status: memJob.status,
        currentNode: memJob.currentNode,
        report: memJob.report ?? null,
        error: memJob.error ?? null,
      });
    }

    // ── DB fallback: for recovered or historical jobs ───────────────────────
    const dbJob = await AnalysisReport.findOne({ jobId });

    if (!dbJob) {
      return res.status(404).json({
        success: false,
        error: `Job "${jobId}" not found. It may have expired or never existed.`,
      });
    }

    return res.status(200).json({
      success: true,
      source: 'database',
      jobId: dbJob.jobId,
      status: dbJob.status,
      currentNode: dbJob.currentNode,
      report: dbJob.report ?? null,
      error: dbJob.errorMessage ?? null,
    });
  })
);

// ─── GET /api/jobs/:id/stream (Server-Sent Events) ──────────────────────────
// Subscribes to live updates for a specific job. 
router.get(
  '/:id/stream',
  authGuard,
  asyncHandler(async (req, res) => {
    const { id: jobId } = req.params;

    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Helper to send SSE formatted messages
    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 1. Send the initial state immediately
    const initialJob = getJob(jobId);
    if (initialJob) {
      sendEvent(initialJob);
      if (initialJob.status === 'completed' || initialJob.status === 'failed') {
        res.end();
        return;
      }
    } else {
      // If not in memory, check DB. If it's in DB, it's already done (or we rebooted).
      const dbJob = await AnalysisReport.findOne({ jobId });
      if (dbJob) {
        sendEvent({
          jobId: dbJob.jobId,
          status: dbJob.status,
          currentNode: dbJob.currentNode,
          report: dbJob.report ?? null,
          error: dbJob.errorMessage ?? null,
        });
      } else {
        sendEvent({ status: 'failed', error: 'Job not found.' });
      }
      res.end();
      return;
    }

    // 2. Listen for live updates
    const handleUpdate = ({ jobId: updatedJobId, updated }) => {
      if (updatedJobId === jobId) {
        sendEvent(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          res.end();
          jobEmitter.off('jobUpdate', handleUpdate);
        }
      }
    };

    jobEmitter.on('jobUpdate', handleUpdate);

    // 3. Cleanup if client disconnects
    req.on('close', () => {
      jobEmitter.off('jobUpdate', handleUpdate);
    });
  })
);

export default router;
