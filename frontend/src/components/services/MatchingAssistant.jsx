import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Loader2, MapPin, Search, Sparkles, Star, Wallet } from 'lucide-react';
import { matchClientNeed } from '@/api/serviceApi';
import {
  getDeliveryTimeLabel,
  getExecutionModeLabel,
  getServiceLocationLabel,
} from '@/utils/serviceMeta';

const EXAMPLE_NEEDS = [
  'Site web pour restaurant a Marrakech, budget 2000 MAD, livraison en 10 jours',
  'Logo et charte graphique pour une boutique locale',
  'Depannage wifi et imprimante sur place a Rabat cette semaine',
];

function formatMoney(value) {
  if (!value || Number(value) <= 0) {
    return null;
  }

  return `${Number(value).toLocaleString('fr-MA')} MAD`;
}

function formatScore(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function getFreelancerName(service) {
  const email = service?.freelancerEmail || '';
  const rawName = email.split('@')[0] || 'Freelance';

  return rawName
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInterpretedChips(interpretedRequest) {
  if (!interpretedRequest) {
    return [];
  }

  return [
    interpretedRequest.categoryName && `Categorie: ${interpretedRequest.categoryName}`,
    interpretedRequest.city && `Ville: ${interpretedRequest.city}`,
    interpretedRequest.mode && `Mode: ${getExecutionModeLabel(interpretedRequest.mode)}`,
    interpretedRequest.maxBudget && `Budget: ${formatMoney(interpretedRequest.maxBudget)}`,
    interpretedRequest.maxDeliveryDays && `Delai: ${interpretedRequest.maxDeliveryDays} jours`,
  ].filter(Boolean);
}

export default function MatchingAssistant({ defaultCity = '', onApplyFilters }) {
  const [need, setNeed] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [maxBudget, setMaxBudget] = useState('');
  const [maxDeliveryDays, setMaxDeliveryDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const recommendations = result?.recommendations || [];
  const interpretedChips = useMemo(
    () => getInterpretedChips(result?.interpretedRequest),
    [result?.interpretedRequest],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedNeed = need.trim();

    if (normalizedNeed.length < 8) {
      setError('Decrivez le besoin avec au moins quelques mots.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await matchClientNeed({
        need: normalizedNeed,
        city: city || undefined,
        maxBudget: maxBudget || undefined,
        maxDeliveryDays: maxDeliveryDays || undefined,
        limit: 6,
      });
      setResult(response.data);
    } catch (requestError) {
      setResult(null);
      setError(requestError.response?.data?.message || 'Impossible de generer les recommandations.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const interpretedRequest = result?.interpretedRequest || {};

    onApplyFilters?.({
      keyword: interpretedRequest.keyword || need,
      city: interpretedRequest.city || city,
      categoryName: interpretedRequest.categoryName || '',
      maxPrice: interpretedRequest.maxBudget || maxBudget,
      sort: 'recommended',
    });
  };

  return (
    <section className="matching-assistant" id="matching-assistant" aria-label="Assistant de matching">
      <div className="matching-assistant-head">
        <span className="matching-assistant-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <p>Assistant de matching</p>
          <h2>Trouvez les bons freelances a partir d'un besoin.</h2>
        </div>
      </div>

      <form className="matching-assistant-form" onSubmit={handleSubmit}>
        <label className="matching-assistant-need">
          <span>Besoin client</span>
          <textarea
            value={need}
            onChange={(event) => setNeed(event.target.value)}
            rows={4}
            placeholder="Ex: Je veux un site web pour mon restaurant a Agadir, budget 2500 MAD, livraison sous 2 semaines."
          />
        </label>

        <div className="matching-assistant-fields">
          <label>
            <span>
              <MapPin size={14} /> Ville
            </span>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="A confirmer"
            />
          </label>
          <label>
            <span>
              <Wallet size={14} /> Budget max
            </span>
            <input
              type="number"
              min="0"
              value={maxBudget}
              onChange={(event) => setMaxBudget(event.target.value)}
              placeholder="MAD"
            />
          </label>
          <label>
            <span>
              <Clock size={14} /> Delai max
            </span>
            <input
              type="number"
              min="1"
              value={maxDeliveryDays}
              onChange={(event) => setMaxDeliveryDays(event.target.value)}
              placeholder="jours"
            />
          </label>
        </div>

        <div className="matching-assistant-examples">
          {EXAMPLE_NEEDS.map((example) => (
            <button type="button" key={example} onClick={() => setNeed(example)}>
              {example}
            </button>
          ))}
        </div>

        <div className="matching-assistant-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="spinner" /> : <Search size={16} />}
            Recommander
          </button>
          {recommendations.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={handleApplyFilters}>
              Appliquer aux resultats
            </button>
          )}
        </div>
      </form>

      {error && <p className="matching-assistant-error">{error}</p>}

      {result && (
        <div className="matching-assistant-results">
          <div className="matching-assistant-summary">
            <strong>{result.summary}</strong>
            {interpretedChips.length > 0 && (
              <div>
                {interpretedChips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            )}
          </div>

          {recommendations.length === 0 ? (
            <p className="matching-assistant-empty">Aucun service prioritaire pour ce besoin.</p>
          ) : (
            <div className="matching-assistant-list">
              {recommendations.map((recommendation) => {
                const service = recommendation.service;

                return (
                  <article className="matching-assistant-result" key={service.id}>
                    <div className="matching-assistant-score">
                      <strong>{formatScore(recommendation.score)}</strong>
                      <span>match</span>
                    </div>
                    <div className="matching-assistant-result-copy">
                      <div className="matching-assistant-result-head">
                        <div>
                          <h3>{service.title}</h3>
                          <p>
                            {getFreelancerName(service)} - {getServiceLocationLabel(service)}
                          </p>
                        </div>
                        <span>
                          <Star size={13} /> {formatMoney(service.price) || 'Prix a confirmer'}
                        </span>
                      </div>
                      <div className="matching-assistant-reasons">
                        {(recommendation.reasons || []).map((reason) => (
                          <span key={reason}>{reason}</span>
                        ))}
                      </div>
                      <div className="matching-assistant-result-actions">
                        <span>{getDeliveryTimeLabel(service.deliveryTimeDays)}</span>
                        <span>{getExecutionModeLabel(service.executionMode)}</span>
                        <Link to={`/services/${service.id}`}>
                          Voir l'offre <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
