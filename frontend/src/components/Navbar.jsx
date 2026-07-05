import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearAuth, getUser } from '../lib/auth.js';
import './Navbar.css';

export default function Navbar({ showSearch = false, onSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo">
          <div className="logo-icon">α</div>
          <span className="logo-text">AlphaLens</span>
        </Link>

        {/* Nav links */}
        <div className="navbar-links">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link to="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`}>
            New Research
          </Link>
          <Link to="/compare" className={`nav-link ${isActive('/compare') ? 'active' : ''}`}>
            Compare
          </Link>
          <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
            History
          </Link>
        </div>

        {/* Right: user pill */}
        <div className="navbar-right">
          <div className="user-pill">
            <div className="user-avatar">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="user-email">{user?.email?.split('@')[0] || 'User'}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{color: 'var(--coral)'}}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
