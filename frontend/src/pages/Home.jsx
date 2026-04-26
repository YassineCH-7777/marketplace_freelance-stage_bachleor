import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Briefcase,
  Users,
  ShieldCheck,
  MapPin,
  Zap,
  Sparkles,
  Star,
  Clock,
} from 'lucide-react';
import { getActiveServices } from '../api/serviceApi';
import {
  getDeliveryTimeLabel,
  getExecutionModeLabel,
  getExecutionModeTone,
  getServiceLocationLabel,
} from '../utils/serviceMeta';
import {
  getServiceCoverImageUrl,
  stripServiceMediaSection,
} from '../utils/serviceDescription';
import heroImage from '../assets/hero-freelancer.jpg';
import './Home.css';

export default function Home() {
  const [services, setServices] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    getActiveServices()
      .then((res) => setServices(res.data.slice(0, 6)))
      .catch(() => setServices([]));
  }, []);

  const stats = [
    { icon: <Users size={22} />, value: '500+', label: 'Talents actifs' },
    { icon: <Briefcase size={22} />, value: '1200+', label: 'Services publies' },
    { icon: <MapPin size={22} />, value: '3 modes', label: 'Sur place, hybride, distance' },
    { icon: <Zap size={22} />, value: '<24h', label: 'Demandes rapides' },
  ];

  const categories = ['Photo', 'Depannage', 'Design', 'Cours', 'Site web', 'Evenementiel', 'Installation', 'Video'];

  const features = [
    {
      step: '01',
      title: 'Recherchez',
      description: 'Trouvez le bon freelance selon votre ville, votre budget et votre besoin.',
    },
    {
      step: '02',
      title: 'Discutez',
      description: 'Precisez la mission, le mode d intervention et les delais avant de lancer.',
    },
    {
      step: '03',
      title: 'Evaluez',
      description: 'Suivez la livraison puis laissez un avis pour aider la communaute locale.',
    },
  ];

  const params = new URLSearchParams();
  if (searchKeyword.trim()) params.set('keyword', searchKeyword.trim());
  if (searchCity.trim()) params.set('city', searchCity.trim());
  const servicesUrl = params.toString() ? `/services?${params.toString()}` : '/services';

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="hero-badge animate-fade-in-up">
              <Sparkles size={14} />
              <span>Freelances verifies pres de chez vous</span>
            </div>

            <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
              Trouvez le bon <span className="gradient-text">freelance local</span> en quelques clics.
            </h1>

            <p className="hero-description animate-fade-in-up" style={{ animationDelay: '0.24s' }}>
              ProxiSkills connecte clients et freelances de votre ville pour des missions de design,
              developpement, photo, cours, installation et bien plus.
            </p>

            <div className="hero-search-wrapper animate-fade-in-up" style={{ animationDelay: '0.36s' }}>
              <div className="hero-search-bar">
                <div className="hero-input-group">
                  <Search size={18} className="hero-search-icon" />
                  <input
                    type="text"
                    className="hero-search-input"
                    placeholder="Que cherchez-vous ?"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="hero-input-group hero-city-group">
                  <MapPin size={18} className="hero-search-icon" />
                  <input
                    type="text"
                    className="hero-search-input"
                    placeholder="Ville"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                  />
                </div>
                <Link to={servicesUrl} className="btn btn-primary hero-search-btn">
                  Rechercher
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="hero-trust-row animate-fade-in-up" style={{ animationDelay: '0.48s' }}>
              <span>
                <ShieldCheck size={16} />
                Profils verifies
              </span>
              <span>
                <Star size={16} />
                Avis transparents
              </span>
              <span>
                <Users size={16} />
                +500 freelances locaux
              </span>
            </div>
          </div>

          <div className="hero-visual animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
            <div className="hero-image-shell">
              <img src={heroImage} alt="Freelance travaillant sur son ordinateur" className="hero-image" />
            </div>
            <div className="hero-floating-card hero-floating-card-left">
              <div className="floating-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p>Mission acceptee</p>
                <span>Yassine - Fes - 1200 MAD</span>
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card-right">
              <div className="floating-rating">
                <Star size={16} />
                4.9 / 5
              </div>
              <span>Travail rapide et professionnel.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container">
          <div className="stats-grid stagger">
            {stats.map((stat, index) => (
              <div className="stat-card animate-fade-in-up" key={index}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="categories-section" id="categories">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <p className="section-eyebrow">Categories</p>
              <h2 className="section-title">Explorez par domaine</h2>
            </div>
            <Link to="/services" className="section-link">
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          <div className="categories-grid stagger">
            {categories.map((category) => (
              <Link
                to={`/services?categoryName=${encodeURIComponent(category)}`}
                className="category-card animate-fade-in-up"
                key={category}
              >
                <span>{category.charAt(0)}</span>
                <p>{category}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section" id="services">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <p className="section-eyebrow">Services en vedette</p>
              <h2 className="section-title">Les meilleures offres locales</h2>
            </div>
            <Link to="/services" className="section-link">
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          {services.length > 0 && (
            <div className="services-grid stagger">
              {services.map((service) => {
                const coverImageUrl = getServiceCoverImageUrl(service);
                const description = stripServiceMediaSection(service.description);

                return (
                  <Link to={`/services/${service.id}`} className="service-card animate-fade-in-up" key={service.id}>
                    <div
                      className={`service-card-media ${coverImageUrl ? 'has-cover' : ''}`}
                      style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : undefined}
                    >
                      <span className="service-card-category">{service.categoryName || 'Service'}</span>
                      <h3>{service.title}</h3>
                    </div>
                    <div className="service-card-body">
                      <p className="service-card-desc">
                        {description?.slice(0, 110)}
                        {description?.length > 110 ? '...' : ''}
                      </p>
                      <div className="service-meta-chips">
                        <span className="service-chip">
                          <MapPin size={12} />
                          {getServiceLocationLabel(service)}
                        </span>
                        <span className={`service-chip ${getExecutionModeTone(service.executionMode)}`}>
                          {getExecutionModeLabel(service.executionMode)}
                        </span>
                      </div>
                      <div className="service-card-footer">
                        <span>
                          <Clock size={14} />
                          {getDeliveryTimeLabel(service.deliveryTimeDays)}
                        </span>
                        <strong>{service.price} MAD</strong>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="how-section" id="comment-ca-marche">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Comment ca marche</p>
            <h2 className="section-title">Trois etapes simples</h2>
          </div>
          <div className="features-grid stagger">
            {features.map((feature) => (
              <div className="feature-card animate-fade-in-up" key={feature.step}>
                <span className="feature-step">{feature.step}</span>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section" id="freelances">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2 className="cta-title">Vous etes freelance ? Faites grandir votre clientele locale.</h2>
              <p className="cta-desc">
                Creez votre profil gratuitement, publiez vos services et recevez des demandes pres de chez vous.
              </p>
            </div>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-secondary btn-lg">
                Devenir freelance
                <ArrowRight size={18} />
              </Link>
              <Link to="/services" className="cta-note">
                Explorer les services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <Briefcase size={20} />
              <span>Proxi<span className="gradient-text">Skills</span></span>
            </div>
            <p className="footer-text">(c) 2026 ProxiSkills. Marketplace hyper-locale de services.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
