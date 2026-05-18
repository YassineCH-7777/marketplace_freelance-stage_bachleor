import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { getActiveServices, getRecommendedServices } from '@/api/serviceApi';
import GoogleLocationInput from '@/components/common/GoogleLocationInput';
import useAuth from '@/hooks/useAuth';
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
import {
  DEFAULT_SEARCH_RADIUS_KM,
  formatRadiusLabel,
  getRadiusOptionIndex,
  matchesLocationWithinRadius,
  resolveSearchRadius,
  SEARCH_RADIUS_OPTIONS,
} from '@/utils/localSearch';
import '@/styles/services.css';

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Pertinence' },
  { value: 'local-first', label: 'Mode et delai' },
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
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getPrice(service) {
  return Number(service.price || 0);
}

function getModePriority(service) {
  switch (service.executionMode) {
    case 'ON_SITE':
      return 0;
    case 'HYBRID':
      return 1;
    case 'REMOTE':
      return 2;
    default:
      return 3;
  }
}

function getServiceLocalScore(service, targetCity) {
  const expectedCity = normalize(targetCity);

  if (!expectedCity) {
    return 0;
  }

  const serviceCity = normalize(service.serviceCity);
  const freelancerCity = normalize(service.freelancerCity);
  const visibleLocation = normalize(getServiceLocationLabel(service));

  if (serviceCity && serviceCity !== 'remote' && serviceCity === expectedCity) {
    return 3;
  }

  if (freelancerCity && freelancerCity === expectedCity) {
    return 2;
  }

  if (visibleLocation && visibleLocation.includes(expectedCity)) {
    return 1;
  }

  return 0;
}

function compareLocalPriority(a, b, targetCity) {
  const scoreDifference = getServiceLocalScore(b, targetCity) - getServiceLocalScore(a, targetCity);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  if (getServiceLocalScore(a, targetCity) > 0) {
    const modeDifference = getModePriority(a) - getModePriority(b);

    if (modeDifference !== 0) {
      return modeDifference;
    }
  }

  return 0;
}

function compareDelivery(a, b) {
  return Number(a.deliveryTimeDays || 999) - Number(b.deliveryTimeDays || 999);
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

function readCoordinateParam(value, fallback = null) {
  const rawValue = value ?? fallback;
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const coordinate = Number(rawValue);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export default function Services() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const preferredSearchCity = user?.searchCity || user?.city || '';
  const preferredSearchLatitude = user?.searchLatitude ?? null;
  const preferredSearchLongitude = user?.searchLongitude ?? null;
  const preferredSearchRadius = resolveSearchRadius(user?.searchRadiusKm || DEFAULT_SEARCH_RADIUS_KM);
  const [services, setServices] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [city, setCity] = useState(searchParams.get('city') || preferredSearchCity);
  const [searchPlaceId, setSearchPlaceId] = useState(searchParams.get('placeId') || user?.searchPlaceId || '');
  const [searchLatitude, setSearchLatitude] = useState(
    readCoordinateParam(searchParams.get('lat'), preferredSearchLatitude),
  );
  const [searchLongitude, setSearchLongitude] = useState(
    readCoordinateParam(searchParams.get('lng'), preferredSearchLongitude),
  );
  const [radiusKm, setRadiusKm] = useState(
    resolveSearchRadius(searchParams.get('radiusKm') || preferredSearchRadius),
  );
  const [categoryName, setCategoryName] = useState(searchParams.get('categoryName') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'recommended');
  const localPriorityCity = city || preferredSearchCity;
  const searchLocation = useMemo(
    () => ({
      label: city,
      placeId: searchPlaceId,
      lat: searchLatitude,
      lng: searchLongitude,
    }),
    [city, searchLatitude, searchLongitude, searchPlaceId],
  );

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

  useEffect(() => {
    let isMounted = true;
    const requestedCity = city || preferredSearchCity;

    Promise.resolve().then(() => {
      if (isMounted) {
        setRecommendationsLoading(true);
      }
    });
    getRecommendedServices({
      keyword,
      categoryName,
      city: requestedCity,
      maxBudget: maxPrice || undefined,
      limit: 50,
    })
      .then((response) => {
        if (isMounted) {
          setRecommendations(response.data || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRecommendations([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setRecommendationsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [categoryName, city, keyword, maxPrice, preferredSearchCity]);

  const servicesWithRecommendation = useMemo(() => {
    const recommendationByServiceId = new Map(
      recommendations
        .filter((recommendation) => recommendation?.service?.id)
        .map((recommendation) => [recommendation.service.id, recommendation]),
    );

    return services.map((service) => {
      const recommendation = recommendationByServiceId.get(service.id);

      if (!recommendation) {
        return service;
      }

      return {
        ...service,
        recommendationScore: recommendation.score,
        recommendationReasons: recommendation.reasons || [],
        recommendationDetails: recommendation.scoreDetails || {},
      };
    });
  }, [recommendations, services]);

  const cityOptions = useMemo(() => {
    const values = services
      .map((service) => getServiceLocationLabel(service))
      .filter((value) => value && value !== 'A distance');
    if (preferredSearchCity) {
      values.push(preferredSearchCity);
    }
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [preferredSearchCity, services]);

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
    const radius = resolveSearchRadius(radiusKm);

    return [...servicesWithRecommendation]
      .filter((service) => {
        const title = normalize(service.title);
        const description = normalize(service.description);
        const category = normalize(service.categoryName);
        const location = normalize(getServiceLocationLabel(service));
        const executionMode = normalize(service.executionMode);
        const price = getPrice(service);

        const matchesKeyword =
          !normalizedKeyword ||
          title.includes(normalizedKeyword) ||
          description.includes(normalizedKeyword) ||
          category.includes(normalizedKeyword);

        const isRemoteCompatible = service.remote || executionMode === 'remote' || executionMode === 'hybrid';
        const matchesCity =
          !normalizedCity ||
          isRemoteCompatible ||
          matchesLocationWithinRadius(
            searchLocation,
            [
              { label: service.serviceCity },
              { label: service.freelancerCity },
              { label: location },
            ],
            radius,
          );
        const matchesCategory = !normalizedCategory || category === normalizedCategory;
        const matchesMin = min === null || price >= min;
        const matchesMax = max === null || price <= max;

        return matchesKeyword && matchesCity && matchesCategory && matchesMin && matchesMax;
      })
      .sort((a, b) => {
        const localComparison = sort === 'recommended' ? 0 : compareLocalPriority(a, b, localPriorityCity);

        if (localComparison !== 0) {
          return localComparison;
        }

        switch (sort) {
          case 'recommended': {
            const recommendationDifference =
              Number(b.recommendationScore || 0) - Number(a.recommendationScore || 0);

            if (recommendationDifference !== 0) {
              return recommendationDifference;
            }

            const localDifference = compareLocalPriority(a, b, localPriorityCity);

            if (localDifference !== 0) {
              return localDifference;
            }

            return compareDelivery(a, b);
          }
          case 'price-asc':
            return getPrice(a) - getPrice(b);
          case 'delivery-asc':
            return compareDelivery(a, b);
          case 'newest':
            return Number(b.id || 0) - Number(a.id || 0);
          case 'local-first': {
            const modeDifference = getModePriority(a) - getModePriority(b);

            if (modeDifference !== 0) {
              return modeDifference;
            }

            const deliveryDifference = compareDelivery(a, b);

            if (deliveryDifference !== 0) {
              return deliveryDifference;
            }

            return Number(b.id || 0) - Number(a.id || 0);
          }
          case 'price-desc':
          default:
            return getPrice(b) - getPrice(a);
        }
      });
  }, [categoryName, city, keyword, localPriorityCity, maxPrice, minPrice, radiusKm, searchLocation, servicesWithRecommendation, sort]);

  const catalogStats = useMemo(() => {
    const rapidServices = services.filter((service) => Number(service.deliveryTimeDays || 999) <= 3).length;

    return [
      {
        icon: <BadgeCheck size={18} />,
        label: 'Offres verifiees',
        value: services.length,
      },
      {
        icon: <MapPin size={18} />,
        label: cityOptions.length > 1 ? 'Villes couvertes' : 'Ville couverte',
        value: cityOptions.length,
      },
      {
        icon: <Clock size={18} />,
        label: 'Livraison rapide',
        value: rapidServices,
      },
      {
        icon: <BriefcaseBusiness size={18} />,
        label: categoryOptions.length > 1 ? 'Categories actives' : 'Categorie active',
        value: categoryOptions.length,
      },
    ];
  }, [categoryOptions.length, cityOptions.length, services]);

  const activeFilters = useMemo(
    () =>
      [
        keyword && `Mot-cle : ${keyword}`,
        city && `Ville : ${city}`,
        city && `Rayon : ${formatRadiusLabel(radiusKm)}`,
        categoryName && `Categorie : ${categoryName}`,
        minPrice && `Min : ${formatPrice(minPrice)} MAD`,
        maxPrice && `Max : ${formatPrice(maxPrice)} MAD`,
      ].filter(Boolean),
    [categoryName, city, keyword, maxPrice, minPrice, radiusKm],
  );

  const hasActiveFilters = activeFilters.length > 0;
  const matchPercentage = services.length
    ? Math.max(6, Math.round((filteredServices.length / services.length) * 100))
    : 0;

  const updateSearchParams = (nextValues = {}) => {
    const next = {
      keyword,
      city,
      placeId: searchPlaceId,
      lat: searchLatitude,
      lng: searchLongitude,
      radiusKm,
      categoryName,
      minPrice,
      maxPrice,
      sort,
      ...nextValues,
    };

    const params = {};
    Object.entries(next).forEach(([key, value]) => {
      if (value && !(['radiusKm', 'lat', 'lng', 'placeId'].includes(key) && !next.city)) {
        params[key] = String(value);
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

  const handleSearchLocationTextChange = (value) => {
    setCity(value);
    setSearchPlaceId('');
    setSearchLatitude(null);
    setSearchLongitude(null);
    updateSearchParams({ city: value, placeId: '', lat: null, lng: null });
  };

  const handleSearchLocationSelect = (place) => {
    setCity(place.label || '');
    setSearchPlaceId(place.placeId || '');
    setSearchLatitude(place.lat);
    setSearchLongitude(place.lng);
    updateSearchParams({
      city: place.label || '',
      placeId: place.placeId || '',
      lat: place.lat,
      lng: place.lng,
    });
  };

  const handleRadiusChange = (event) => {
    const nextRadius = SEARCH_RADIUS_OPTIONS[Number(event.target.value)];
    setRadiusKm(nextRadius);
    updateSearchParams({ radiusKm: nextRadius });
  };

  const resetFilters = () => {
    setKeyword('');
    setCity('');
    setSearchPlaceId('');
    setSearchLatitude(null);
    setSearchLongitude(null);
    setRadiusKm(preferredSearchRadius);
    setCategoryName('');
    setMinPrice('');
    setMaxPrice('');
    setSort('recommended');
    setSearchParams({});
  };

  return (
    <div className="services-page">
      <div className="container services-shell">
        <header className="services-hero">
          <div className="services-hero-copy">
            <p className="services-eyebrow">
              <BadgeCheck size={14} />
              Catalogue verifie
            </p>
            <h1>Des services freelances prets a demarrer.</h1>
            <p className="services-heading-copy">
              Comparez les prix, les delais, la ville et le mode d'execution avant de contacter le bon profil.
            </p>
            <div className="services-hero-assurance">
              <span>
                <CheckCircle2 size={15} />
                Offres publiees et profils actifs
              </span>
              <span>
                <Clock size={15} />
                Delais visibles avant contact
              </span>
            </div>
          </div>
          <div className="services-heading-summary">
            <span>{filteredServices.length}</span>
            <div>
              service{filteredServices.length > 1 ? 's' : ''} disponible{filteredServices.length > 1 ? 's' : ''}
              <small>{services.length} offre{services.length > 1 ? 's' : ''} au catalogue</small>
            </div>
            <div className="services-summary-meter" aria-hidden="true">
              <i style={{ width: `${matchPercentage}%` }} />
            </div>
          </div>
        </header>

        <section className="services-stat-grid" aria-label="Indicateurs du catalogue">
          {catalogStats.map((stat) => (
            <div className="services-stat-card" key={stat.label}>
              <div className="services-stat-icon">{stat.icon}</div>
              <div>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            </div>
          ))}
        </section>

        <form className="services-toolbar" onSubmit={handleSearch}>
          <div className="services-toolbar-search">
            <Search size={18} />
            <input
              type="text"
              aria-label="Rechercher un service"
              placeholder="Mot-cle (logo, site, photo...)"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <button className="services-search-submit" type="submit">
            <Search size={16} />
            Rechercher
          </button>
          <label className="services-sort-control">
            <span className="sr-only">Trier les services</span>
            <ArrowUpDown size={16} />
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
          </label>
        </form>

        <div className="services-content">
          <aside className="services-filter-panel" aria-label="Filtres services">
            <div className="services-filter-head">
              <div>
                <span>Recherche avancee</span>
                <h2>
                  <SlidersHorizontal size={15} />
                  Affiner
                </h2>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                aria-label="Reinitialiser les filtres"
              >
                <X size={14} />
              </button>
            </div>

            {hasActiveFilters && (
              <div className="services-active-filters">
                {activeFilters.map((filter) => (
                  <span key={filter}>{filter}</span>
                ))}
              </div>
            )}

            <label className="services-filter-field">
              <span>Adresse ou quartier</span>
              <GoogleLocationInput
                value={city}
                onTextChange={handleSearchLocationTextChange}
                onPlaceSelect={handleSearchLocationSelect}
                placeholder="Casablanca, Maarif..."
              />
            </label>

            <div className="services-filter-field">
              <span>Rayon</span>
              <div className="services-radius-control">
                <input
                  type="range"
                  min="0"
                  max={SEARCH_RADIUS_OPTIONS.length - 1}
                  step="1"
                  value={getRadiusOptionIndex(radiusKm)}
                  onChange={handleRadiusChange}
                  aria-label="Rayon de recherche"
                />
                <strong>{formatRadiusLabel(radiusKm)}</strong>
              </div>
              <div className="services-radius-options" aria-hidden="true">
                {SEARCH_RADIUS_OPTIONS.map((option) => (
                  <span key={option}>{option}</span>
                ))}
              </div>
            </div>

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

          <section className="services-results" id="services-results" aria-live="polite">
            <div className="services-results-head">
              <div>
                <p>Resultats</p>
                <h2>
                  {filteredServices.length} offre{filteredServices.length > 1 ? 's' : ''} selectionnee
                  {filteredServices.length > 1 ? 's' : ''}
                </h2>
              </div>
              <span>
                {sort === 'recommended' ? (
                  recommendationsLoading ? (
                    <Loader2 size={15} className="spinner" />
                  ) : (
                    <ShieldCheck size={15} />
                  )
                ) : (
                  <ArrowUpDown size={15} />
                )}
                {sort === 'recommended' ? 'Offres pertinentes' : 'Tri applique'}
              </span>
            </div>

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
                  const previewDescription =
                    description?.trim() || 'Brief, budget et delai a valider directement avec le freelance.';
                  return (
                    <Link
                      to={`/services/${service.id}`}
                      className="service-result-card"
                      key={service.id}
                      aria-label={`Voir le service ${service.title}`}
                    >
                      <div
                        className={`service-result-media ${coverImageUrl ? 'has-cover' : ''}`}
                      >
                        {coverImageUrl ? (
                          <img src={coverImageUrl} alt="" className="service-result-cover" />
                        ) : (
                          <div className="service-result-cover-placeholder">
                            <BriefcaseBusiness size={24} />
                            <span>{service.categoryName || 'Service'}</span>
                          </div>
                        )}
                        <div className="service-result-category">{service.categoryName || 'Service'}</div>
                      </div>

                      <div className="service-result-topline">
                        <div className="service-result-verified">
                          <ShieldCheck size={13} />
                          Profil verifie
                        </div>
                        <div className="service-result-delivery-pill">
                          <Clock size={13} />
                          {getDeliveryTimeLabel(service.deliveryTimeDays).replace('Sous ', '')}
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
                        {previewDescription.slice(0, 118)}
                        {previewDescription.length > 118 ? '...' : ''}
                      </p>

                      <div className="service-result-footer">
                        <div>
                          <span>Budget indicatif</span>
                          <strong>
                            <b>{formatPrice(service.price)}</b> MAD
                          </strong>
                        </div>
                        <span className="service-result-action">Voir l'offre</span>
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
