import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Navbar from '../components/Navbar.jsx';
import { api } from '../lib/api.js';
import './DashboardOverview.css';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyReports()
      .then(res => setReports(res.reports || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute stats
  const totalReports = reports.length;
  const investCount = reports.filter(r => r.verdict === 'INVEST').length;
  const passCount = reports.filter(r => r.verdict === 'PASS').length;
  
  const avgScore = totalReports > 0 
    ? Math.round(reports.reduce((acc, r) => acc + (r.confidenceScore || 0), 0) / totalReports)
    : 0;

  // Chart data (latest 6 reports)
  const chartData = [...reports]
    .slice(0, 6)
    .reverse()
    .map(r => ({
      name: r.companyName.substring(0, 8) + (r.companyName.length > 8 ? '...' : ''),
      score: r.confidenceScore || 0,
      verdict: r.verdict
    }));

  return (
    <div className="overview-page">
      <Navbar />

      <main className="overview-main container page-enter">
        <div className="overview-header">
          <div>
            <h1 className="overview-title">Dashboard Overview</h1>
            <p className="overview-sub">Your AI investment research portfolio at a glance.</p>
          </div>
          <Link to="/search" className="btn btn-primary">
            + New Research
          </Link>
        </div>

        {loading ? (
          <div className="overview-loading">Loading dashboard...</div>
        ) : totalReports === 0 ? (
          <div className="overview-empty card">
            <div className="empty-icon">🔭</div>
            <h3>No research yet</h3>
            <p>Start your first AI investment analysis.</p>
            <Link to="/search" className="btn btn-primary" style={{marginTop: 16}}>Analyze a Company</Link>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="stats-grid">
              <div className="stat-card card card-lift" style={{background: 'var(--blue-soft)', borderColor: 'var(--blue)'}}>
                <div className="stat-title" style={{color: 'var(--blue)'}}>Total Analyses</div>
                <div className="stat-value">{totalReports}</div>
              </div>
              <div className="stat-card card card-lift" style={{background: 'var(--invest-soft)', borderColor: 'var(--invest)'}}>
                <div className="stat-title" style={{color: 'var(--invest)'}}>Invest Verdicts</div>
                <div className="stat-value">{investCount}</div>
              </div>
              <div className="stat-card card card-lift" style={{background: 'var(--coral-soft)', borderColor: 'var(--coral)'}}>
                <div className="stat-title" style={{color: 'var(--coral)'}}>Pass Verdicts</div>
                <div className="stat-value">{passCount}</div>
              </div>
              <div className="stat-card card card-lift" style={{background: 'var(--purple-soft)', borderColor: 'var(--purple)'}}>
                <div className="stat-title" style={{color: 'var(--purple)'}}>Avg Score</div>
                <div className="stat-value">{avgScore}<small>/100</small></div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
              <div className="chart-card card">
                <h3 className="chart-title">Recent Scores</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{top: 20, right: 0, left: -20, bottom: 0}}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                      <Tooltip 
                        cursor={{fill: 'rgba(0,0,0,0.04)'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.verdict === 'INVEST' ? '#00b884' : '#ff4d4d'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="chart-card card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                  <h3 className="chart-title" style={{margin:0}}>Recent Activity</h3>
                  <Link to="/history" className="btn btn-ghost btn-sm" style={{fontSize:13}}>View All →</Link>
                </div>
                <div className="recent-list">
                  {reports.slice(0, 4).map(r => (
                    <Link to={`/report/${r.jobId}`} key={r.jobId} className="recent-item" style={{background: r.verdict === 'INVEST' ? 'var(--invest-soft)' : 'var(--coral-soft)', borderColor: r.verdict === 'INVEST' ? 'var(--invest)' : 'var(--coral)'}}>
                      <div>
                        <div className="recent-company">{r.companyName}</div>
                        <div className="recent-date">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="recent-score-block">
                        <span className={`pill ${r.verdict === 'INVEST' ? 'pill-invest' : 'pill-pass'}`} style={{padding:'2px 8px', fontSize:10}}>
                          {r.verdict}
                        </span>
                        <div className="recent-score">{r.score}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
