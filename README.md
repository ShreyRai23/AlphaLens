# AlphaLens - AI Investment Research Agent

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain" />
  <img src="https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white" alt="Gemini" />
</div>

<br />

## Overview

AlphaLens is an intelligent, agentic investment research platform. Given a company name, the AI agent autonomously conducts multi-dimensional research—analyzing financials, market sentiment, and risk factors—to formulate a definitive **Invest** or **Pass** verdict. 

Beyond standard text generation, the application features a robust multi-step reasoning architecture, a highly polished glassmorphism interface, side-by-side company comparisons, and the ability to export beautifully formatted, pixel-perfect PDF reports.

## How to Run It

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **MongoDB URI** (A local or Atlas connection string)
* **Google Gemini API Key** (Required for the LLM engine)

### Setup Instructions

1. **Clone the repository and install dependencies:**
   ```bash
   # Install Backend Dependencies
   cd backend
   npm install

   # Install Frontend Dependencies
   cd ../frontend
   npm install
   ```

2. **Configure Environment Variables:**
   Navigate to the `backend` directory and create a `.env` file:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Start the Application:**
   Open two separate terminal instances.

   **Terminal 1 (Backend):**
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the App:**
   Navigate to `http://localhost:5173` in your browser.

## How It Works

### Architecture
The system is divided into a React frontend and a Node.js/Express backend. The core intelligence is driven by **LangGraph.js**, which orchestrates a stateful, cyclical graph of LLM operations. 

Instead of relying on a single, monolithic prompt, the agent breaks the research process down into a structured pipeline:

1. **`analyze_request`**: Validates the user's input and establishes the baseline context for the company.
2. **`gather_financials`**: Evaluates quantitative metrics (revenue growth, profit margins, debt ratios).
3. **`gather_sentiment`**: Analyzes market sentiment, brand perception, and recent macro headwinds/tailwinds.
4. **`assess_risk`**: Evaluates structural, competitive, and regulatory risks.
5. **`synthesize_verdict`**: Consolidates all aggregated state data into a final verdict, generating a confidence score out of 100, Bull/Bear cases, and a comprehensive executive summary.

The backend saves these generated reports to MongoDB, exposing them via RESTful APIs for the frontend to consume, render into charts (using Recharts), and compare.

## Key Decisions & Trade-offs

* **LangGraph over Monolithic Prompts:** I chose to use LangGraph to create a deterministic state machine rather than relying on a single massive prompt. *Why:* This allows for isolated retries, easier debugging of specific research facets (e.g., financials vs. sentiment), and prevents the LLM from hallucinating by forcing it to answer specific sub-queries sequentially.
* **Simulated Data vs. Paid APIs:** To ensure the application runs seamlessly out-of-the-box for evaluators, the agent simulates real-time financial data retrieval via the LLM's vast knowledge base rather than requiring expensive, rate-limited third-party API keys (like AlphaVantage or Bloomberg).
* **Client-Side PDF Generation:** Instead of using heavy backend headless browsers (like Puppeteer) to generate PDFs, I utilized `html2canvas` and `jsPDF` on the frontend. *Trade-off:* It required complex DOM manipulation and CSS overrides (via `onclone`) to handle unsupported CSS like `backdrop-filter`, but vastly reduces server processing overhead and dependency bloat.
* **Server-Sent Events (SSE) for Real-Time UI:** Instead of standard HTTP polling, the backend leverages SSE via Node.js `EventEmitter` to stream LangGraph execution states instantly to the frontend. This provides a zero-latency "thinking" UI experience without the heavy overhead of full WebSockets.
* **Vanilla CSS over Frameworks:** The complex, modern glassmorphism UI was built entirely with custom CSS variables and utility classes rather than Tailwind. *Why:* It provided absolute, granular control over micro-interactions and gradient rendering, resulting in a distinctly premium feel.

## Example Runs

### 1. Tesla (TSLA)
* **Verdict:** PASS
* **Confidence Score:** 35/100
* **Risk Assessment:** HIGH
* **Agent Reasoning:** The agent identified significant headwinds for Tesla, noting its recent first-ever annual revenue decline and a plunge in Return on Invested Capital. The Bear case strongly emphasized intense competition in the core automotive segment eroding pricing power, while acknowledging the Bull case of strong liquidity. Ultimately, the high valuation multiples coupled with shrinking margins resulted in a PASS recommendation.

### 2. NVIDIA (NVDA)
* **Verdict:** INVEST
* **Confidence Score:** 92/100
* **Risk Assessment:** LOW
* **Agent Reasoning:** The agent generated an overwhelming INVEST verdict based on Nvidia's absolute dominance in the AI accelerator market. It highlighted a massive YoY revenue surge and unprecedented gross margins. The Bear case correctly identified geopolitical risks (export controls to China) and high valuation expectations, but the Bull case heavily outweighed it due to an impenetrable moat in CUDA software and relentless hyperscaler demand.

## What I Would Improve With More Time

* **Live Data Integration:** Integrate real-time financial APIs (e.g., Yahoo Finance, Polygon.io, or SEC Edgar tools) as external tools that the LangGraph agent can query dynamically for up-to-the-minute SEC filings and stock prices.
* **Advanced RAG (Retrieval-Augmented Generation):** Allow users to upload their own PDFs (like 10-K filings or earnings call transcripts) and have the agent parse, chunk, and include those specific documents in its synthesis step.
* **Portfolio Tracking:** Build a dedicated dashboard feature that tracks the aggregate historical performance of all "Invest" verdicts over time against benchmark indices like the S&P 500.
