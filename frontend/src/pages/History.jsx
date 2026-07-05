import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { api } from '../lib/api.js';
import './History.css';

export default function History() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyReports()
      .then(res => setReports(res.reports || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="history-page">
      <Navbar />

      <main className="history-main container page-enter">
        <div className="history-header">
          <h1 className="history-title">Research History</h1>
          <p className="history-sub">Browse your previous investment analyses.</p>
        </div>

        {loading ? (
          <div className="history-grid">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="card skeleton-card">
                <div className="skeleton" style={{height:16,width:'60%',marginBottom:12}} />
                <div className="skeleton" style={{height:28,width:'80%',marginBottom:8}} />
                <div className="skeleton" style={{height:14,marginBottom:6}} />
                <div className="skeleton" style={{height:14,width:'70%'}} />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="history-empty card">
            <div className="empty-icon">🔭</div>
            <h3>No research yet</h3>
            <p>Go to New Research to analyze your first company.</p>
          </div>
        ) : (
          <div className="history-grid">
            {reports.map((r, i) => (
              <ReportCard
                key={r.jobId}
                report={r}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
