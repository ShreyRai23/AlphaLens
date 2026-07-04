import { updateJob } from '../jobStore.js';
import AnalysisReport from '../../models/AnalysisReport.js';

export const NODE_NAME = 'Data Harvesting';

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Execute a single Tavily search query via the REST API.
 * Uses Node 18+ built-in fetch — no external HTTP library needed.
 *
 * @param {string} query
 * @param {string} apiKey
 * @param {number} maxResults
 * @returns {Promise<string>} Formatted search results as text
 */
const tavilySearch = async (query, apiKey, maxResults = 6) => {
  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tavily API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Format results into readable text for the LLM context
  let formatted = '';
  if (data.answer) {
    formatted += `AI Summary: ${data.answer}\n\n`;
  }
  if (data.results?.length) {
    formatted += data.results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
      )
      .join('\n\n');
  }
  return formatted || 'No results returned.';
};

/**
 * Data Harvesting Node
 *
 * Performs live multi-query web search via Tavily REST API across three angles:
 *  1. Latest financial results & key metrics
 *  2. Investment outlook, risks & analyst sentiment
 *  3. Competitive position & business model
 *
 * Falls back to an LLM-ready context stub if Tavily is unavailable,
 * ensuring the graph never hard-fails on a missing/invalid search API key.
 */
export const dataHarvestingNode = async (state) => {
  const { companyName, jobId } = state;

  console.log(`\n🔍 [${NODE_NAME}] Starting for: "${companyName}"`);

  // ── Update live status ────────────────────────────────────────────────────
  updateJob(jobId, { status: 'running', currentNode: NODE_NAME });
  await AnalysisReport.findOneAndUpdate(
    { jobId },
    { status: 'running', currentNode: NODE_NAME }
  );

  let harvestedData = '';

  try {
    if (!process.env.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not configured');
    }

    const queries = [
      `${companyName} financial results revenue profit earnings 2024 2025`,
      `${companyName} stock investment analysis risks outlook`,
      `${companyName} competitive advantage market share business model news`,
    ];

    console.log(`   [${NODE_NAME}] Running ${queries.length} Tavily searches concurrently...`);

    // Run all queries concurrently for speed
    const results = await Promise.all(
      queries.map((q) => tavilySearch(q, process.env.TAVILY_API_KEY))
    );

    harvestedData = results
      .map(
        (result, i) =>
          `\n${'─'.repeat(60)}\n📌 SEARCH ${i + 1}: ${queries[i]}\n${'─'.repeat(60)}\n${result}`
      )
      .join('\n');

    console.log(
      `   [${NODE_NAME}] ✅ Tavily search complete. Harvested ${harvestedData.length} chars.`
    );
  } catch (searchError) {
    // Graceful degradation — financial + sentiment nodes still produce full analysis
    console.warn(
      `   [${NODE_NAME}] ⚠️  Tavily unavailable (${searchError.message}). Using LLM knowledge fallback.`
    );

    harvestedData = `
[DATA SOURCE: LLM Prior Knowledge — Live web search unavailable]
Company: ${companyName}
Research Timestamp: ${new Date().toISOString()}

Instruction: Analyze ${companyName} based on your training knowledge.
Include all relevant financial metrics, recent news, competitive landscape, and strategic positioning.
Clearly note where information may be limited by knowledge cutoff.

Key analytical dimensions:
- Revenue trajectory and growth rates
- Profitability (gross/operating/net margins)
- Balance sheet strength (cash, debt, FCF)
- Competitive moat and market position
- Recent strategic moves and headwinds
- Management quality and governance
- Regulatory and macro risk factors
`;
    console.log(`   [${NODE_NAME}] Fallback context prepared.`);
  }

  return { harvestedData };
};
