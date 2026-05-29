import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Mail,
  MapPin,
  Send,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import './Footer.css';

export default function Footer() {
  const { isAuthenticated, user } = useAuth();
  const [newsletterStatus, setNewsletterStatus] = useState('');

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

  const primaryActionLink = isAuthenticated ? dashboardLink : '/register';

  const platformLinks = [
    { label: 'Accueil', to: '/' },
    { label: 'Services', to: '/services' },
    { label: 'Freelances', to: '/services' },
    { label: 'Demandes', to: '/requests' },
    { label: 'A propos', to: '/#comment-ca-marche' },
  ];

  const supportLinks = [
    { label: 'Centre d aide', to: '/#comment-ca-marche' },
    { label: 'FAQ', to: '/#comment-ca-marche' },
    { label: 'Contact', href: 'mailto:support@proxiskills.local' },
    { label: 'Signaler un probleme', href: 'mailto:support@proxiskills.local?subject=Signalement%20ProxiSkills' },
  ];

  const legalLinks = [
    { label: 'Confidentialite', to: '/#confidentialite' },
    { label: 'Conditions', to: '/#conditions' },
    { label: 'Cookies', to: '/#cookies' },
  ];

  const socialLinks = [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/proxiskills', icon: 'linkedin' },
    { label: 'Instagram', href: 'https://www.instagram.com/proxiskills', icon: 'instagram' },
    { label: 'Facebook', href: 'https://www.facebook.com/proxiskills', icon: 'facebook' },
    { label: 'GitHub', href: 'https://github.com/proxiskills', icon: 'github' },
  ];

  const stats = [
    { value: '+120', label: 'freelances' },
    { value: '+300', label: 'missions' },
    { value: '12', label: 'villes couvertes' },
  ];

  const renderFooterLink = (item, className = 'footer-link') => {
    if (item.href) {
      return (
        <a className={className} href={item.href}>
          {item.label}
        </a>
      );
    }

    return (
      <Link className={className} to={item.to}>
        {item.label}
      </Link>
    );
  };

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    setNewsletterStatus('Inscription prise en compte.');
    event.currentTarget.reset();
  };

  const renderSocialIcon = (icon) => {
    switch (icon) {
      case 'linkedin':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6.94 8.86H3.26V21h3.68V8.86ZM5.1 3a2.14 2.14 0 1 0 0 4.28 2.14 2.14 0 0 0 0-4.28Zm16.02 11.2c0-3.26-1.74-5.36-4.56-5.36-1.86 0-3.02 1.02-3.5 1.92h-.05v-1.9H9.49V21h3.67v-6.02c0-1.6.3-3.14 2.28-3.14 1.94 0 1.97 1.82 1.97 3.24V21h3.68l.03-6.8Z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="18" height="18" rx="5" fill="none" />
            <circle cx="12" cy="12" r="4" fill="none" />
            <circle cx="17.4" cy="6.6" r="1.2" />
          </svg>
        );
      case 'facebook':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M14 8.25h2.2V5.1A10.48 10.48 0 0 0 13 4.82c-3.18 0-5.36 1.94-5.36 5.5v2.06H4v3.52h3.64V21h3.78v-5.1h3.04l.48-3.52h-3.52v-1.72c0-1.02.28-2.41 2.58-2.41Z" />
          </svg>
        );
      case 'github':
      default:
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2.4c-5.52 0-10 4.58-10 10.22 0 4.52 2.86 8.34 6.84 9.7.5.1.68-.22.68-.48v-1.7c-2.78.62-3.36-1.18-3.36-1.18-.46-1.2-1.12-1.52-1.12-1.52-.9-.64.08-.62.08-.62 1 .08 1.52 1.06 1.52 1.06.9 1.56 2.34 1.1 2.9.84.1-.66.36-1.1.64-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.4-2.04 1.04-2.76-.1-.26-.46-1.3.1-2.7 0 0 .84-.28 2.76 1.04A9.22 9.22 0 0 1 12 7.54c.86 0 1.7.12 2.5.34 1.92-1.32 2.76-1.04 2.76-1.04.56 1.4.2 2.44.1 2.7.64.72 1.04 1.64 1.04 2.76 0 3.94-2.34 4.8-4.58 5.06.36.32.68.94.68 1.9v2.8c0 .28.18.6.68.5A10.12 10.12 0 0 0 22 12.62C22 6.98 17.52 2.4 12 2.4Z" />
          </svg>
        );
    }
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-shell">
          <div className="footer-main">
            <section className="footer-brand-panel" aria-label="ProxiSkills">
              <Link className="footer-brand" to="/">
                <span className="footer-brand-mark">
                  <Briefcase size={20} />
                </span>
                <span>
                  Proxi<span>Skills</span>
                </span>
              </Link>

              <p className="footer-tagline">Marketplace hyper-locale de services freelance.</p>
              <p className="footer-trust">
                <MapPin size={16} />
                Trouver le bon freelance proche de vous.
              </p>

              <div className="footer-stats" aria-label="Statistiques ProxiSkills">
                {stats.map((stat) => (
                  <div className="footer-stat" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <nav className="footer-nav" aria-label="Navigation du footer">
              <div className="footer-column">
                <h2>Plateforme</h2>
                <div className="footer-link-list">
                  {platformLinks.map((item) => (
                    <div key={item.label}>{renderFooterLink(item)}</div>
                  ))}
                </div>
              </div>

              <div className="footer-column">
                <h2>Support</h2>
                <div className="footer-link-list">
                  {supportLinks.map((item) => (
                    <div key={item.label}>{renderFooterLink(item)}</div>
                  ))}
                </div>
              </div>

              <div className="footer-column">
                <h2>Legal</h2>
                <div className="footer-link-list">
                  {legalLinks.map((item) => (
                    <div key={item.label}>{renderFooterLink(item)}</div>
                  ))}
                </div>
              </div>
            </nav>

            <section className="footer-newsletter" aria-labelledby="footer-newsletter-title">
              <div className="footer-newsletter-heading">
                <span>
                  <Sparkles size={16} />
                </span>
                <h2 id="footer-newsletter-title">Opportunites locales</h2>
              </div>

              <p>Recevez les nouvelles missions et opportunites proches de vous.</p>

              <form className="footer-newsletter-form" onSubmit={handleNewsletterSubmit}>
                <label className="sr-only" htmlFor="footer-newsletter-email">
                  Adresse email
                </label>
                <div className="footer-newsletter-field">
                  <Mail size={16} />
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    name="email"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
                <button type="submit" aria-label="S inscrire a la newsletter ProxiSkills">
                  <Send size={16} />
                  <span>S'inscrire</span>
                </button>
              </form>
              {newsletterStatus && <p className="footer-form-status">{newsletterStatus}</p>}

              <div className="footer-socials" aria-label="Reseaux sociaux">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    title={social.label}
                  >
                    {renderSocialIcon(social.icon)}
                  </a>
                ))}
              </div>
            </section>
          </div>

          <div className="footer-bottom">
            <p className="footer-text">&copy; 2026 ProxiSkills - Tous droits reserves.</p>
            <div className="footer-bottom-links">
              {legalLinks.slice(0, 2).map((item) => (
                <span key={item.label}>{renderFooterLink(item, 'footer-bottom-link')}</span>
              ))}
              <Link className="footer-bottom-link footer-cta" to={primaryActionLink}>
                {isAuthenticated ? 'Ouvrir mon espace' : 'Rejoindre ProxiSkills'}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
