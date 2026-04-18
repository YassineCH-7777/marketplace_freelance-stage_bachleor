import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Briefcase, Users, ShieldCheck, Star, MapPin, Zap, Sparkles } from 'lucide-react';
import { getActiveServices } from '../api/serviceApi';
import './Home.css';

export default function Home() {
  const [services, setServices] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    getActiveServices()
      .then((res) => setServices(res.data.slice(0, 6)))
      .catch(() => setServices([]));
  }, []);

  const stats = [
    { icon: <Users size={24} />, value: '500+', label: 'Freelances actifs' },
    { icon: <Briefcase size={24} />, value: '1200+', label: 'Missions réalisées' },
    { icon: <Star size={24} />, value: '4.8', label: 'Note moyenne' },
    { icon: <ShieldCheck size={24} />, value: '100%', label: 'Paiement sécurisé' },
  ];

  const features = [
    {
      icon: <Search size={28} />,
      title: 'Recherche Intelligente',
      description: 'Trouvez le freelance idéal grâce à notre recherche par mot-clé, catégorie ou ville.',
    },
    {
      icon: <Zap size={28} />,
      title: 'Collaboration Rapide',
      description: 'Envoyez une demande de prestation et démarrez votre projet en quelques clics.',
    },
    {
      icon: <ShieldCheck size={28} />,
      title: 'Plateforme Sécurisée',
      description: 'Vos données et vos transactions sont protégées par un système d\'authentification JWT.',
    },
    {
      icon: <MapPin size={28} />,
      title: 'Talents Locaux',
      description: 'Découvrez les meilleurs freelances près de chez vous pour des collaborations de proximité.',
    },
  ];

  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-bg-elements">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
          <div className="hero-grid-pattern"></div>
        </div>

        <div className="container hero-content">
          <div className="hero-badge animate-fade-in-up">
            <Sparkles size={14} />
            <span>La marketplace freelance #1 au Maroc</span>
          </div>

          <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            Trouvez le <span className="gradient-text">freelance parfait</span> pour votre projet
          </h1>

          <p className="hero-description animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Connectez-vous avec des professionnels talentueux dans votre ville.
            Design, développement, rédaction et bien plus encore.
          </p>

          <div className="hero-search-wrapper animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
            <div className="hero-search-bar">
              <Search size={20} className="hero-search-icon" />
              <input
                type="text"
                className="hero-search-input"
                placeholder="Rechercher un service, une compétence..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <Link
                to={`/services${searchKeyword ? `?keyword=${searchKeyword}` : ''}`}
                className="btn btn-primary hero-search-btn"
              >
                Rechercher
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="hero-tags animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <span className="hero-tag-label">Populaire :</span>
            <Link to="/services?keyword=web" className="hero-tag">🌐 Web</Link>
            <Link to="/services?keyword=design" className="hero-tag">🎨 Design</Link>
            <Link to="/services?keyword=mobile" className="hero-tag">📱 Mobile</Link>
            <Link to="/services?keyword=marketing" className="hero-tag">📢 Marketing</Link>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid stagger">
            {stats.map((stat, i) => (
              <div className="stat-card animate-fade-in-up" key={i}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Pourquoi choisir <span className="gradient-text">FreelanceHub</span> ?</h2>
            <p className="section-subtitle">Une plateforme conçue pour simplifier la collaboration entre clients et freelances.</p>
          </div>
          <div className="features-grid stagger">
            {features.map((feature, i) => (
              <div className="feature-card card animate-fade-in-up" key={i}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED SERVICES */}
      {services.length > 0 && (
        <section className="featured-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Services <span className="gradient-text">Récents</span></h2>
              <Link to="/services" className="btn btn-secondary">
                Voir tout
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="services-grid stagger">
              {services.map((service) => (
                <div className="service-card card animate-fade-in-up" key={service.id}>
                  <div className="service-card-header">
                    <span className="badge badge-primary">{service.categoryName || 'Service'}</span>
                    <span className="service-price">{service.price} MAD</span>
                  </div>
                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-desc">{service.description?.slice(0, 100)}...</p>
                  {service.freelancerCity && (
                    <div className="service-card-location">
                      <MapPin size={14} />
                      <span>{service.freelancerCity}</span>
                    </div>
                  )}
                  <Link to={`/services/${service.id}`} className="btn btn-secondary btn-sm service-card-btn">
                    En savoir plus <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA SECTION */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2 className="cta-title">Prêt à démarrer ?</h2>
              <p className="cta-desc">Rejoignez des centaines de freelances et de clients qui utilisent FreelanceHub pour collaborer.</p>
              <div className="cta-buttons">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Créer un compte gratuitement
                  <ArrowRight size={18} />
                </Link>
                <Link to="/services" className="btn btn-secondary btn-lg">
                  Explorer les services
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <Briefcase size={20} />
              <span>Freelance<span className="gradient-text">Hub</span></span>
            </div>
            <p className="footer-text">© 2026 FreelanceHub. Marketplace Freelance Local.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
