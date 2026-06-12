import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Briefcase,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  Code2,
  GraduationCap,
  Heart,
  MapPin,
  MapPinned,
  Monitor,
  Paintbrush,
  Quote,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  Zap,
} from 'lucide-react';
import { getActiveServices } from '@/api/serviceApi';
import {
  getDeliveryTimeLabel,
  getExecutionModeLabel,
  getExecutionModeTone,
  getServiceLocationLabel,
} from '@/utils/serviceMeta';
import {
  getServiceCoverImageUrl,
  stripServiceMediaSection,
} from '@/utils/serviceDescription';
import heroImage from '@/assets/hero-freelancer.jpg';
import '@/styles/home.css';

const cities = ['Casablanca', 'Fes', 'Rabat', 'Marrakech', 'Tanger', 'Agadir', 'Meknes', 'Oujda'];

const categoryRules = [
  {
    category: 'Application mobile',
    categoryName: 'Developpement web',
    keywords: ['application mobile', 'app mobile', 'appli mobile', 'ios', 'android', 'flutter', 'react native'],
  },
  {
    category: 'Photo',
    categoryName: 'Photographie',
    keywords: ['photo', 'photographe', 'mariage', 'shooting'],
  },
  {
    category: 'Montage video',
    categoryName: 'Montage video',
    keywords: ['montage video', 'video', 'reel', 'short', 'youtube'],
  },
  {
    category: 'Site web',
    categoryName: 'Developpement web',
    keywords: ['site web', 'site', 'web', 'react', 'application web', 'developpeur', 'frontend'],
  },
  {
    category: 'Design',
    categoryName: 'Design graphique',
    keywords: ['design', 'logo', 'identite', 'brand', 'affiche'],
  },
  {
    category: 'Cours',
    categoryName: 'Cours particuliers',
    keywords: ['cours', 'prof', 'soutien', 'anglais', 'math'],
  },
  {
    category: 'Depannage',
    categoryName: 'Support informatique',
    keywords: ['depannage', 'reparation', 'pc', 'ordinateur', 'installation', 'wifi', 'reseau', 'imprimante'],
  },
  {
    category: 'Evenementiel',
    categoryName: 'Photographie',
    keywords: ['evenement', 'traiteur', 'mariage', 'conference'],
  },
];

const smartSuggestions = [
  'Je cherche un photographe a Casablanca pour un mariage',
  'Developpeur React a Fes pour creer un site web',
  'Cours particuliers de maths a Rabat',
  'Reparation PC urgente a Marrakech',
];

const trustedBy = ['Atlas Startup', 'Casa Retail', 'Fes Events', 'Rabat Studio', 'Marrakech Food'];

const stats = [
  { icon: Users, target: 500, suffix: '+', label: 'Talents actifs', detail: 'profils verifies' },
  { icon: Briefcase, target: 1200, suffix: '+', label: 'Services publies', detail: 'missions locales' },
  { icon: MapPinned, target: 18, suffix: '', label: 'Villes couvertes', detail: 'Maroc entier' },
  { icon: Zap, target: 24, prefix: '<', suffix: 'h', label: 'Reponse moyenne', detail: 'sur demandes urgentes' },
];

const categories = [
  {
    name: 'Photo',
    categoryName: 'Photographie',
    icon: Camera,
    count: '126 talents',
    trend: '+18%',
    examples: 'Mariage, produit, portrait',
  },
  {
    name: 'Site web',
    categoryName: 'Developpement web',
    icon: Code2,
    count: '210 talents',
    trend: '+24%',
    examples: 'React, vitrine, e-commerce',
  },
  {
    name: 'Design',
    categoryName: 'Design graphique',
    icon: Paintbrush,
    count: '154 talents',
    trend: '+15%',
    examples: 'Logo, UI, supports print',
  },
  {
    name: 'Cours',
    categoryName: 'Cours particuliers',
    icon: GraduationCap,
    count: '98 talents',
    trend: '+11%',
    examples: 'Soutien, langues, concours',
  },
  {
    name: 'Depannage',
    categoryName: 'Support informatique',
    icon: Wrench,
    count: '83 talents',
    trend: '+9%',
    examples: 'PC, reseau, installation',
  },
  {
    name: 'Evenementiel',
    categoryName: 'Photographie',
    icon: CalendarCheck,
    count: '72 talents',
    trend: '+13%',
    examples: 'Mariage, restaurant, salon',
  },
  {
    name: 'Installation',
    categoryName: 'Support informatique',
    icon: Monitor,
    count: '65 talents',
    trend: '+7%',
    examples: 'Logiciels, camera, wifi',
  },
  {
    name: 'Conseil',
    categoryName: 'Community management',
    icon: BrainCircuit,
    count: '44 talents',
    trend: '+21%',
    examples: 'Business, CV, marketing',
  },
];

const recentRequests = [
  {
    title: 'Creation site restaurant',
    budget: '6000 MAD',
    city: 'Casablanca',
    proposals: 12,
    tag: 'Site web',
    freshness: 'il y a 8 min',
  },
  {
    title: 'Photographe mariage',
    budget: '2500 MAD',
    city: 'Fes',
    proposals: 8,
    tag: 'Photo',
    freshness: 'il y a 21 min',
  },
  {
    title: 'Identite visuelle pour cafe',
    budget: '1800 MAD',
    city: 'Rabat',
    proposals: 15,
    tag: 'Design',
    freshness: 'il y a 36 min',
  },
  {
    title: 'Reparation parc PC',
    budget: '1200 MAD',
    city: 'Marrakech',
    proposals: 6,
    tag: 'Depannage',
    freshness: 'il y a 44 min',
  },
];

const fallbackFeaturedServices = [
  {
    id: 'featured-react-website',
    title: 'Site vitrine React pour restaurant',
    description: 'Creation d un site moderne, responsive et optimise pour presenter menu, galerie et reservations.',
    categoryName: 'Developpement web',
    serviceCity: 'Casablanca',
    executionMode: 'HYBRID',
    deliveryTimeDays: 7,
    price: 6000,
    rating: '4.9',
    missionsCount: 32,
    responseTime: 'Reponse < 1h',
    previewUrl: '/services?categoryName=Developpement%20web&city=Casablanca&keyword=React',
  },
  {
    id: 'featured-wedding-photo',
    title: 'Photographie mariage et evenement',
    description: 'Reportage photo complet avec retouches, galerie partageable et livraison rapide des meilleurs moments.',
    categoryName: 'Photographie',
    serviceCity: 'Fes',
    executionMode: 'ON_SITE',
    deliveryTimeDays: 3,
    price: 2500,
    rating: '5.0',
    missionsCount: 28,
    responseTime: 'Reponse < 30 min',
    previewUrl: '/services?categoryName=Photographie&city=Fes&keyword=mariage',
  },
  {
    id: 'featured-brand-design',
    title: 'Identite visuelle complete',
    description: 'Logo, palette, typographies et supports reseaux sociaux pour lancer une marque locale credible.',
    categoryName: 'Design graphique',
    serviceCity: 'Rabat',
    executionMode: 'REMOTE',
    deliveryTimeDays: 5,
    price: 1800,
    rating: '4.8',
    missionsCount: 24,
    responseTime: 'Reponse < 2h',
    previewUrl: '/services?categoryName=Design%20graphique&city=Rabat&keyword=logo',
  },
];

const popularFreelancers = [
  {
    name: 'Yassine A.',
    role: 'Developpeur React',
    city: 'Fes',
    initials: 'YA',
    rating: '4.9',
    missions: '43 missions',
    skills: ['React', 'Spring', 'SEO'],
  },
  {
    name: 'Salma E.',
    role: 'Photographe',
    city: 'Casablanca',
    initials: 'SE',
    rating: '5.0',
    missions: '31 missions',
    skills: ['Mariage', 'Produit', 'Retouche'],
  },
  {
    name: 'Nour B.',
    role: 'Designer UI',
    city: 'Rabat',
    initials: 'NB',
    rating: '4.8',
    missions: '27 missions',
    skills: ['Figma', 'Logo', 'Brand'],
  },
];

const cityMapStats = [
  { city: 'Casablanca', freelancers: 120, requests: 34, x: '36%', y: '58%' },
  { city: 'Rabat', freelancers: 80, requests: 22, x: '48%', y: '42%' },
  { city: 'Fes', freelancers: 60, requests: 18, x: '63%', y: '36%' },
  { city: 'Marrakech', freelancers: 50, requests: 16, x: '48%', y: '72%' },
  { city: 'Tanger', freelancers: 42, requests: 11, x: '57%', y: '18%' },
];

const testimonials = [
  {
    quote: 'Excellent developpeur React, tres clair dans les delais et la livraison.',
    author: 'Yassine',
    city: 'Casablanca',
  },
  {
    quote: 'J ai trouve une photographe en moins d une heure pour notre evenement.',
    author: 'Imane',
    city: 'Fes',
  },
  {
    quote: 'La demande de mission a attire des profils vraiment pertinents.',
    author: 'Mehdi',
    city: 'Rabat',
  },
];

const workflow = [
  {
    step: '01',
    icon: Search,
    title: 'Decrivez le besoin',
    description: 'L assistant IA extrait la categorie, la ville, l urgence et le budget estime.',
  },
  {
    step: '02',
    icon: Send,
    title: 'Recevez des profils',
    description: 'Comparez les freelances locaux selon note, reactivite et missions realisees.',
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'Lancez la mission',
    description: 'Discutez, suivez la livraison, puis laissez un avis pour renforcer la confiance.',
  },
];

function normalizeValue(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function analyzePrompt(prompt) {
  const normalizedPrompt = normalizeValue(prompt);
  const detectedCity = cities.find((city) => normalizedPrompt.includes(normalizeValue(city)));
  const detectedRule = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => normalizedPrompt.includes(keyword)),
  );
  const budgetMatch = normalizedPrompt.match(/(\d[\d\s]*)\s*(mad|dh|dhs|dirham|dirhams)/);
  const budget = budgetMatch ? `${budgetMatch[1].replace(/\s/g, '')} MAD` : null;

  return {
    category: detectedRule?.category || 'A detecter',
    categoryName: detectedRule?.categoryName || '',
    city: detectedCity || 'Ville a confirmer',
    budget: budget || 'Budget a estimer',
  };
}

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let animationFrame;
    const start = performance.now();

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * easedProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, target]);

  return value;
}

function AnimatedStat({ stat }) {
  const value = useCountUp(stat.target);
  const Icon = stat.icon;

  return (
    <article className="stat-card animate-fade-in-up">
      <div className="stat-icon">
        <Icon size={22} />
      </div>
      <strong className="stat-value">
        {stat.prefix}
        {value}
        {stat.suffix}
      </strong>
      <span className="stat-label">{stat.label}</span>
      <small>{stat.detail}</small>
    </article>
  );
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [searchPrompt, setSearchPrompt] = useState('');
  const [heroMotion, setHeroMotion] = useState({ x: 0, y: 0 });

  useEffect(() => {
    getActiveServices()
      .then((res) => setServices(res.data.slice(0, 6)))
      .catch(() => setServices([]));
  }, []);

  const aiInsight = useMemo(() => analyzePrompt(searchPrompt), [searchPrompt]);
  const featuredServices = services.length > 0 ? services : fallbackFeaturedServices;

  const servicesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (searchPrompt.trim()) params.set('keyword', searchPrompt.trim());
    if (aiInsight.city !== 'Ville a confirmer') params.set('city', aiInsight.city);
    if (aiInsight.categoryName) params.set('categoryName', aiInsight.categoryName);
    return params.toString() ? `/services?${params.toString()}` : '/services';
  }, [aiInsight, searchPrompt]);

  const handleHeroMouseMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setHeroMotion({ x, y });
  };

  const handleHeroMouseLeave = () => setHeroMotion({ x: 0, y: 0 });

  return (
    <div className="home-page">
      <section
        className="hero-section hero-premium"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        style={{
          '--hero-shift-x': `${heroMotion.x * 28}px`,
          '--hero-shift-y': `${heroMotion.y * 28}px`,
          '--hero-shift-soft-x': `${heroMotion.x * -16}px`,
          '--hero-shift-soft-y': `${heroMotion.y * -16}px`,
          '--hero-shift-deep-x': `${heroMotion.x * 42}px`,
          '--hero-shift-deep-y': `${heroMotion.y * 42}px`,
        }}
      >
        <div className="hero-aurora" aria-hidden="true" />
        <div className="hero-gridlines" aria-hidden="true" />
        <div className="hero-particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

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
              ProxiSkills connecte clients et freelances de votre ville pour des missions de design, developpement, photo, cours, installation et bien plus.
            </p>

            <div className="ai-search-panel animate-fade-in-up" style={{ animationDelay: '0.36s' }}>
              <div className="ai-search-heading">
                <span>
                  <Bot size={16} />
                </span>
                <div>
                  <strong>Assistant IA</strong>
                  <small>Decrivez votre besoin naturellement</small>
                </div>
              </div>

              <label className="sr-only" htmlFor="smart-search">
                Decrivez votre besoin
              </label>
              <div className="hero-smart-search">
                <Search size={19} className="hero-search-icon" />
                <input
                  id="smart-search"
                  type="text"
                  className="hero-search-input"
                  placeholder="Je cherche un photographe a Casablanca..."
                  value={searchPrompt}
                  onChange={(event) => setSearchPrompt(event.target.value)}
                />
                <Link to={servicesUrl} className="btn btn-primary hero-search-btn">
                  Rechercher
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="ai-detection-grid" aria-label="Analyse IA de la demande">
                <span>
                  <strong>{aiInsight.category}</strong>
                  Categorie detectee
                </span>
                <span>
                  <strong>{aiInsight.city}</strong>
                  Ville detectee
                </span>
                <span>
                  <strong>{aiInsight.budget}</strong>
                  Budget estime
                </span>
              </div>

              <div className="hero-suggestions" aria-label="Suggestions de recherche">
                {smartSuggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => setSearchPrompt(suggestion)}>
                    {suggestion}
                  </button>
                ))}
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
                <Radio size={16} />
                Demandes en temps reel
              </span>
            </div>
          </div>

          <div className="hero-visual animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
            <div className="hero-image-shell">
              <img src={heroImage} alt="Freelance travaillant sur son ordinateur" className="hero-image" />
              <div className="hero-image-overlay">
                <span>Matching local</span>
                <strong>94%</strong>
              </div>
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
              <span>Reponse en moins d une heure.</span>
            </div>

            <div className="hero-floating-card hero-floating-card-bottom">
              <div className="floating-icon is-accent">
                <Target size={20} />
              </div>
              <div>
                <p>3 profils recommandes</p>
                <span>React, Casablanca, budget coherent</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trusted-section" aria-label="Ils utilisent ProxiSkills">
        <div className="container">
          <p>Ils utilisent ProxiSkills</p>
          <div className="trusted-logos">
            {trustedBy.map((brand) => (
              <span key={brand}>
                <Building2 size={16} />
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container">
          <div className="stats-grid stagger">
            {stats.map((stat) => (
              <AnimatedStat stat={stat} key={stat.label} />
            ))}
          </div>
        </div>
      </section>

      <section className="categories-section" id="categories">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <p className="section-eyebrow">Categories interactives</p>
              <h2 className="section-title">Explorez les demandes qui montent</h2>
            </div>
            <Link to="/services" className="section-link">
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          <div className="categories-grid stagger">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  to={`/services?categoryName=${encodeURIComponent(category.categoryName || category.name)}`}
                  className="category-card animate-fade-in-up"
                  key={category.name}
                >
                  <span className="category-icon">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.examples}</p>
                  </div>
                  <small>{category.count}</small>
                  <strong>{category.trend}</strong>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="requests-section" id="demandes">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <p className="section-eyebrow">Demandes recentes</p>
              <h2 className="section-title">Des missions locales publiees en continu</h2>
            </div>
            <Link to="/requests" className="section-link">
              Voir les demandes <ArrowRight size={16} />
            </Link>
          </div>

          <div className="requests-grid stagger">
            {recentRequests.map((request) => (
              <Link to="/requests" className="request-card animate-fade-in-up" key={request.title}>
                <div className="request-card-top">
                  <span className="live-dot">
                    <Radio size={13} />
                    Live
                  </span>
                  <small>{request.freshness}</small>
                </div>
                <h3>{request.title}</h3>
                <div className="request-meta">
                  <span>
                    <WalletCards size={15} />
                    {request.budget}
                  </span>
                  <span>
                    <MapPin size={15} />
                    {request.city}
                  </span>
                </div>
                <div className="request-card-footer">
                  <span>{request.tag}</span>
                  <strong>{request.proposals} candidatures</strong>
                </div>
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
          <div className="services-grid stagger">
            {featuredServices.map((service, index) => {
                const coverImageUrl = getServiceCoverImageUrl(service);
                const description = stripServiceMediaSection(service.description);
                const rating = service.rating || (4.8 + (index % 2) * 0.1).toFixed(1);
                const missions = service.missionsCount || 18 + index * 4;
                const serviceUrl = service.previewUrl || `/services/${service.id}`;

              return (
                <Link to={serviceUrl} className="service-card animate-fade-in-up" key={service.id}>
                  <div
                    className={`service-card-media ${coverImageUrl ? 'has-cover' : ''}`}
                    style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : undefined}
                  >
                    <span className="service-card-category">{service.categoryName || 'Service'}</span>
                    <div className="service-rating">
                      <Star size={14} />
                      {rating}
                    </div>
                    <h3>{service.title}</h3>
                  </div>
                  <div className="service-card-body">
                    <p className="service-card-desc">
                      {description?.slice(0, 110)}
                      {description?.length > 110 ? '...' : ''}
                    </p>
                    <div className="service-proof-row">
                      <span>
                        <Briefcase size={13} />
                        {missions} missions
                      </span>
                      <span>
                        <Clock size={13} />
                        {service.responseTime || 'Reponse < 1h'}
                      </span>
                    </div>
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
                    <div className="service-hover-actions" aria-hidden="true">
                      <span>Voir profil</span>
                      <span>Contacter</span>
                      <span>Voir service</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="freelancers-section" id="freelances-populaires">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <p className="section-eyebrow">Freelances populaires</p>
              <h2 className="section-title">Des profils prets a intervenir pres de vous</h2>
            </div>
            <Link to="/services" className="section-link">
              Explorer les talents <ArrowRight size={16} />
            </Link>
          </div>

          <div className="freelancers-grid stagger">
            {popularFreelancers.map((freelancer) => (
              <Link
                to={`/services?keyword=${encodeURIComponent(freelancer.role)}&city=${encodeURIComponent(
                  freelancer.city,
                )}`}
                className="freelancer-card animate-fade-in-up"
                key={freelancer.name}
              >
                <div className="freelancer-avatar">{freelancer.initials}</div>
                <div className="freelancer-main">
                  <h3>{freelancer.name}</h3>
                  <p>{freelancer.role}</p>
                  <span>
                    <MapPin size={14} />
                    {freelancer.city}
                  </span>
                </div>
                <div className="freelancer-score">
                  <strong>
                    <Star size={14} />
                    {freelancer.rating}
                  </strong>
                  <small>{freelancer.missions}</small>
                </div>
                <div className="freelancer-skills">
                  {freelancer.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
                <div className="freelancer-hover">Voir profil</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="map-section" id="carte-maroc">
        <div className="container map-layout">
          <div className="map-copy">
            <p className="section-eyebrow">Carte du Maroc</p>
            <h2 className="section-title">Visualisez l offre locale par ville</h2>
            <p>
              La page met en avant les villes ou ProxiSkills peut matcher rapidement clients et freelances, avec des
              demandes ouvertes et des talents disponibles.
            </p>
            <div className="map-summary">
              <span>
                <Users size={16} />
                352 freelances suivis
              </span>
              <span>
                <Briefcase size={16} />
                101 demandes ouvertes
              </span>
            </div>
          </div>

          <div className="morocco-map-card">
            <div className="morocco-map-shape">
              {cityMapStats.map((city) => (
                <Link
                  to={`/services?city=${encodeURIComponent(city.city)}`}
                  className="map-pin"
                  style={{ left: city.x, top: city.y }}
                  key={city.city}
                >
                  <span />
                  <strong>{city.city}</strong>
                  <small>
                    {city.freelancers} freelances - {city.requests} demandes
                  </small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="how-section" id="comment-ca-marche">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Comment ca marche</p>
            <h2 className="section-title">Une experience simple, mais beaucoup plus intelligente</h2>
          </div>
          <div className="features-grid stagger">
            {workflow.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="feature-card animate-fade-in-up" key={feature.step}>
                  <span className="feature-step">{feature.step}</span>
                  <div className="feature-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-desc">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="testimonials-section" id="avis-clients">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Avis clients</p>
            <h2 className="section-title">La confiance se construit mission apres mission</h2>
          </div>

          <div className="testimonial-marquee" aria-label="Avis clients">
            <div className="testimonial-track">
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <article className="testimonial-card" key={`${testimonial.author}-${index}`}>
                  <Quote size={20} />
                  <div className="testimonial-stars" aria-label="5 etoiles">
                    {[0, 1, 2, 3, 4].map((star) => (
                      <Star size={15} key={star} />
                    ))}
                  </div>
                  <p>"{testimonial.quote}"</p>
                  <strong>
                    {testimonial.author} - {testimonial.city}
                  </strong>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section" id="freelances">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <p className="section-eyebrow">Passez a l action</p>
              <h2 className="cta-title">Transformez vos competences en opportunites locales.</h2>
              <p className="cta-desc">
                Creez votre profil, recevez des demandes qualifiees et construisez une reputation visible dans votre
                ville.
              </p>
            </div>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-secondary btn-lg">
                Creer mon profil
                <ArrowRight size={18} />
              </Link>
              <Link to="/client/requests/new" className="btn btn-accent btn-lg">
                Publier une demande
                <Briefcase size={18} />
              </Link>
            </div>
            <div className="cta-proof">
              <Heart size={16} />
              Matching local, avis transparents, missions suivies.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
