import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './lib/auth.js';
import Landing   from './pages/Landing.jsx';
import Login     from './pages/Login.jsx';
import Register  from './pages/Register.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';
import Search    from './pages/Search.jsx';
import History   from './pages/History.jsx';
import Research  from './pages/Research.jsx';
import Report    from './pages/Report.jsx';
import Compare   from './pages/Compare.jsx';

// Protected route wrapper
const PrivateRoute = ({ children }) =>
  isAuthenticated() ? children : <Navigate to="/login" replace />;

// Public route — redirect to dashboard if already logged in
const PublicRoute = ({ children }) =>
  isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/login"     element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"  element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardOverview /></PrivateRoute>} />
        <Route path="/search"    element={<PrivateRoute><Search /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/research"  element={<PrivateRoute><Research /></PrivateRoute>} />
        <Route path="/compare"   element={<PrivateRoute><Compare /></PrivateRoute>} />
        <Route path="/report/:jobId" element={<PrivateRoute><Report /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
