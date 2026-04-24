import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Menu, X, LogOut, User, Bell, Briefcase, LayoutDashboard } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'ADMIN': return '/admin';
      case 'FREELANCER': return '/freelancer/dashboard';
      case 'CLIENT': return '/client/dashboard';
      default: return '/';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
          <Briefcase size={24} className="brand-icon" />
          <span className="brand-text">Freelance<span className="brand-highlight">Hub</span></span>
        </Link>

        <div className={`navbar-links ${mobileOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMobileOpen(false)}>Accueil</Link>
          <Link to="/services" className="nav-link" onClick={() => setMobileOpen(false)}>Services</Link>

          {isAuthenticated ? (
            <>
              <Link to={getDashboardLink()} className="nav-link" onClick={() => setMobileOpen(false)}>
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link to="/notifications" className="nav-link nav-icon-link" onClick={() => setMobileOpen(false)}>
                <Bell size={18} />
              </Link>
              <div className="nav-user-section">
                <div className="nav-user-badge">
                  <User size={14} />
                  <span>{user?.email?.split('@')[0]}</span>
                  <span className="nav-role-tag">{user?.role}</span>
                </div>
                <button className="btn btn-sm btn-secondary nav-logout-btn" onClick={handleLogout}>
                  <LogOut size={14} />
                  Déconnexion
                </button>
              </div>
            </>
          ) : (
            <div className="nav-auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm" onClick={() => setMobileOpen(false)}>Connexion</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMobileOpen(false)}>Inscription</Link>
            </div>
          )}
        </div>

        <button className="navbar-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
