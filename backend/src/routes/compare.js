import { Router } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import AnalysisReport from '../models/AnalysisReport.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const router = Router();

// ─── POST /api/compare ────────────────────────────────────────────────────────
// Accepts { jobIds: [id1, id2] }, fetches both reports (ownership-checked),
// calls Gemini to generate a "Best Pick" verdict, returns everything.
router.post(
  '/',
  authGuard,
  asyncHandler(async (req, res) => {
    const { jobIds } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(jobIds) || jobIds.length < 2) {
      return res.status(400).json({ error: 'Provide at least 2 jobIds to compare.' });
    }

    // Fetch both reports, enforce ownership
    const reports = await Promise.all(
      jobIds.map(id =>
        AnalysisReport.findOne({ jobId: id, userId, status: 'completed' })
      )
    );

    const missing = reports.some(r => !r || !r.report);
    if (missing) {
      return res.status(404).json({ error: 'One or more reports not found or not yet completed.' });
    }

    // Build a summary snippet for the LLM from each report
    const summaries = reports.map((r, i) => `
Company ${i + 1}: ${r.companyNameDisplay}
- Verdict: ${r.report.verdict}
- Confidence Score: ${r.report.confidenceScore}/100
- Financial Score: ${r.report.financialScore}/100
- Sentiment Score: ${r.report.sentimentScore}/100
- Risk Level: ${r.report.riskLevel}
- Recommended Horizon: ${r.report.recommendedHorizon || 'N/A'}
- Executive Summary: ${r.report.executiveSummary?.slice(0, 300)}…
    `.trim()).join('\n\n');

    // Call Gemini for a Best Pick verdict
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.3,
    });

    const response = await llm.invoke([
      new SystemMessage(`You are a Chief Investment Officer at an institutional asset manager.
You have just reviewed two AI-generated investment research reports.
Your job: in 2–3 crisp, professional sentences, state which company is the stronger investment pick and the most important reason why.
Be direct, decisive, and institutional in tone. Start with "Based on the analysis, it is recommended to..."`),
      new HumanMessage(`Compare these two investment analyses and give a Best Pick verdict:\n\n${summaries}`),
    ]);

    const bestPickVerdict = response.content;

    // Return both full reports + the AI verdict
    return res.status(200).json({
      success: true,
      bestPickVerdict,
      reports: reports.map(r => ({
        jobId: r.jobId,
        companyName: r.companyNameDisplay,
        verdict: r.report.verdict,
        confidenceScore: r.report.confidenceScore,
        financialScore: r.report.financialScore,
        sentimentScore: r.report.sentimentScore,
        riskLevel: r.report.riskLevel,
        recommendedHorizon: r.report.recommendedHorizon,
        executiveSummary: r.report.executiveSummary,
        bullArguments: r.report.bullArguments || [],
        bearArguments: r.report.bearArguments || [],
        keyMetrics: r.report.keyMetrics || {},
      })),
    });
  })
);

export default router;
