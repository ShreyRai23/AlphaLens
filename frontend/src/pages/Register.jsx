import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { setAuth } from '../lib/auth.js';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await api.register(form.email, form.password);
      setAuth(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-bg dot-pattern" />
        <div className="auth-left-content">
          <div className="auth-brand">
            <div className="logo-icon" style={{width:52,height:52,fontSize:28}}>α</div>
            <h2 className="auth-brand-name">AlphaLens</h2>
          </div>
          <h3 className="auth-left-title">Institutional-grade<br/>investment research,<br/>powered by AI.</h3>
          <div className="auth-left-cards">
            {[
              { label: 'Apple Inc.', verdict: 'PASS', score: 68, bg: 'var(--coral-soft)', border: 'var(--coral)' },
              { label: 'Tesla', verdict: 'INVEST', score: 77, bg: 'var(--invest-soft)', border: 'var(--invest-border)' },
              { label: 'Zomato', verdict: 'INVEST', score: 71, bg: 'var(--blue-soft)', border: 'var(--blue)' },
            ].map((c, i) => (
              <div key={c.label} className="auth-mini-card" style={{ background: c.bg, border: `1px solid ${c.border}`, animationDelay: `${i * 1.5}s` }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:14, fontWeight:800, color:'var(--text-primary)'}}>{c.label}</span>
                  <span className={`pill ${c.verdict === 'INVEST' ? 'pill-invest' : 'pill-pass'}`} style={{fontSize:10, padding:'2px 8px'}}>{c.verdict}</span>
                </div>
                <div style={{fontSize:24,fontWeight:900,color:'var(--text-primary)',lineHeight:1}}>{c.score}<small style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)'}}>/100</small></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-form-card card page-enter">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Start analyzing companies in seconds.</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="input-field" type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input-field" type="password" placeholder="Min. 6 characters" required
                value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className="input-field" type="password" placeholder="Repeat password" required
                value={form.confirm} onChange={e => setForm(p=>({...p,confirm:e.target.value}))} />
            </div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
