import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import DonutRing from '../components/DonutRing.jsx';
import { api } from '../lib/api.js';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import './Compare.css';
import './Report.css';

const COMPANY_COLORS = ['var(--blue)', 'var(--purple)', 'var(--mint)'];
const COMPANY_SOFTS  = ['var(--blue-soft)', 'var(--purple-soft)', 'var(--mint-soft)'];

const RISK_PILL = {
  LOW:    { cls: 'pill-low',    label: '↓ LOW Risk'    },
  MEDIUM: { cls: 'pill-medium', label: '◈ MEDIUM Risk' },
  HIGH:   { cls: 'pill-high',   label: '↑ HIGH Risk'   },
};

export default function Compare() {
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [slots, setSlots] = useState([null, null]);  // jobId per slot
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [compareErr, setCompareErr] = useState('');

  useEffect(() => {
    api.getMyReports()
      .then(res => setMyReports(res.reports || []))
      .catch(console.error)
      .finally(() => setLoadingReports(false));
  }, []);

  const setSlot = (idx, jobId) => {
    const next = [...slots];
    next[idx] = jobId || null;
    setSlots(next);
    setResult(null);
    setCompareErr('');
  };

  const canCompare = slots.filter(Boolean).length >= 2;

  const handleCompare = async () => {
    if (!canCompare || comparing) return;
    setComparing(true);
    setCompareErr('');
    setResult(null);
    try {
      const res = await api.compare(slots.filter(Boolean));
      setResult(res);
    } catch (err) {
      setCompareErr(err.message);
    } finally {
      setComparing(false);
    }
  };

  // Build chart data from result
  const chartData = result
    ? [
        { name: 'Confidence',  ...Object.fromEntries(result.reports.map(r => [r.companyName, r.confidenceScore])) },
        { name: 'Financial',   ...Object.fromEntries(result.reports.map(r => [r.companyName, r.financialScore])) },
        { name: 'Sentiment',   ...Object.fromEntries(result.reports.map(r => [r.companyName, r.sentimentScore])) },
      ]
    : [];

  return (
    <div className="compare-page">
      <Navbar />

      <main className="compare-main container page-enter">
        {/* ── HEADER ── */}
        <div className="compare-header">
          <div>
            <h1 className="compare-title">⚖️ Compare Mode</h1>
            <p className="compare-sub">Select two of your analysed companies for a head-to-head AI verdict.</p>
          </div>
          <Link to="/search" className="btn btn-primary">+ New Research</Link>
        </div>

        {/* ── SELECTOR ── */}
        <div className="compare-selector card">
          <div className="selector-slots">
            {[0, 1].map(idx => (
              <div key={idx} className="selector-slot">
                <label className="slot-label">Company {idx + 1}</label>
                {loadingReports ? (
                  <div className="slot-loading">Loading your reports…</div>
                ) : myReports.length === 0 ? (
                  <div className="slot-empty">
                    <p>No analyses yet.</p>
                    <Link to="/search" className="btn btn-primary btn-sm">Analyse a Company</Link>
                  </div>
                ) : (
                  <select
                    className="slot-select input-field"
                    value={slots[idx] || ''}
                    onChange={e => setSlot(idx, e.target.value)}
                  >
                    <option value="">— Select a company —</option>
                    {myReports
                      .filter(r => !slots.includes(r.jobId) || slots[idx] === r.jobId)
                      .map(r => (
                        <option key={r.jobId} value={r.jobId}>
                          {r.companyName}  ({r.verdict})
                        </option>
                      ))
                    }
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="selector-actions">
            {compareErr && <p className="compare-error">{compareErr}</p>}
            <button
              className="btn btn-primary compare-btn"
              onClick={handleCompare}
              disabled={!canCompare || comparing}
            >
              {comparing ? '🔍 Comparing…' : '⚖️ Compare Now'}
            </button>
          </div>
        </div>

        {/* ── RESULT ── */}
        {result && (
          <>
            {/* Best Pick Banner */}
            <div className="best-pick-banner card">
              <div className="best-pick-icon">🏆</div>
              <div>
                <div className="best-pick-label">AI Best Pick</div>
                <p className="best-pick-text">{result.bestPickVerdict}</p>
              </div>
            </div>

            {/* Score Cards */}
            <div className="compare-cards-row">
              {result.reports.map((r, i) => {
                const isInvest = r.verdict === 'INVEST';
                const riskInfo = RISK_PILL[r.riskLevel] || RISK_PILL.MEDIUM;
                return (
                  <div
                    key={r.jobId}
                    className="compare-company-card card"
                    style={{ borderColor: COMPANY_COLORS[i], background: COMPANY_SOFTS[i] }}
                  >
                    <div className="cc-header">
                      <span className="cc-num" style={{ background: COMPANY_COLORS[i] }}>{i + 1}</span>
                      <h2 className="cc-name">{r.companyName}</h2>
                    </div>

                    <div className="cc-badges">
                      <span className={`pill ${isInvest ? 'pill-invest' : 'pill-pass'}`}>
                        {isInvest ? '↑ INVEST' : '↓ PASS'}
                      </span>
                      <span className={`pill ${riskInfo.cls}`}>{riskInfo.label}</span>
                      {r.recommendedHorizon && (
                        <span className="pill pill-primary">⏱ {r.recommendedHorizon}</span>
                      )}
                    </div>

                    <div className="cc-scores">
                      <div className="cc-score-item">
                        <DonutRing value={r.confidenceScore} size={72} stroke={7} color={COMPANY_COLORS[i]} />
                        <span className="cc-score-label">Confidence</span>
                      </div>
                      <div className="cc-score-item">
                        <DonutRing value={r.financialScore} size={72} stroke={7} color="var(--blue)" />
                        <span className="cc-score-label">Financial</span>
                      </div>
                      <div className="cc-score-item">
                        <DonutRing value={r.sentimentScore} size={72} stroke={7} color="var(--purple)" />
                        <span className="cc-score-label">Sentiment</span>
                      </div>
                    </div>

                    <p className="cc-summary">{r.executiveSummary?.slice(0, 180)}…</p>

                    <Link to={`/report/${r.jobId}`} className="btn btn-outline btn-sm cc-link">
                      Full Report →
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Grouped Bar Chart */}
            <div className="compare-chart card">
              <h3 className="compare-chart-title">Score Comparison</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 700, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  {result.reports.map((r, i) => (
                    <Bar key={r.companyName} dataKey={r.companyName} fill={COMPANY_COLORS[i]} radius={[6, 6, 0, 0]} maxBarSize={55} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bull vs Bear — matches Report page style */}
            <div className="compare-args-grid">
              {result.reports.map((r, i) => (
                <div key={r.jobId} className="compare-args-outer" style={{ borderTop: `4px solid ${COMPANY_COLORS[i]}` }}>
                  <h4 className="args-company" style={{ color: COMPANY_COLORS[i] }}>{r.companyName}</h4>
                  <div className="bull-bear-row">
                    {/* Bull */}
                    <div className="arg-col card" style={{ background: 'var(--invest-soft)' }}>
                      <div className="arg-col-header">
                        <span className="arg-icon">↑</span>
                        <span className="arg-title" style={{ color: 'var(--invest)' }}>Bull Case</span>
                        <span className="pill pill-invest" style={{ marginLeft: 'auto', fontSize: 11 }}>
                          {(r.bullArguments || []).length} points
                        </span>
                      </div>
                      <ul className="arg-list">
                        {(r.bullArguments || []).map((a, j) => (
                          <li key={j} className="arg-item arg-bull">{a}</li>
                        ))}
                      </ul>
                    </div>
                    {/* Bear */}
                    <div className="arg-col card" style={{ background: 'var(--coral-soft)' }}>
                      <div className="arg-col-header">
                        <span className="arg-icon" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>↓</span>
                        <span className="arg-title" style={{ color: 'var(--coral)' }}>Bear Case</span>
                        <span className="pill pill-pass" style={{ marginLeft: 'auto', fontSize: 11 }}>
                          {(r.bearArguments || []).length} points
                        </span>
                      </div>
                      <ul className="arg-list">
                        {(r.bearArguments || []).map((a, j) => (
                          <li key={j} className="arg-item arg-bear">{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
