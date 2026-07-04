import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { updateJob } from '../jobStore.js';
import AnalysisReport from '../../models/AnalysisReport.js';

export const NODE_NAME = 'Sentiment Mapping';

const SYSTEM_PROMPT = `You are a Senior Market Intelligence Analyst specializing in qualitative investment research.
Your role is to surface the soft, non-quantitative dimensions of investment risk that pure financial analysis misses.
Write with the precision of an institutional research note.

Analyze the provided data across exactly these 7 qualitative dimensions:

1. **Market Sentiment & Brand Equity** — Public/investor perception, brand trust trajectory, consumer NPS signals, social media sentiment
2. **Regulatory & Legal Risk** — Pending investigations, antitrust exposure, compliance burden, licensing risks, recent regulatory actions
3. **Leadership & Governance** — CEO track record, board independence, insider ownership alignment, recent executive changes
4. **Innovation & Technology Positioning** — R&D pipeline depth, digital transformation maturity, AI/tech adoption, disruption vulnerability
5. **ESG Risk Factors** — Environmental liabilities, social controversies (labor, supply chain), governance red flags, ESG ratings trajectory
6. **Macro & Sectoral Dynamics** — Industry cycle positioning, interest rate sensitivity, geopolitical exposure, demand elasticity
7. **Competitive Dynamics** — Market share trajectory, key competitor threats, pricing pressure, new entrant disruption risk

FORMAT your output as a structured analytical brief with a clear header for each dimension.
Use evidence from the research data. Surface NON-OBVIOUS RISKS that aren't in the financial statements.
Flag RED FLAGS (⚠️) and STANDOUT POSITIVES (✅) explicitly.
Conclude with a 2-sentence "Sentiment Verdict" summarizing your qualitative assessment.`;

/**
 * Sentiment Mapping Node
 *
 * Instructs Gemini 2.5 Flash to act as a market intelligence analyst,
 * mapping qualitative risk and perception across 7 structured dimensions.
 */
export const sentimentNode = async (state) => {
  const { companyName, harvestedData, financialAnalysis, jobId } = state;

  console.log(`\n🧭 [${NODE_NAME}] Starting for: "${companyName}"`);

  // ── Update live status ────────────────────────────────────────────────────
  updateJob(jobId, { currentNode: NODE_NAME });
  await AnalysisReport.findOneAndUpdate({ jobId }, { currentNode: NODE_NAME });

  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.3,
  });

  const response = await llm.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`Perform a comprehensive qualitative sentiment and risk analysis of **${companyName}**.

Primary Research Data:
${harvestedData}

Quantitative Financial Context (from our in-house financial analyst):
${financialAnalysis}

Analyze all 7 qualitative dimensions. Prioritize non-obvious risks not reflected in the financial data.
Your analysis will directly feed into the Chief Investment Officer's final synthesis and verdict.`),
  ]);

  const sentimentAnalysis = response.content;
  console.log(
    `   [${NODE_NAME}] ✅ Analysis complete. (${sentimentAnalysis.length} chars)`
  );

  return { sentimentAnalysis };
};
