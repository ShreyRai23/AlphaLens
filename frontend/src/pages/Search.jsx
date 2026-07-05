import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api } from '../lib/api.js';
import './Search.css';

const TRENDING = [
  { name: 'Nvidia',    emoji: '🟢' },
  { name: 'Tesla',     emoji: '⚡' },
  { name: 'Apple',     emoji: '🍎' },
  { name: 'Reliance',  emoji: '🇮🇳' },
  { name: 'Zomato',    emoji: '🍱' },
  { name: 'Microsoft', emoji: '💻' },
  { name: 'Infosys',   emoji: '💡' },
  { name: 'TCS',       emoji: '🏢' },
  { name: 'Samsung',   emoji: '📱' },
  { name: 'Tata Motors', emoji: '🚗' },
];

export default function Search() {
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!company.trim()) return;
    setSearching(true); setSearchErr('');
    try {
      const res = await api.startResearch(company.trim());
      if (res.cached) {
        navigate(`/report/${res.jobId}`);
      } else {
        navigate(`/research?jobId=${res.jobId}&company=${encodeURIComponent(company.trim())}`);
      }
    } catch (err) {
      setSearchErr(err.message);
    } finally { setSearching(false); }
  };

  return (
    <div className="search-page">
      <Navbar />

      <main className="search-main container page-enter">
        <div className="search-container card">
          <div className="search-icon-wrapper">
            <span className="search-icon">🔍</span>
          </div>
          <h1 className="search-heading">Start New Research</h1>
          <p className="search-sub">Get an AI-powered INVEST or PASS verdict in under 60 seconds.</p>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              className="input-field search-input"
              placeholder='Type a company name - "Reliance", "Microsoft", "Swiggy"...'
              value={company}
              onChange={e => setCompany(e.target.value)}
              disabled={searching}
            />
            <button className="btn btn-primary search-btn" type="submit" disabled={searching}>
              {searching ? 'Starting…' : 'Analyze →'}
            </button>
          </form>
          {searchErr && <p className="search-error">{searchErr}</p>}

          {/* ── Trending Companies ── */}
          <div className="trending-section">
            <p className="trending-label">🔥 Trending Companies</p>
            <div className="trending-chips">
              {TRENDING.map(t => (
                <button
                  key={t.name}
                  className="trending-chip"
                  onClick={() => setCompany(t.name)}
                  disabled={searching}
                  type="button"
                >
                  <span>{t.emoji}</span> {t.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* New Colorful Info Cards */}
          <div className="search-features-grid">
            <div className="search-feature-card" style={{background: 'var(--blue-soft)', borderColor: 'rgba(59, 130, 246, 0.2)'}}>
              <div className="feature-icon" style={{background: 'var(--blue)', color: '#fff'}}>📊</div>
              <h3 className="feature-title" style={{color: 'var(--blue)'}}>Comprehensive Data</h3>
              <p className="feature-desc">Harvests millions of data points including live financials, SEC filings, and market context.</p>
            </div>
            <div className="search-feature-card" style={{background: 'var(--purple-soft)', borderColor: 'rgba(139, 92, 246, 0.2)'}}>
              <div className="feature-icon" style={{background: 'var(--purple)', color: '#fff'}}>🧠</div>
              <h3 className="feature-title" style={{color: 'var(--purple)'}}>Sentiment Mapping</h3>
              <p className="feature-desc">Evaluates brand strength, macro dynamics, and regulatory risks in real-time.</p>
            </div>
            <div className="search-feature-card" style={{background: 'var(--mint-soft)', borderColor: 'rgba(16, 185, 129, 0.2)'}}>
              <div className="feature-icon" style={{background: 'var(--mint)', color: '#fff'}}>⚖️</div>
              <h3 className="feature-title" style={{color: 'var(--mint)'}}>CIO Synthesis</h3>
              <p className="feature-desc">Synthesizes all findings into a final, institutional-grade INVEST or PASS verdict.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
