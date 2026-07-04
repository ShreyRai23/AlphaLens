import mongoose from 'mongoose';

const analysisReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Normalized (lowercase) company name — used for cache lookup
    companyName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Original casing — used for display in UI
    companyNameDisplay: {
      type: String,
      required: true,
      trim: true,
    },
    jobId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    // The active LangGraph node name — drives the live progress tracker
    currentNode: {
      type: String,
      default: null,
    },
    // Structured JSON output from the CIO Synthesis node
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    // Timestamp — kept as a regular date field (no TTL; reports persist indefinitely)
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Disable Mongoose auto-timestamps so our custom createdAt drives the TTL index
    timestamps: false,
  }
);

// ── Compound index for cache lookups ──────────────────────────────────────────
// Supports: "find fresh completed report for this company, newest first"
analysisReportSchema.index({ companyName: 1, status: 1, createdAt: -1 });

export default mongoose.model('AnalysisReport', analysisReportSchema);
