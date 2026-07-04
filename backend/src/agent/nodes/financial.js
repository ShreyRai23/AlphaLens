import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { updateJob } from '../jobStore.js';
import AnalysisReport from '../../models/AnalysisReport.js';

export const NODE_NAME = 'Financial Underwriting';

const SYSTEM_PROMPT = `You are a Senior Quantitative Financial Analyst at a premier institutional asset manager.
Your mandate is to evaluate fundamental financial health with the rigor expected by an investment committee.

Analyze the provided research data across exactly these 7 dimensions:

1. **Revenue Growth Trajectory** — YoY/QoQ trends, acceleration/deceleration, organic vs. inorganic growth
2. **Profitability Metrics** — Gross margin, EBITDA margin, operating margin, net margin; trends and drivers
3. **Balance Sheet Strength** — Total debt, cash & equivalents, net debt, debt-to-equity, interest coverage ratio
4. **Free Cash Flow Quality** — FCF generation, FCF margin, FCF conversion from net income, capex intensity
5. **Capital Efficiency** — ROIC, ROE, ROA; are returns above cost of capital?
6. **Competitive Moat** — Pricing power evidence, switching costs, network effects, structural barriers to entry
7. **Valuation Context** — Relative P/E, EV/EBITDA, P/S vs. peers and historical ranges; is the stock cheap/rich?

FORMAT your output as a structured analytical brief with a clear header for each dimension.
Be data-driven: cite specific numbers where the research data provides them.
Flag RED FLAGS (⚠️) and STANDOUT POSITIVES (✅) explicitly.
Conclude with a 2-sentence "Financial Verdict" summarizing your quantitative assessment.`;

/**
 * Financial Underwriting Node
 *
 * Instructs Gemini 2.5 Flash to act as a quantitative financial analyst,
 * evaluating fundamental health from the harvested research data.
 */
export const financialNode = async (state) => {
  const { companyName, harvestedData, jobId } = state;

  console.log(`\n📊 [${NODE_NAME}] Starting for: "${companyName}"`);

  // ── Update live status ────────────────────────────────────────────────────
  updateJob(jobId, { currentNode: NODE_NAME });
  await AnalysisReport.findOneAndUpdate({ jobId }, { currentNode: NODE_NAME });

  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2, // Low variance for analytical consistency
  });

  const response = await llm.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`Perform a comprehensive quantitative financial analysis of **${companyName}**.

Use the following research data as your primary evidence base:

${harvestedData}

Structure your analysis across all 7 dimensions. Be specific — use actual figures from the data where available.
End with your "Financial Verdict" (2 sentences).`),
  ]);

  const financialAnalysis = response.content;
  console.log(
    `   [${NODE_NAME}] ✅ Analysis complete. (${financialAnalysis.length} chars)`
  );

  return { financialAnalysis };
};
