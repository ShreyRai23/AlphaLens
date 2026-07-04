import { Router } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import AnalysisReport from '../models/AnalysisReport.js';

const router = Router();

// ─── GET /api/reports/me ──────────────────────────────────────────────────────
// Returns all completed reports belonging to the authenticated user.
// Data isolation: userId from JWT — users can never see each other's reports.
router.get(
  '/me',
  authGuard,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const reports = await AnalysisReport.find(
      { userId, status: 'completed' },
      // Projection: exclude the full report body for the list view (perf)
      {
        jobId: 1,
        companyNameDisplay: 1,
        status: 1,
        createdAt: 1,
        'report.verdict': 1,
        'report.confidenceScore': 1,
        'report.riskLevel': 1,
        'report.executiveSummary': 1,
      }
    ).sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports: reports.map((r) => ({
        id: r._id,
        jobId: r.jobId,
        companyName: r.companyNameDisplay,
        verdict: r.report?.verdict ?? null,
        confidenceScore: r.report?.confidenceScore ?? null,
        riskLevel: r.report?.riskLevel ?? null,
        executiveSummary: r.report?.executiveSummary ?? null,
        createdAt: r.createdAt,
      })),
    });
  })
);

// ─── GET /api/reports/:id ─────────────────────────────────────────────────────
// Returns a single full report. Accepts either MongoDB _id or jobId (UUID).
// TENANT ISOLATION: 403 if the requesting user does not own the report.
router.get(
  '/:id',
  authGuard,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Determine query type: 24-char hex = MongoDB ObjectId, else UUID jobId
    const isObjectId = /^[a-f\d]{24}$/i.test(id);
    const query = isObjectId ? { _id: id } : { jobId: id };

    const report = await AnalysisReport.findOne(query);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found.',
      });
    }

    // ── Tenant isolation check ──────────────────────────────────────────────
    if (report.userId.toString() !== userId.toString()) {
      // Return 403 (not 404) to make the security boundary explicit
      return res.status(403).json({
        success: false,
        error: 'Access denied. This report belongs to another user.',
      });
    }

    return res.status(200).json({
      success: true,
      report: {
        id: report._id,
        jobId: report.jobId,
        companyName: report.companyNameDisplay,
        status: report.status,
        currentNode: report.currentNode,
        createdAt: report.createdAt,
        data: report.report,
        error: report.errorMessage ?? null,
      },
    });
  })
);

export default router;
