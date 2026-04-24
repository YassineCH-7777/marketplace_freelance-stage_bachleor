import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Footer.css';

export default function Footer() {
  const { isAuthenticated, user } = useAuth();

  const dashboardLink = (() => {
    switch (user?.role) {
      case 'ADMIN':
        return '/admin';
      case 'CLIENT':
        return '/client/dashboard';
      case 'FREELANCER':
        return '/freelancer/dashboard';
      default:
        return '/services';
    }
  })();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <Briefcase size={20} />
            <span>
              Freelance<span className="gradient-text">Hub</span>
            </span>
          </div>

          <div className="footer-links">
            <Link className="footer-link" to="/">
              Accueil
            </Link>
            <Link className="footer-link" to="/services">
              Services
            </Link>
            <Link className="footer-link" to={isAuthenticated ? dashboardLink : '/register'}>
              {isAuthenticated ? 'Dashboard' : 'Inscription'}
            </Link>
          </div>

          <p className="footer-text">© 2026 FreelanceHub. Marketplace freelance locale.</p>
        </div>
      </div>
    </footer>
  );
}
