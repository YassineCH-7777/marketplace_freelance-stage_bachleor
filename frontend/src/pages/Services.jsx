import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Loader2, Filter, X } from 'lucide-react';
import { getActiveServices, searchServices } from '../api/serviceApi';
import './Services.css';

function buildSearchParams({ keyword, city, categoryName }) {
  const params = {};

  if (keyword) params.keyword = keyword;
  if (city) params.city = city;
  if (categoryName) params.categoryName = categoryName;

  return params;
}

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get('keyword') || '';
  const initialCity = searchParams.get('city') || '';
  const initialCategoryName = searchParams.get('categoryName') || '';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [city, setCity] = useState(initialCity);
  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [showFilters, setShowFilters] = useState(Boolean(initialCity || initialCategoryName));

  useEffect(() => {
    let isMounted = true;
    const params = buildSearchParams({
      keyword: initialKeyword,
      city: initialCity,
      categoryName: initialCategoryName,
    });
    const apiCall = Object.keys(params).length > 0 ? searchServices(params) : getActiveServices();

    apiCall
      .then((response) => {
        if (isMounted) {
          setServices(response.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setServices([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialCategoryName, initialCity, initialKeyword]);

  const fetchServices = (params = {}) => {
    setLoading(true);

    const apiCall = Object.keys(params).length > 0 ? searchServices(params) : getActiveServices();

    apiCall
      .then((response) => setServices(response.data))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const params = buildSearchParams({ keyword, city, categoryName });
    setSearchParams(params);
    fetchServices(params);
  };

  const clearFilters = () => {
    setKeyword('');
    setCity('');
    setCategoryName('');
    setSearchParams({});
    fetchServices();
  };

  return (
    <div className="services-page">
      <div className="container">
        <div className="services-header animate-fade-in-up">
          <h1 className="services-page-title">
            Explorer les <span className="gradient-text">Services</span>
          </h1>
          <p className="services-page-subtitle">
            Trouvez le freelance ideal par mot-cle, categorie ou ville.
          </p>
        </div>

        <form
          className="services-search-form animate-fade-in-up"
          onSubmit={handleSearch}
          style={{ animationDelay: '0.15s' }}
        >
          <div className="services-search-bar">
            <Search size={20} className="services-search-icon" />
            <input
              type="text"
              className="services-search-input"
              placeholder="Rechercher un service..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <button
              type="button"
              className="services-filter-toggle"
              onClick={() => setShowFilters((currentValue) => !currentValue)}
            >
              <Filter size={18} />
            </button>
            <button type="submit" className="btn btn-primary">
              Rechercher
            </button>
          </div>

          {showFilters && (
            <div className="services-filters animate-fade-in">
              <div className="filter-group">
                <label className="form-label">
                  <MapPin size={14} /> Ville
                </label>
                <input
                  className="form-input"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Ex: Casablanca"
                />
              </div>
              <div className="filter-group">
                <label className="form-label">Categorie</label>
                <input
                  className="form-input"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Ex: Design"
                />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <X size={14} /> Reinitialiser
              </button>
            </div>
          )}
        </form>

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        ) : services.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Search size={48} />
            </div>
            <h3 className="empty-state-title">Aucun service trouve</h3>
            <p className="empty-state-desc">Essayez de modifier vos criteres de recherche.</p>
          </div>
        ) : (
          <>
            <p className="services-count animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {services.length} service{services.length > 1 ? 's' : ''} trouve
              {services.length > 1 ? 's' : ''}
            </p>
            <div className="services-results-grid stagger">
              {services.map((service) => (
                <div className="service-result-card card animate-fade-in-up" key={service.id}>
                  <div className="service-card-header">
                    <span className="badge badge-primary">{service.categoryName || 'Service'}</span>
                    <span className="service-price">{service.price} MAD</span>
                  </div>
                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-desc">
                    {service.description?.slice(0, 120)}
                    {service.description?.length > 120 ? '...' : ''}
                  </p>
                  {service.freelancerCity && (
                    <div className="service-card-location">
                      <MapPin size={14} />
                      <span>{service.freelancerCity}</span>
                    </div>
                  )}
                  <Link
                    to={`/services/${service.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
                  >
                    Voir details <ArrowRight size={14} />
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
