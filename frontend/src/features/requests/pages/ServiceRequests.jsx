import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchRequests } from '@/api/requestApi';
import LocationFilterPicker from '@/components/common/LocationFilterPicker';
import useAuth from '@/hooks/useAuth';
import {
  DEFAULT_SEARCH_RADIUS_KM,
  formatRadiusLabel,
  getRadiusOptionIndex,
  matchesLocationWithinRadius,
  normalizeLocationKey,
  resolveSearchRadius,
  SEARCH_RADIUS_OPTIONS,
} from '@/utils/localSearch';
import { Search, MapPin, Calendar, Coins, Zap, ChevronRight, FileText, Filter } from 'lucide-react';
import '@/styles/requests.css';

function RequestCardSkeleton({ index }) {
  return (
    <article
      className="request-card request-card-skeleton animate-fade-in-up"
      style={{ animationDelay: `${index * 0.08}s` }}
      aria-hidden="true"
    >
      <div className="request-card-header">
        <div className="request-skeleton-title-block">
          <span className="request-skeleton-line is-title skeleton-shimmer" />
          <span className="request-skeleton-line is-title-short skeleton-shimmer" />
        </div>
        <span className="request-skeleton-pill skeleton-shimmer" />
      </div>
      <span className="request-skeleton-line skeleton-shimmer" />
      <span className="request-skeleton-line skeleton-shimmer" />
      <span className="request-skeleton-line is-short skeleton-shimmer" />
      <div className="request-card-meta">
        <span className="request-skeleton-meta skeleton-shimmer" />
        <span className="request-skeleton-meta skeleton-shimmer" />
        <span className="request-skeleton-meta is-wide skeleton-shimmer" />
      </div>
      <div className="request-card-footer">
        <div className="request-card-info">
          <span className="request-skeleton-chip skeleton-shimmer" />
          <span className="request-skeleton-line is-count skeleton-shimmer" />
        </div>
        <span className="request-skeleton-cta skeleton-shimmer" />
      </div>
    </article>
  );
}

function RequestsGridSkeleton() {
  return (
    <div className="requests-grid requests-grid-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <RequestCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
}

export default function ServiceRequests() {
  const { user } = useAuth();
  const preferredSearchCity = user?.searchCity || user?.city || '';
  const preferredSearchRadius = resolveSearchRadius(user?.searchRadiusKm || DEFAULT_SEARCH_RADIUS_KM);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState(preferredSearchCity);
  const [searchPlaceId, setSearchPlaceId] = useState(user?.searchPlaceId || '');
  const [searchLatitude, setSearchLatitude] = useState(user?.searchLatitude ?? null);
  const [searchLongitude, setSearchLongitude] = useState(user?.searchLongitude ?? null);
  const [radiusKm, setRadiusKm] = useState(preferredSearchRadius);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const navigate = useNavigate();
  const searchLocation = useMemo(
    () => ({
      label: city,
      placeId: searchPlaceId,
      lat: searchLatitude,
      lng: searchLongitude,
    }),
    [city, searchLatitude, searchLongitude, searchPlaceId],
  );

  const load = async () => {
    setLoading(true);
    try {
      const hasCoordinates = searchLatitude !== null && searchLongitude !== null;
      const response = await searchRequests({
        keyword: keyword || undefined,
        city: city || undefined,
        urgent: urgentOnly || undefined,
        isUrgent: urgentOnly || undefined,
        lat: hasCoordinates ? searchLatitude : undefined,
        lng: hasCoordinates ? searchLongitude : undefined,
        radiusKm: hasCoordinates ? radiusKm : undefined,
      });
      setRequests(response.data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const [initialLoad] = useState(() => load);
  useEffect(() => { initialLoad(); }, [initialLoad]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const filteredRequests = useMemo(() => {
    const normalizedKeyword = normalizeLocationKey(keyword);
    const radius = resolveSearchRadius(radiusKm);

    return requests.filter((req) => {
      const matchesKeyword =
        !normalizedKeyword ||
        normalizeLocationKey(req.title).includes(normalizedKeyword) ||
        normalizeLocationKey(req.description).includes(normalizedKeyword) ||
        normalizeLocationKey(req.categoryName).includes(normalizedKeyword);

      const matchesCity =
        !city ||
        req.remote ||
        matchesLocationWithinRadius(
          searchLocation,
          [
            { label: req.city, lat: req.latitude, lng: req.longitude, radiusKm: req.requestRadiusKm },
            { label: req.clientCity },
          ],
          radius,
        );

      const matchesUrgency = !urgentOnly || req.urgent;

      return matchesKeyword && matchesCity && matchesUrgency;
    });
  }, [city, keyword, radiusKm, requests, searchLocation, urgentOnly]);

  const handleCityChange = (nextCity) => {
    setCity(nextCity);
    setSearchPlaceId('');
    setSearchLatitude(null);
    setSearchLongitude(null);
  };

  const handleRadiusChange = (event) => {
    setRadiusKm(SEARCH_RADIUS_OPTIONS[Number(event.target.value)]);
  };

  const formatBudget = (min, max) => {
    if (min && max) return `${min} - ${max} MAD`;
    if (min) return `A partir de ${min} MAD`;
    if (max) return `Jusqu'a ${max} MAD`;
    return 'Non specifie';
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="requests-page">
      <div className="container">
        <div className="requests-header animate-fade-in-up">
          <div className="requests-header-text">
            <h1>Demandes de projets</h1>
            <p>Parcourez les besoins publies par les clients et postulez aux projets qui correspondent a vos competences.</p>
          </div>
        </div>

        <form className="requests-filters animate-fade-in-up" onSubmit={handleSearch} style={{ animationDelay: '0.1s' }}>
          <div className="requests-search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Rechercher par mot-cle..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="form-input"
            />
          </div>
          <LocationFilterPicker
            className="requests-city-field"
            value={city}
            latitude={searchLatitude}
            longitude={searchLongitude}
            radiusKm={radiusKm}
            onTextChange={handleCityChange}
            onPlaceSelect={(place) => {
              setCity(place.label || '');
              setSearchPlaceId(place.placeId || '');
              setSearchLatitude(place.lat);
              setSearchLongitude(place.lng);
            }}
            onLocationChange={({ latitude, longitude, label }) => {
              setCity(label || '');
              setSearchPlaceId('');
              setSearchLatitude(latitude);
              setSearchLongitude(longitude);
            }}
          />
          <div className="requests-radius-filter">
            <span>{formatRadiusLabel(radiusKm)}</span>
            <input
              type="range"
              min="0"
              max={SEARCH_RADIUS_OPTIONS.length - 1}
              step="1"
              value={getRadiusOptionIndex(radiusKm)}
              onChange={handleRadiusChange}
              aria-label="Rayon de recherche"
            />
          </div>
          <label className="requests-urgent-filter">
            <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} />
            <Zap size={14} />
            Urgent
          </label>
          <button type="submit" className="btn btn-primary btn-sm">
            <Filter size={14} /> Filtrer
          </button>
        </form>

        {loading ? (
          <>
            <span className="sr-only">Chargement des demandes...</span>
            <RequestsGridSkeleton />
          </>
        ) : filteredRequests.length === 0 ? (
          <div className="requests-empty animate-fade-in-up">
            <FileText size={48} />
            <h3>Aucune demande disponible</h3>
            <p>Revenez plus tard ou modifiez vos filtres.</p>
          </div>
        ) : (
          <div className="requests-grid stagger">
            {filteredRequests.map((req) => (
              <div key={req.id} className="request-card animate-fade-in-up" onClick={() => navigate(`/requests/${req.id}`)}>
                <div className="request-card-header">
                  <h3 className="request-card-title">{req.title}</h3>
                  <div className="request-card-badges">
                    {req.urgent && <span className="badge badge-urgent"><Zap size={10} /> Urgent</span>}
                    {req.remote && <span className="badge badge-remote">Remote</span>}
                  </div>
                </div>
                <p className="request-card-desc">{req.description.length > 120 ? req.description.slice(0, 120) + '...' : req.description}</p>
                <div className="request-card-meta">
                  {req.city && <span className="request-meta-item"><MapPin size={13} /> {req.city}{req.requestRadiusKm ? ` - ${req.requestRadiusKm} km` : ''}</span>}
                  <span className="request-meta-item"><Coins size={13} /> {formatBudget(req.budgetMin, req.budgetMax)}</span>
                  {req.deadline && <span className="request-meta-item"><Calendar size={13} /> {formatDate(req.deadline)}</span>}
                </div>
                <div className="request-card-footer">
                  <div className="request-card-info">
                    <span className="request-category">{req.categoryName}</span>
                    <span className="request-proposals">{req.proposalCount || 0} candidature{(req.proposalCount || 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="request-card-cta"><ChevronRight size={16} /></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
