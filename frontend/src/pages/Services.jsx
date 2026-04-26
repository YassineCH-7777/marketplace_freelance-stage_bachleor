import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Loader2, Clock, Star, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
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
import './Services.css';

const SORT_OPTIONS = [
  { value: 'price-desc', label: 'Prix decroissant' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'delivery-asc', label: 'Delai le plus court' },
  { value: 'newest', label: 'Plus recents' },
];

const FREELANCER_NAMES = {
  'freelance1@marketplace.com': 'Yassine Freelancer',
  'freelance2@marketplace.com': 'Mahmoud Freelancer',
  'yassine@freelance.com': 'Yassine Freelancer',
  'sophie@freelance.com': 'Sophie Freelancer',
};

const FREELANCER_RATINGS = {
  'freelance1@marketplace.com': '5.0',
  'freelance2@marketplace.com': '4.8',
  'yassine@freelance.com': '5.0',
  'sophie@freelance.com': '4.8',
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getPrice(service) {
  return Number(service.price || 0);
}

function getFreelancerName(service) {
  const email = service.freelancerEmail || '';
  if (FREELANCER_NAMES[email]) {
    return FREELANCER_NAMES[email];
  }

  const name = email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Freelance local';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getRating(service) {
  return FREELANCER_RATINGS[service.freelancerEmail] || '4.8';
}

function formatPrice(value) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(getPrice({ price: value }));
}

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [categoryName, setCategoryName] = useState(searchParams.get('categoryName') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'price-desc');

  useEffect(() => {
    let isMounted = true;

    getActiveServices()
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
  }, []);

  const cityOptions = useMemo(() => {
    const values = services
      .map((service) => getServiceLocationLabel(service))
      .filter((value) => value && value !== 'A distance');
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [services]);

  const categoryOptions = useMemo(() => {
    const values = services.map((service) => service.categoryName).filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [services]);

  const filteredServices = useMemo(() => {
    const normalizedKeyword = normalize(keyword);
    const normalizedCity = normalize(city);
    const normalizedCategory = normalize(categoryName);
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    return [...services]
      .filter((service) => {
        const title = normalize(service.title);
        const description = normalize(service.description);
        const category = normalize(service.categoryName);
        const location = normalize(getServiceLocationLabel(service));
        const price = getPrice(service);

        const matchesKeyword =
          !normalizedKeyword ||
          title.includes(normalizedKeyword) ||
          description.includes(normalizedKeyword) ||
          category.includes(normalizedKeyword);

        const matchesCity = !normalizedCity || location.includes(normalizedCity);
        const matchesCategory = !normalizedCategory || category === normalizedCategory;
        const matchesMin = min === null || price >= min;
        const matchesMax = max === null || price <= max;

        return matchesKeyword && matchesCity && matchesCategory && matchesMin && matchesMax;
      })
      .sort((a, b) => {
        switch (sort) {
          case 'price-asc':
            return getPrice(a) - getPrice(b);
          case 'delivery-asc':
            return Number(a.deliveryTimeDays || 999) - Number(b.deliveryTimeDays || 999);
          case 'newest':
            return Number(b.id || 0) - Number(a.id || 0);
          case 'price-desc':
          default:
            return getPrice(b) - getPrice(a);
        }
      });
  }, [categoryName, city, keyword, maxPrice, minPrice, services, sort]);

  const updateSearchParams = (nextValues = {}) => {
    const next = {
      keyword,
      city,
      categoryName,
      minPrice,
      maxPrice,
      sort,
      ...nextValues,
    };

    const params = {};
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        params[key] = value;
      }
    });
    setSearchParams(params);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateSearchParams();
  };

  const handleSelectChange = (setter, key) => (event) => {
    setter(event.target.value);
    updateSearchParams({ [key]: event.target.value });
  };

  const resetFilters = () => {
    setKeyword('');
    setCity('');
    setCategoryName('');
    setMinPrice('');
    setMaxPrice('');
    setSort('price-desc');
    setSearchParams({});
  };

  return (
    <div className="services-page">
      <div className="container services-shell">
        <header className="services-heading">
          <div>
            <p className="services-eyebrow">Marketplace locale</p>
            <h1>Trouver un service freelance</h1>
            <p className="services-heading-copy">
              Comparez les offres, les delais et les profils disponibles dans votre ville.
            </p>
          </div>
          <div className="services-heading-summary">
            <span>{filteredServices.length}</span>
            service{filteredServices.length > 1 ? 's' : ''} disponible{filteredServices.length > 1 ? 's' : ''}
          </div>
        </header>

        <form className="services-toolbar" onSubmit={handleSearch}>
          <div className="services-toolbar-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Mot-cle (logo, site, photo...)"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <button className="services-search-submit" type="submit">
            Rechercher
          </button>
          <select
            className="services-sort-select"
            value={sort}
            onChange={handleSelectChange(setSort, 'sort')}
            aria-label="Trier les services"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </form>

        <div className="services-content">
          <aside className="services-filter-panel">
            <div className="services-filter-head">
              <h2>
                <SlidersHorizontal size={15} />
                Filtres
              </h2>
              <button type="button" onClick={resetFilters} aria-label="Reinitialiser les filtres">
                <X size={14} />
              </button>
            </div>

            <label className="services-filter-field">
              <span>Ville</span>
              <select value={city} onChange={handleSelectChange(setCity, 'city')}>
                <option value="">Toutes les villes</option>
                {cityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="services-filter-field">
              <span>Categorie</span>
              <select value={categoryName} onChange={handleSelectChange(setCategoryName, 'categoryName')}>
                <option value="">Toutes</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="services-filter-field">
              <span>Prix (MAD)</span>
              <div className="services-price-row">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  onBlur={() => updateSearchParams()}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  onBlur={() => updateSearchParams()}
                />
              </div>
            </div>
          </aside>

          <section className="services-results" aria-live="polite">
            {loading ? (
              <div className="services-empty-state">
                <Loader2 size={30} className="spinner" />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="services-empty-state">
                <Search size={42} />
                <h2>Aucun service trouve</h2>
                <p>Essayez un autre mot-cle, une autre ville ou une fourchette de prix plus large.</p>
              </div>
            ) : (
              <div className="services-results-grid">
                {filteredServices.map((service) => {
                  const freelancerName = getFreelancerName(service);
                  const coverImageUrl = getServiceCoverImageUrl(service);
                  const description = stripServiceMediaSection(service.description);
                  return (
                    <Link to={`/services/${service.id}`} className="service-result-card" key={service.id}>
                      {coverImageUrl && (
                        <img src={coverImageUrl} alt="" className="service-result-cover" />
                      )}
                      <div className="service-result-topline">
                        <div className="service-result-category">{service.categoryName || 'Service'}</div>
                        <div className="service-result-verified">
                          <ShieldCheck size={13} />
                          Verifie
                        </div>
                      </div>

                      <h2 className="service-result-title">{service.title}</h2>

                      <div className="service-result-author">
                        <div className="service-result-avatar">{getInitials(freelancerName)}</div>
                        <div className="service-result-author-copy">
                          <strong>{freelancerName}</strong>
                          <span>
                            <MapPin size={12} />
                            {getServiceLocationLabel(service)}
                          </span>
                        </div>
                        <div className="service-result-rating">
                          <Star size={13} />
                          {getRating(service)}
                        </div>
                      </div>

                      <div className="service-result-meta">
                        <span className={`service-chip ${getExecutionModeTone(service.executionMode)}`}>
                          {getExecutionModeLabel(service.executionMode)}
                        </span>
                        <span className="service-chip">
                          <Clock size={12} />
                          {getDeliveryTimeLabel(service.deliveryTimeDays)}
                        </span>
                      </div>

                      <p className="service-result-desc">
                        {description?.slice(0, 96)}
                        {description?.length > 96 ? '...' : ''}
                      </p>

                      <div className="service-result-footer">
                        <span>
                          <Clock size={13} />
                          {getDeliveryTimeLabel(service.deliveryTimeDays).replace('Sous ', '')}
                        </span>
                        <strong>
                          A partir de <b>{formatPrice(service.price)} MAD</b>
                        </strong>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
