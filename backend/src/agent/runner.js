import { v4 as uuidv4 } from 'uuid';
import { researchGraph } from './graph.js';
import { createJob, updateJob } from './jobStore.js';
import AnalysisReport from '../models/AnalysisReport.js';

/**
 * initializeJob
 *
 * Creates the job record in both the in-memory store and MongoDB,
 * returns the new jobId. Called synchronously before the 202 response.
 *
 * @param {string} companyName   Original company name (display casing)
 * @param {string} userId        Authenticated user's MongoDB ObjectId string
 * @returns {Promise<string>}    The generated UUID jobId
 */
export const initializeJob = async (companyName, userId) => {
  const jobId = uuidv4();

  // In-memory entry (serves polling requests instantly)
  createJob(jobId, userId, companyName.toLowerCase().trim());

  // Persistent DB record (survives process restarts, drives TTL cache)
  await AnalysisReport.create({
    userId,
    companyName: companyName.toLowerCase().trim(),
    companyNameDisplay: companyName.trim(),
    jobId,
    status: 'pending',
  });

  console.log(`📋 [Runner] Job initialized: ${jobId} | Company: "${companyName}"`);
  return jobId;
};

/**
 * runAgentWorkflow
 *
 * Executes the LangGraph research pipeline as a fire-and-forget background task.
 * Updates both the in-memory jobStore and MongoDB at every state transition.
 *
 * Error handling: ALL exceptions are caught. The job transitions to 'failed'
 * with a human-readable error message. The process NEVER crashes.
 *
 * @param {string} jobId
 * @param {string} companyName
 * @param {string} userId
 */
export const runAgentWorkflow = async (jobId, companyName, userId) => {
  const SEPARATOR = '═'.repeat(60);
  console.log(`\n${SEPARATOR}`);
  console.log(`  🚀 [Runner] Workflow started`);
  console.log(`  Job ID  : ${jobId}`);
  console.log(`  Company : ${companyName}`);
  console.log(`  User    : ${userId}`);
  console.log(`${SEPARATOR}\n`);

  try {
    // ── Execute the full 4-node LangGraph pipeline ──────────────────────────
    const result = await researchGraph.invoke({
      companyName,
      jobId,
      userId,
      harvestedData: '',
      financialAnalysis: '',
      sentimentAnalysis: '',
      finalReport: null,
    });

    const { finalReport } = result;

    if (!finalReport) {
      throw new Error('LangGraph completed but finalReport is null — CIO synthesis failed.');
    }

    // ── Persist completed report ────────────────────────────────────────────
    await AnalysisReport.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        currentNode: 'Completed',
        report: finalReport,
      }
    );

    updateJob(jobId, {
      status: 'completed',
      currentNode: 'Completed',
      report: finalReport,
    });

    console.log(`\n${SEPARATOR}`);
    console.log(`  ✅ [Runner] Job COMPLETED`);
    console.log(`  Job ID  : ${jobId}`);
    console.log(`  Verdict : ${finalReport.verdict}`);
    console.log(`  Score   : ${finalReport.confidenceScore}/100`);
    console.log(`${SEPARATOR}\n`);

  } catch (error) {
    // ── Graceful failure — never crash the process ─────────────────────────
    const errorMessage = error?.message || 'An unknown error occurred during AI analysis.';

    console.error(`\n${SEPARATOR}`);
    console.error(`  ❌ [Runner] Job FAILED`);
    console.error(`  Job ID  : ${jobId}`);
    console.error(`  Error   : ${errorMessage}`);
    console.error(`${SEPARATOR}\n`);

    // Update MongoDB (best-effort — don't let a DB error mask the original error)
    await AnalysisReport.findOneAndUpdate(
      { jobId },
      {
        status: 'failed',
        currentNode: 'Failed',
        errorMessage,
      }
    ).catch((dbErr) =>
      console.error(`[Runner] ⚠️  Failed to write error to DB: ${dbErr.message}`)
    );

    // Update in-memory store
    updateJob(jobId, {
      status: 'failed',
      currentNode: 'Failed',
      error: errorMessage,
    });
  }
};
