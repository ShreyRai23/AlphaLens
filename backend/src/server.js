/**
 * Investment Research Agent — Express Backend Entry Point
 *
 * Boot sequence:
 *  1. Load env vars (dotenv)
 *  2. Connect to MongoDB (with Google DNS resolver already active via db.js)
 *  3. Compile LangGraph (imported transitively through agent/graph.js)
 *  4. Start HTTP server
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import reportRoutes from './routes/reports.js';
import compareRoutes from './routes/compare.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Core Middleware ───────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request Logger (development) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Investment Research Agent API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/jobs',    jobRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/compare', compareRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET  /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/jobs',
      'GET  /api/jobs/:jobId',
      'GET  /api/reports/me',
      'GET  /api/reports/:id',
    ],
  });
});

// ── Global Error Handler (must be last middleware) ────────────────────────────
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Connect to MongoDB (DNS fix is applied inside db.js at module init)
    await connectDB();

    app.listen(PORT, () => {
      const SEP = '═'.repeat(52);
      console.log(`\n${SEP}`);
      console.log(`  🏦  Investment Research Agent API`);
      console.log(`  🌐  http://localhost:${PORT}`);
      console.log(`  🔧  Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📡  Health      : http://localhost:${PORT}/health`);
      console.log(`${SEP}\n`);
    });
  } catch (err) {
    console.error('❌ Fatal startup error:', err.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions to prevent silent crashes in production
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
  // Don't exit — let the global error handler deal with it gracefully
});

start();
