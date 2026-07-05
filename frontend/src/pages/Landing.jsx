import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { setAuth, isAuthenticated } from '../lib/auth.js';
import './Landing.css';

const FEATURES = [
  { icon: '🔍', title: 'Data Harvesting',     desc: 'Live web search across news, financials & macro trends', color: 'var(--blue-soft)',   accent: 'var(--blue)'   },
  { icon: '📊', title: 'Financial Analysis',  desc: 'Revenue, margins, debt, FCF & capital efficiency scored', color: 'var(--purple-soft)', accent: 'var(--purple)' },
  { icon: '🧭', title: 'Sentiment Mapping',   desc: 'Regulatory, ESG, leadership & competitive dynamics mapped', color: 'var(--mint-soft)',   accent: 'var(--mint)'   },
  { icon: '🏛️', title: 'CIO Synthesis',       desc: 'Final INVEST/PASS verdict with full structured reasoning', color: 'var(--coral-soft)',  accent: 'var(--coral)'  },
];

const SAMPLE_BULLS = ['Accelerating Services revenue growth at 23% YoY', 'Exceptional brand moat with >90% customer retention', 'Strong FCF generation: $110B annually'];
const SAMPLE_BEARS = ['Premium valuation at 40x P/E leaves little margin of safety', 'Regulatory antitrust scrutiny threatens App Store model', 'iPhone unit growth decelerating in key emerging markets'];
const SAMPLE_2_BULLS = ['Unprecedented AI accelerator demand driving +200% YoY data center revenue', 'CUDA software moat locks developers into ecosystem', 'Next-gen Blackwell architecture extends performance lead'];
const SAMPLE_2_BEARS = ['Priced for perfection at 75x forward P/E', 'Geopolitical risks surrounding TSMC reliance in Taiwan', 'Potential cyclicality in hyperscaler AI spending by 2026'];

export default function Landing() {
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const heroRef = useRef(null);
  const loggedIn = isAuthenticated();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!company.trim()) return;
    if (!loggedIn) { navigate('/register'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.startResearch(company.trim());
      navigate(`/research?jobId=${res.jobId}&company=${encodeURIComponent(company.trim())}&cached=${res.cached}`);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // Scroll-reveal for sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="hero" ref={heroRef}>
        {/* Background video */}
        <video className="hero-video" autoPlay muted loop playsInline>
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="hero-dot-pattern" />

        {/* Navbar overlay */}
        <nav className="landing-nav">
          <div className="landing-nav-inner">
            <div className="navbar-logo" style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="logo-icon">α</div>
              <span style={{fontWeight:800,fontSize:18,color:'#fff'}}>AlphaLens</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              {loggedIn
                ? <button className="btn btn-primary btn-sm" style={{background:'#fff',color:'var(--primary)'}} onClick={() => navigate('/dashboard')}>Dashboard →</button>
                : <>
                    <Link to="/login"    className="btn btn-sm" style={{color:'rgba(255,255,255,0.85)',fontWeight:600}}>Sign in</Link>
                    <Link to="/register" className="btn btn-sm get-started-btn" style={{background:'#fff',color:'var(--primary)',borderRadius:'999px',padding:'8px 20px',fontWeight:700}}>Get started</Link>
                  </>
              }
            </div>
          </div>
        </nav>

        {/* Hero content — split: left text | right cards */}
        <div className="hero-content">

          {/* ── LEFT: text + search ── */}
          <div className="hero-left">
            <div className="hero-badge pill reveal">
              <span>✦</span> AI-Powered Investment Research
            </div>

            <h1 className="hero-title reveal">
              Your AI Investment<br />
              <span className="hero-accent">Committee,</span><br />
              On Demand.
            </h1>

            <p className="hero-sub reveal">
              One name. Four AI specialists. One decisive verdict.<br />
              Research that took days — delivered in <strong>60 seconds.</strong>
            </p>

            {/* Search form */}
            <form className="hero-search reveal" onSubmit={handleSearch}>
              <input
                className="hero-input"
                placeholder="Try Apple, Tesla, Zomato..."
                value={company}
                onChange={e => setCompany(e.target.value)}
                disabled={loading}
              />
              <button className="btn btn-primary btn-lg hero-cta" type="submit" disabled={loading} style={{borderRadius: '999px'}}>
                {loading ? 'Starting…' : 'Analyze Now →'}
              </button>
            </form>
            {error && <p className="hero-error">{error}</p>}

            <p className="hero-hint reveal">
              {loggedIn ? "You are signed in. Research a company above." : 'Free to try · No credit card required'}
            </p>
          </div>

          {/* ── RIGHT: 2×2 overlapping company cards ── */}
          <div className="hero-right">
            <div className="hero-cards-grid">
              {[
                { label: 'Apple Inc.', verdict: 'INVEST', score: 82, bg: 'var(--invest-soft)',  border: 'var(--invest-border)', rot: '-4deg',  tx: '0px',   ty: '0px'   },
                { label: 'Meta',       verdict: 'INVEST', score: 74, bg: 'var(--blue-soft)',    border: 'var(--blue)',         rot: '3deg',   tx: '8px',  ty: '-8px'  },
                { label: "Byju's",     verdict: 'PASS',   score: 31, bg: 'var(--coral-soft)',   border: 'var(--pass-border)', rot: '2deg',   tx: '-6px', ty: '6px'   },
                { label: 'NVIDIA',     verdict: 'INVEST', score: 88, bg: 'var(--amber-soft)',   border: 'var(--amber)',        rot: '-2deg',  tx: '4px',  ty: '4px'   },
              ].map((c, i) => (
                <div
                  key={c.label}
                  className="hero-card"
                  style={{
                    background: c.bg,
                    border: `1.5px solid ${c.border}`,
                    '--rot': c.rot,
                    '--tx': c.tx,
                    '--ty': c.ty,
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  <div className="float-card-top">
                    <span className="float-company">{c.label}</span>
                    <span className={`pill ${c.verdict === 'INVEST' ? 'pill-invest' : 'pill-pass'}`} style={{fontSize:10}}>
                      {c.verdict}
                    </span>
                  </div>
                  <div className="float-score">{c.score}<small>/100</small></div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header reveal">
            <span className="pill pill-primary">How it works</span>
            <h2 className="section-title">Four specialized AI agents,<br/>one unified verdict</h2>
            <p className="section-sub">Our LangGraph pipeline coordinates four expert AI modes — each a specialist, together an investment committee.</p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feature-card reveal" style={{ animationDelay: `${i*80}ms`, background: f.color }}>
                <div className="feature-icon" style={{ background: f.accent }}>{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAMPLE REPORT ─────────────────────────────────── */}
      <section className="section sample-section">
        <div className="container">
          <div className="section-header reveal">
            <span className="pill pill-invest">Sample Output</span>
            <h2 className="section-title">Institutional-grade output,<br/>in under a minute</h2>
          </div>

          <div className="sample-cards-container">
            {/* Card 1: Apple (PASS) */}
            <div className="sample-card card reveal">
              <div className="sample-header">
                <div>
                  <div className="sample-company">Apple Inc.</div>
                  <div className="sample-date text-muted text-sm">Analysis · July 2025</div>
                </div>
                <div className="sample-verdict-block">
                  <div className="sample-verdict-pill pill pill-pass">↓ PASS</div>
                  <div className="sample-score">68<small>/100</small></div>
                </div>
              </div>
              <p className="sample-summary">
                Apple exhibits robust financial health with accelerating Services revenue, but trades at a premium 40x P/E with material unquantified regulatory antitrust risk to its App Store business model — presenting an unfavorable risk-reward profile at current levels.
              </p>
              <div className="sample-args">
                <div className="sample-col" style={{background:'var(--invest-soft)'}}>
                  <div className="sample-col-title" style={{color:'var(--invest)'}}>Bull Case</div>
                  {SAMPLE_BULLS.map(b => <div key={b} className="sample-arg">+ {b}</div>)}
                </div>
                <div className="sample-col" style={{background:'var(--coral-soft)'}}>
                  <div className="sample-col-title" style={{color:'var(--coral)'}}>Bear Case</div>
                  {SAMPLE_BEARS.map(b => <div key={b} className="sample-arg">− {b}</div>)}
                </div>
              </div>
            </div>

            {/* Card 2: NVIDIA (INVEST) */}
            <div className="sample-card card reveal" style={{ animationDelay: '0.2s' }}>
              <div className="sample-header">
                <div>
                  <div className="sample-company">NVIDIA</div>
                  <div className="sample-date text-muted text-sm">Analysis · July 2025</div>
                </div>
                <div className="sample-verdict-block">
                  <div className="sample-verdict-pill pill pill-invest">↑ INVEST</div>
                  <div className="sample-score">88<small>/100</small></div>
                </div>
              </div>
              <p className="sample-summary">
                NVIDIA maintains a near-monopoly in the AI accelerator market, backed by an impenetrable CUDA software moat. Despite a premium valuation, unprecedented data center demand and the upcoming Blackwell cycle provide exceptional risk-adjusted upside.
              </p>
              <div className="sample-args">
                <div className="sample-col" style={{background:'var(--invest-soft)'}}>
                  <div className="sample-col-title" style={{color:'var(--invest)'}}>Bull Case</div>
                  {SAMPLE_2_BULLS.map(b => <div key={b} className="sample-arg">+ {b}</div>)}
                </div>
                <div className="sample-col" style={{background:'var(--coral-soft)'}}>
                  <div className="sample-col-title" style={{color:'var(--coral)'}}>Bear Case</div>
                  {SAMPLE_2_BEARS.map(b => <div key={b} className="sample-arg">− {b}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="cta-section reveal">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">Start your first research free.</h2>
            <p className="cta-sub">No setup. No API keys. Just a company name.</p>
            <Link to="/register" className="btn btn-primary btn-lg">Create free account →</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-grid">
            {/* Brand col */}
            <div className="footer-brand-col">
              <div className="footer-logo">
                <div className="logo-icon" style={{width:36,height:36,fontSize:18}}>&#945;</div>
                <span className="footer-brand-name">AlphaLens</span>
              </div>
              <p className="footer-tagline">Institutional-grade AI investment research for everyone. Get INVEST or PASS verdicts in under 60 seconds.</p>
              <div className="footer-badges">
                <span className="pill pill-primary" style={{fontSize:11}}>Powered by Gemini 2.5</span>
                <span className="pill pill-blue" style={{fontSize:11}}>LangGraph Agents</span>
              </div>
            </div>

            {/* Product col */}
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <Link to="/register" className="footer-link">Get started free</Link>
              <Link to="/login"    className="footer-link">Sign in</Link>
              <Link to="/dashboard" className="footer-link">Dashboard</Link>
            </div>

            {/* How it works col */}
            <div className="footer-col">
              <div className="footer-col-title">Research Flow</div>
              <span className="footer-link-plain">01 · Data Harvesting</span>
              <span className="footer-link-plain">02 · Financial Analysis</span>
              <span className="footer-link-plain">03 · Sentiment Mapping</span>
              <span className="footer-link-plain">04 · CIO Synthesis</span>
            </div>

            {/* Legal col */}
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <span className="footer-link-plain">Altuni AI Labs</span>
              <span className="footer-link-plain">AI Research Tool</span>
              <span className="footer-link-plain">Not financial advice</span>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="text-muted text-xs">&copy; 2025 AlphaLens by Altuni AI Labs. All research is AI-generated and for informational purposes only. Not financial advice.</span>
            <div className="footer-bottom-pills">
              <span className="pill" style={{background:'var(--border)',color:'var(--text-secondary)',fontSize:11}}>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
