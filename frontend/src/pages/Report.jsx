import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import DonutRing from '../components/DonutRing.jsx';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api.js';
import { exportReportPDF } from '../lib/pdfExport.js';
import './Report.css';

const RISK_MAP = {
  LOW:    { cls: 'pill-low',    label: '↓ LOW Risk'    },
  MEDIUM: { cls: 'pill-medium', label: '◈ MEDIUM Risk' },
  HIGH:   { cls: 'pill-high',   label: '↑ HIGH Risk'   },
};

const METRIC_COLORS = [
  { bg:'var(--blue-soft)',   accent:'var(--blue)'   },
  { bg:'var(--purple-soft)', accent:'var(--purple)' },
  { bg:'var(--mint-soft)',   accent:'var(--mint)'   },
  { bg:'var(--amber-soft)',  accent:'var(--amber)'  },
  { bg:'var(--pink-soft)',   accent:'var(--pink)'   },
  { bg:'var(--coral-soft)',  accent:'var(--coral)'  },
];

export default function Report() {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getJob(jobId);
        if (res.status !== 'completed' || !res.report) {
          if (res.status === 'failed')  { setError(res.error || 'Analysis failed.'); return; }
          if (res.status === 'pending' || res.status === 'running') {
            navigate(`/research?jobId=${jobId}&company=${res.jobId}`, { replace: true });
            return;
          }
          setError('Report not found.');
          return;
        }
        setData(res.report);
      } catch (err) {
        setError(err.message);
      } finally { setLoading(false); }
    };
    load();
  }, [jobId, navigate]);

  if (loading) return (
    <div className="report-page">
      <Navbar />
      <div className="report-loading container">
        <div className="loading-spinner" />
        <p>Loading report…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="report-page">
      <Navbar />
      <div className="report-error-page container">
        <div className="card" style={{padding:'var(--space-8)',textAlign:'center',maxWidth:480}}>
          <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
          <h2 style={{marginBottom:8}}>Something went wrong</h2>
          <p style={{color:'var(--text-secondary)',marginBottom:24}}>{error}</p>
          <Link to="/dashboard" className="btn btn-primary">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );

  const r = data;
  const isInvest = r.verdict === 'INVEST';
  const riskInfo = RISK_MAP[r.riskLevel] || RISK_MAP.MEDIUM;

  // Build key metrics from the report data
  const keyMetrics = [
    { label: 'Revenue Growth', value: r.keyMetrics?.revenueGrowth || r.revenueGrowth || '–' },
    { label: 'Profit Margin',  value: r.keyMetrics?.profitMargin  || r.profitMargin  || '–' },
    { label: 'Debt Level',     value: r.keyMetrics?.debtLevel     || r.debtLevel     || '–' },
    { label: 'Moat Strength',  value: r.keyMetrics?.moatStrength  || r.moatStrength  || '–' },
    { label: 'FCF Status',     value: r.keyMetrics?.fcfStatus     || r.fcfStatus     || '–' },
    { label: 'Market Position',value: r.keyMetrics?.marketPosition|| r.marketPosition|| '–' },
  ].filter(m => m.value !== '–').slice(0, 6);

  // Data for the new factor analysis chart
  const factorData = [
    { name: 'Financials', score: r.financialScore || 0, fill: 'var(--blue)' },
    { name: 'Sentiment', score: r.sentimentScore || 0, fill: 'var(--purple)' },
    { name: 'Risk Adj', score: r.riskLevel === 'LOW' ? 90 : r.riskLevel === 'MEDIUM' ? 60 : 30, fill: riskInfo.cls === 'pill-low' ? 'var(--mint)' : riskInfo.cls === 'pill-medium' ? 'var(--amber)' : 'var(--coral)' },
    { name: 'Confidence', score: r.confidenceScore || 0, fill: isInvest ? 'var(--invest)' : 'var(--coral)' }
  ];

  const handleExportPDF = async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      await exportReportPDF(reportRef.current, r?.companyName || r?.company || 'Report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="report-page">
      <Navbar />

      <main className="report-main container page-enter" ref={reportRef}>

        {/* ── HERO VERDICT BAND ────────────────────────────── */}
        <div className={`verdict-band card ${isInvest ? 'verdict-invest' : 'verdict-pass'}`}>
          <div className="verdict-left">
            <div className="verdict-company">{r.companyName || r.company || 'Company'}</div>
            <div className={`verdict-pill pill ${isInvest ? 'pill-invest' : 'pill-pass'}`}>
              {isInvest ? '↑ INVEST' : '↓ PASS'}
            </div>
            <span className={`pill ${riskInfo.cls}`}>{riskInfo.label}</span>
            <div className="verdict-horizon pill pill-primary">
              ⏱ {r.recommendedHorizon || '12–24 months'}
            </div>
          </div>
          <div className="verdict-right">
            <div className="verdict-score-label">Confidence Score</div>
            <DonutRing
              value={r.confidenceScore}
              size={140}
              stroke={12}
              color={isInvest ? 'var(--invest)' : 'var(--coral)'}
            />
          </div>
        </div>

        {/* ── SCORE CARDS ROW ──────────────────────────────── */}
        <div className="score-row">
          <div className="score-card card" style={{background:'var(--blue-soft)',border:'1.5px solid var(--blue-soft)'}}>
            <div className="score-card-label">Financial Score</div>
            <DonutRing value={r.financialScore} size={80} stroke={8} color="var(--blue)" />
            <div className="score-card-val">{r.financialScore}<small>/100</small></div>
          </div>
          <div className="score-card card" style={{background:'var(--purple-soft)',border:'1.5px solid var(--purple-soft)'}}>
            <div className="score-card-label">Sentiment Score</div>
            <DonutRing value={r.sentimentScore} size={80} stroke={8} color="var(--purple)" />
            <div className="score-card-val">{r.sentimentScore}<small>/100</small></div>
          </div>
          <div className="score-card card" style={{background: riskInfo.cls === 'pill-low' ? 'var(--mint-soft)' : riskInfo.cls === 'pill-medium' ? 'var(--amber-soft)' : 'var(--coral-soft)'}}>
            <div className="score-card-label">Risk Assessment</div>
            <div className="risk-icon">
              {r.riskLevel === 'LOW' ? '🛡️' : r.riskLevel === 'HIGH' ? '⚡' : '⚖️'}
            </div>
            <div className="score-card-val" style={{fontSize:20}}>{r.riskLevel}</div>
          </div>
        </div>

        {/* ── FACTOR ANALYSIS CHART ────────────────────────── */}
        <div className="factor-chart-section card" style={{marginBottom: 'var(--space-8)'}}>
          <div className="section-label" style={{marginBottom: 'var(--space-6)'}}>Factor Analysis Breakdown</div>
          <div style={{width: '100%', height: 240}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorData} margin={{top: 20, right: 0, left: 0, bottom: 0}}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 14, fontWeight: 700, fill: 'var(--text-secondary)'}} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-sm)'}} />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={80}>
                  {factorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── EXECUTIVE SUMMARY ────────────────────────────── */}
        <div className="exec-summary card">
          <div className="section-label">Executive Summary</div>
          <p className="exec-text">
            <strong style={{color: isInvest ? 'var(--invest)' : 'var(--coral)', display: 'block', marginBottom: '8px'}}>
              It is recommended to {isInvest ? 'INVEST in' : 'PASS on'} {r.companyName || r.company || 'this company'}, supported by an institutional confidence score of {Math.round(r.confidenceScore || 0)}/100. This represents a {r.riskLevel || 'MEDIUM'} risk profile over a {r.recommendedHorizon || '12–24 months'} investment horizon.
            </strong>
            {r.executiveSummary}
          </p>
        </div>

        {/* ── KEY METRICS ──────────────────────────────────── */}
        {keyMetrics.length > 0 && (
          <div className="metrics-section">
            <div className="section-label">Key Metrics</div>
            <div className="metrics-grid">
              {keyMetrics.map((m, i) => (
                <div key={m.label} className="metric-card card"
                  style={{ background: METRIC_COLORS[i % METRIC_COLORS.length].bg }}>
                  <div className="metric-icon" style={{ background: METRIC_COLORS[i % METRIC_COLORS.length].accent }}>
                    {['📈','💰','🏦','🏰','💵','🎯'][i % 6]}
                  </div>
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BULL / BEAR ───────────────────────────────────── */}
        <div className="bull-bear-row">
          <div className="arg-col card" style={{background:'var(--invest-soft)'}}>
            <div className="arg-col-header">
              <span className="arg-icon">↑</span>
              <span className="arg-title" style={{color:'var(--invest)'}}>Bull Case</span>
              <span className="pill pill-invest" style={{marginLeft:'auto',fontSize:11}}>
                {r.bullArguments?.length || 0} points
              </span>
            </div>
            <ul className="arg-list">
              {(r.bullArguments || []).map((a, i) => (
                <li key={i} className="arg-item arg-bull">{a}</li>
              ))}
            </ul>
          </div>

          <div className="arg-col card" style={{background:'var(--coral-soft)'}}>
            <div className="arg-col-header">
              <span className="arg-icon" style={{background:'var(--coral-soft)',color:'var(--coral)'}}>↓</span>
              <span className="arg-title" style={{color:'var(--coral)'}}>Bear Case</span>
              <span className="pill pill-pass" style={{marginLeft:'auto',fontSize:11}}>
                {r.bearArguments?.length || 0} risks
              </span>
            </div>
            <ul className="arg-list">
              {(r.bearArguments || []).map((a, i) => (
                <li key={i} className="arg-item arg-bear">{a}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── FULL RAW DATA (collapsible) ───────────────────── */}
        <details className="raw-data card">
          <summary className="raw-data-summary">View full analysis data (JSON)</summary>
          <pre className="raw-data-pre">{JSON.stringify(r, null, 2)}</pre>
        </details>

        {/* ── FOOTER ACTIONS ───────────────────────────────── */}
        <div className="report-actions">
          <Link to="/history" className="btn btn-outline">← Back to History</Link>
          <button
            className="btn export-pdf-btn"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? '⏳ Exporting…' : '📄 Export PDF'}
          </button>
          <Link to="/search"  className="btn btn-primary">New Research →</Link>
        </div>

      </main>
    </div>
  );
}
