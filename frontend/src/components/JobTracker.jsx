import { useEffect, useRef } from 'react';
import './JobTracker.css';

const STEPS = [
  { key: 'Data Harvesting',        label: 'Data Harvesting',        desc: 'Pulling live news, financials & market context', theme: 'blue' },
  { key: 'Financial Underwriting', label: 'Financial Underwriting', desc: 'Evaluating revenue, margins, debt & cash flow', theme: 'mint' },
  { key: 'Sentiment Mapping',      label: 'Sentiment Mapping',      desc: 'Mapping regulatory risk, brand & macro dynamics', theme: 'purple' },
  { key: 'CIO Synthesis',          label: 'CIO Synthesis',          desc: 'Synthesising findings into a final verdict', theme: 'invest' },
];

const getStepStatus = (stepKey, currentNode, status) => {
  const currentIdx = STEPS.findIndex(s => s.key === currentNode);
  const stepIdx    = STEPS.findIndex(s => s.key === stepKey);

  if (status === 'completed') return 'done';
  if (stepIdx < currentIdx)   return 'done';
  if (stepIdx === currentIdx)  return 'active';
  return 'pending';
};

export default function JobTracker({ currentNode, status }) {
  return (
    <div className="job-tracker">
      {STEPS.map((step, i) => {
        const stepStatus = getStepStatus(step.key, currentNode, status);
        return (
          <div key={step.key} className="tracker-step-wrapper">
            <div className={`tracker-step ${stepStatus}`}>
              {/* Step icon */}
              <div className="step-icon-col">
                <div className="step-icon" style={
                  stepStatus === 'done'
                    ? { background: `var(--${step.theme}-soft)`, color: `var(--${step.theme})` }
                    : stepStatus === 'active'
                    ? { background: `var(--${step.theme})`, color: '#fff', boxShadow: `0 0 0 6px var(--${step.theme}-soft)` }
                    : {}
                }>
                  {stepStatus === 'done'
                    ? <span className="step-check">✓</span>
                    : stepStatus === 'active'
                    ? <span className="step-pulse-dot" />
                    : <span className="step-num">{i + 1}</span>
                  }
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`step-connector ${stepStatus === 'done' ? 'filled' : ''}`}>
                    <div className="connector-fill" />
                  </div>
                )}
              </div>
              {/* Step content */}
              <div className="step-content">
                <span className="step-label" style={stepStatus !== 'pending' ? {color: `var(--${step.theme})`} : {}}>{step.label}</span>
                <span className="step-desc">{step.desc}</span>
              </div>
              {/* Status pill */}
              <div className="step-status-pill">
                {stepStatus === 'done'   && <span className="pill" style={{background: `var(--${step.theme}-soft)`, color: `var(--${step.theme})`, borderColor: 'transparent'}}>Done</span>}
                {stepStatus === 'active' && <span className="pill pill-primary pulse-pill">Running…</span>}
                {stepStatus === 'pending'&& <span className="pill" style={{background:'var(--border)',color:'var(--text-tertiary)'}}>Pending</span>}
              </div>
            </div>
          </div>
        );
      })}

      {status === 'completed' && (
        <div className="tracker-complete">
          <span className="complete-icon">🎯</span>
          <span>Analysis complete! Redirecting to report…</span>
        </div>
      )}
      {status === 'failed' && (
        <div className="tracker-failed">
          Analysis failed. Please try again.
        </div>
      )}
    </div>
  );
}
