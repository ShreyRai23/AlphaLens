import { useNavigate } from 'react-router-dom';
import DonutRing from './DonutRing.jsx';
import './ReportCard.css';

const CARD_COLORS = {
  INVEST: { bg: 'var(--invest-soft)', accent: 'var(--invest)', ring: '#16A34A' },
  PASS:   { bg: 'var(--coral-soft)', accent: 'var(--coral)', ring: '#FF7B69' },
};
const RISK_CLASS = { LOW: 'pill-low', MEDIUM: 'pill-medium', HIGH: 'pill-high' };

export default function ReportCard({ report, style }) {
  const navigate = useNavigate();
  const colors = CARD_COLORS[report.verdict] || CARD_COLORS.PASS;

  return (
    <div
      className="report-card card card-lift"
      style={{ '--card-bg': colors.bg, '--card-accent': colors.accent, animationDelay: style?.animationDelay || '0ms' }}
      onClick={() => navigate(`/report/${report.jobId}`)}
    >
      <div className="rc-header">
        <span className={`pill ${report.verdict === 'INVEST' ? 'pill-invest' : 'pill-pass'} rc-verdict`}>
          {report.verdict === 'INVEST' ? '↑ INVEST' : '↓ PASS'}
        </span>
        <span className={`pill ${RISK_CLASS[report.riskLevel] || 'pill-medium'} rc-risk`}>
          {report.riskLevel} Risk
        </span>
      </div>

      <h3 className="rc-company">{report.companyName}</h3>

      <p className="rc-summary">{report.executiveSummary?.slice(0, 100)}…</p>

      <div className="rc-footer">
        <DonutRing value={report.confidenceScore} size={64} stroke={7} color={colors.ring} />
        <div className="rc-meta">
          <span className="rc-score">{Math.round(report.confidenceScore)}<small>/100</small></span>
          <span className="rc-date text-muted text-xs">
            {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="rc-cta">View Report →</span>
        </div>
      </div>
    </div>
  );
}
