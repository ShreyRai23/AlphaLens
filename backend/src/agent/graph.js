import { StateGraph, Annotation } from '@langchain/langgraph';
import { dataHarvestingNode } from './nodes/dataHarvesting.js';
import { financialNode } from './nodes/financial.js';
import { sentimentNode } from './nodes/sentiment.js';
import { cioSynthesisNode } from './nodes/cioSynthesis.js';

// ── LangGraph State Schema ────────────────────────────────────────────────────
// Each field uses a "last-write-wins" reducer: the returning node's value
// replaces whatever was previously in state. Null-safe — won't overwrite with null.
const AgentState = Annotation.Root({
  // Inputs (set at invocation time)
  companyName: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  jobId: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  userId: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),

  // Populated by each node in sequence
  harvestedData: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  financialAnalysis: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  sentimentAnalysis: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  finalReport: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
});

/**
 * Compile the LangGraph state machine.
 *
 * Flow:
 *   __start__
 *       │
 *   dataHarvesting   ← pulls live web context (Tavily)
 *       │
 *   financial        ← quantitative analysis (Gemini 2.5 Flash)
 *       │
 *   sentiment        ← qualitative / risk analysis (Gemini 2.5 Flash)
 *       │
 *   cioSynthesis     ← final verdict + structured JSON (Gemini 2.5 Flash)
 *       │
 *   __end__
 */
const buildResearchGraph = () => {
  const graph = new StateGraph(AgentState)
    .addNode('dataHarvesting', dataHarvestingNode)
    .addNode('financial', financialNode)
    .addNode('sentiment', sentimentNode)
    .addNode('cioSynthesis', cioSynthesisNode)

    // Linear edges — each node passes full accumulated state to the next
    .addEdge('__start__', 'dataHarvesting')
    .addEdge('dataHarvesting', 'financial')
    .addEdge('financial', 'sentiment')
    .addEdge('sentiment', 'cioSynthesis')
    .addEdge('cioSynthesis', '__end__');

  return graph.compile();
};

// Export as singleton — compiled once at module load, reused across all job invocations
export const researchGraph = buildResearchGraph();

console.log('🧠 LangGraph research graph compiled and ready.');
