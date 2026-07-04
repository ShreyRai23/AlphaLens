/**
 * In-Memory Job State Tracker
 *
 * A singleton Map that holds the live state of every background AI job.
 * This allows GET /api/jobs/:id to respond with sub-millisecond latency
 * without hitting MongoDB on every poll.
 *
 * Trade-off: State is lost on process restart — jobs fall back to MongoDB
 * for recovery. In production, this would be backed by Redis.
 */

import { EventEmitter } from 'events';

/** @type {Map<string, JobEntry>} */
const jobStore = new Map();

/** Global emitter for job updates (used for SSE streaming) */
export const jobEmitter = new EventEmitter();
// Increase max listeners since many SSE clients could connect simultaneously
jobEmitter.setMaxListeners(100);

/**
 * @typedef {Object} JobEntry
 * @property {string} jobId
 * @property {string} userId
 * @property {string} companyName
 * @property {'pending'|'running'|'completed'|'failed'} status
 * @property {string|null} currentNode
 * @property {Object|null} report
 * @property {string|null} error
 * @property {string} createdAt  ISO timestamp
 */

/**
 * Create a new job entry in the store.
 * @param {string} jobId
 * @param {string} userId
 * @param {string} companyName
 * @returns {JobEntry}
 */
export const createJob = (jobId, userId, companyName) => {
  const job = {
    jobId,
    userId,
    companyName,
    status: 'pending',
    currentNode: null,
    report: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  jobStore.set(jobId, job);
  return job;
};

/**
 * Update an existing job entry (shallow merge).
 * @param {string} jobId
 * @param {Partial<JobEntry>} updates
 * @returns {JobEntry|null}
 */
export const updateJob = (jobId, updates) => {
  const job = jobStore.get(jobId);
  if (!job) return null;
  const updated = { ...job, ...updates };
  jobStore.set(jobId, updated);
  
  // Broadcast the update for SSE streams
  jobEmitter.emit('jobUpdate', { jobId, updated });
  
  return updated;
};

/**
 * Retrieve a job entry by ID.
 * @param {string} jobId
 * @returns {JobEntry|null}
 */
export const getJob = (jobId) => jobStore.get(jobId) ?? null;

/**
 * Remove a job from the store (optional cleanup).
 * @param {string} jobId
 */
export const deleteJob = (jobId) => jobStore.delete(jobId);

export default jobStore;
