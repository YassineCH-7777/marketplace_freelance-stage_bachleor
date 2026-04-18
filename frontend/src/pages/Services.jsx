import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getActiveServices, searchServices } from '../api/serviceApi';
import { Search, MapPin, ArrowRight, Loader2, Filter, X } from 'lucide-react';
import './Services.css';

export default function Services() {
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchServices = (params = {}) => {
    setLoading(true);
    const hasFilters = params.keyword || params.city || params.categoryId;
    const apiCall = hasFilters ? searchServices(params) : getActiveServices();
    apiCall
      .then(r => setServices(r.data))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const initialKeyword = searchParams.get('keyword');
    if (initialKeyword) {
      fetchServices({ keyword: initialKeyword });
    } else {
      fetchServices();
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (keyword) params.keyword = keyword;
    if (city) params.city = city;
    if (categoryId) params.categoryId = parseInt(categoryId);
    fetchServices(params);
  };

  const clearFilters = () => {
    setKeyword('');
    setCity('');
    setCategoryId('');
    fetchServices();
  };

  return (
    <div className="services-page">
      <div className="container">
        <div className="services-header animate-fade-in-up">
          <h1 className="services-page-title">Explorer les <span className="gradient-text">Services</span></h1>
          <p className="services-page-subtitle">Trouvez le freelance idéal par mot-clé, catégorie ou ville.</p>
        </div>

        {/* Search Bar */}
        <form className="services-search-form animate-fade-in-up" style={{ animationDelay: '0.15s' }} onSubmit={handleSearch}>
          <div className="services-search-bar">
            <Search size={20} className="services-search-icon" />
            <input
              type="text"
              className="services-search-input"
              placeholder="Rechercher un service..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
            <button type="button" className="services-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
            </button>
            <button type="submit" className="btn btn-primary">Rechercher</button>
          </div>

          {showFilters && (
            <div className="services-filters animate-fade-in">
              <div className="filter-group">
                <label className="form-label"><MapPin size={14} /> Ville</label>
                <input className="form-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Casablanca" />
              </div>
              <div className="filter-group">
                <label className="form-label">ID Catégorie</label>
                <input className="form-input" type="number" min="1" value={categoryId} onChange={e => setCategoryId(e.target.value)} placeholder="1" />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <X size={14} /> Réinitialiser
              </button>
            </div>
          )}
        </form>

        {/* Results */}
        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : services.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Search size={48} /></div>
            <h3 className="empty-state-title">Aucun service trouvé</h3>
            <p className="empty-state-desc">Essayez de modifier vos critères de recherche.</p>
          </div>
        ) : (
          <>
            <p className="services-count animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {services.length} service{services.length > 1 ? 's' : ''} trouvé{services.length > 1 ? 's' : ''}
            </p>
            <div className="services-results-grid stagger">
              {services.map(service => (
                <div className="service-result-card card animate-fade-in-up" key={service.id}>
                  <div className="service-card-header">
                    <span className="badge badge-primary">{service.categoryName || 'Service'}</span>
                    <span className="service-price">{service.price} MAD</span>
                  </div>
                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-desc">{service.description?.slice(0, 120)}{service.description?.length > 120 ? '...' : ''}</p>
                  {service.freelancerCity && (
                    <div className="service-card-location">
                      <MapPin size={14} />
                      <span>{service.freelancerCity}</span>
                    </div>
                  )}
                  <Link to={`/services/${service.id}`} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
                    Voir détails <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
