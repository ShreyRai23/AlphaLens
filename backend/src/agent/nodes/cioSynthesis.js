import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { updateJob } from '../jobStore.js';
import AnalysisReport from '../../models/AnalysisReport.js';

export const NODE_NAME = 'CIO Synthesis';

// ── Strict JSON Output Schema (Zod) ──────────────────────────────────────────
// This schema is the contract between the backend and the frontend dashboard.
// Every field maps directly to a UI component.
export const ReportSchema = z.object({
  companyName: z
    .string()
    .describe('Full, properly-cased company name as analyzed'),

  verdict: z
    .enum(['INVEST', 'PASS'])
    .describe('Final binary investment verdict from the CIO'),

  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Overall conviction score 0-100. INVEST requires >= 60'),

  executiveSummary: z
    .string()
    .describe('3-4 sentence executive summary of the core investment thesis or rejection rationale'),

  financialScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Quantitative financial health score 0-100'),

  sentimentScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Qualitative sentiment, risk, and positioning score 0-100'),

  keyMetrics: z.object({
    revenueGrowth: z
      .string()
      .describe('Revenue growth assessment, e.g. "18% YoY, decelerating from 25%"'),
    profitMargin: z
      .string()
      .describe('Profitability assessment, e.g. "Net margin 12%, expanding +150bps YoY"'),
    debtLevel: z
      .string()
      .describe('Balance sheet / leverage assessment, e.g. "Net debt 2.1x EBITDA, manageable"'),
    moatStrength: z
      .string()
      .describe('Competitive moat strength, e.g. "Strong — high switching costs + network effects"'),
  }),

  bullArguments: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('3 to 5 strongest bull case arguments for investing'),

  bearArguments: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('3 to 5 most critical bear case arguments / key risks'),

  riskLevel: z
    .enum(['LOW', 'MEDIUM', 'HIGH'])
    .describe('Overall investment risk classification'),

  recommendedHorizon: z
    .string()
    .describe('Recommended investment time horizon, e.g. "12-18 months", "3-5 years"'),

  dataSourcesSummary: z
    .string()
    .describe('One sentence describing data sources and recency used for this analysis'),
});

// ── CIO System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Chief Investment Officer of a premier global hedge fund.
You have received independent quantitative and qualitative analyses from your senior research team.
Your mandate: synthesize their findings and render a definitive, reasoned investment verdict.

SCORING FRAMEWORK:
- financialScore (0-100): Based on growth quality, profitability, balance sheet, FCF, capital efficiency
- sentimentScore (0-100): Based on market positioning, regulatory risk, leadership, ESG, macro tailwinds
- confidenceScore: Weighted blend — 60% financialScore + 40% sentimentScore, adjusted for conviction
- INVEST verdict: confidenceScore >= 60, with no single catastrophic bear risk
- PASS verdict: confidenceScore < 60, OR any unacceptable risk (regulatory, solvency, fraud)

CRITICAL: Your response must be a perfectly structured JSON object matching the exact schema.
No preamble, no markdown, no commentary outside the JSON.`;

/**
 * CIO Synthesis Node
 *
 * The final arbitration node. Weighs financial + sentiment analyses using
 * Gemini 2.5 Flash with structured output (Zod schema enforcement).
 * Falls back to robust manual JSON parsing if structured output fails.
 *
 * Guarantees: output always conforms to ReportSchema.
 */
export const cioSynthesisNode = async (state) => {
  const { companyName, financialAnalysis, sentimentAnalysis, jobId } = state;

  console.log(`\n🏛️  [${NODE_NAME}] Starting synthesis for: "${companyName}"`);

  // ── Update live status ────────────────────────────────────────────────────
  updateJob(jobId, { currentNode: NODE_NAME });
  await AnalysisReport.findOneAndUpdate({ jobId }, { currentNode: NODE_NAME });

  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.1, // Minimal variance — deterministic structured output
  });

  const userMessage = `Synthesize the following research and render a definitive investment verdict for **${companyName}**:

═══════════════════════════════════════
QUANTITATIVE FINANCIAL ANALYSIS
═══════════════════════════════════════
${financialAnalysis}

═══════════════════════════════════════
QUALITATIVE SENTIMENT & RISK ANALYSIS
═══════════════════════════════════════
${sentimentAnalysis}

Produce the complete investment report JSON with all required fields.`;

  let finalReport;

  // ── Primary: Structured Output (Zod schema enforcement) ──────────────────
  try {
    const structuredLlm = llm.withStructuredOutput(ReportSchema, {
      name: 'investment_report',
    });

    finalReport = await structuredLlm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(userMessage),
    ]);

    // Validate with Zod (belt-and-suspenders)
    finalReport = ReportSchema.parse(finalReport);
    console.log(
      `   [${NODE_NAME}] ✅ Structured output succeeded. Verdict: ${finalReport.verdict} (confidence: ${finalReport.confidenceScore})`
    );

  } catch (structuredError) {
    // ── Fallback: Manual JSON parsing ─────────────────────────────────────
    console.warn(
      `   [${NODE_NAME}] ⚠️  Structured output failed (${structuredError.message}). Trying manual JSON parse...`
    );

    const fallbackSystemPrompt = `${SYSTEM_PROMPT}

RESPOND WITH ONLY THE FOLLOWING JSON STRUCTURE — NOTHING ELSE:
{
  "companyName": "string",
  "verdict": "INVEST" or "PASS",
  "confidenceScore": number 0-100,
  "executiveSummary": "string",
  "financialScore": number 0-100,
  "sentimentScore": number 0-100,
  "keyMetrics": {
    "revenueGrowth": "string",
    "profitMargin": "string",
    "debtLevel": "string",
    "moatStrength": "string"
  },
  "bullArguments": ["string", "string", "string"],
  "bearArguments": ["string", "string", "string"],
  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
  "recommendedHorizon": "string",
  "dataSourcesSummary": "string"
}`;

    const fallbackResponse = await llm.invoke([
      new SystemMessage(fallbackSystemPrompt),
      new HumanMessage(userMessage),
    ]);

    let raw = fallbackResponse.content;

    // Strip markdown code fences if model wrapped the JSON
    raw = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Extract first valid JSON object from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('CIO Synthesis node: no valid JSON found in fallback response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate against Zod schema — throws if malformed
    finalReport = ReportSchema.parse(parsed);

    console.log(
      `   [${NODE_NAME}] ✅ Manual JSON parse succeeded. Verdict: ${finalReport.verdict} (confidence: ${finalReport.confidenceScore})`
    );
  }

  return { finalReport };
};
