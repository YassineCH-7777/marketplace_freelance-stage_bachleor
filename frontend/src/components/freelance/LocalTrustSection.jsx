import { Clock3, MapPin, Phone, Repeat, ShieldCheck, Star } from 'lucide-react';
import { formatReviewScore, getReviewAverage, getReviewAxisAverages } from '../../utils/reviewMeta';

function countRepeatClients(reviews) {
  const occurrences = reviews.reduce((accumulator, review) => {
    const key = review.clientEmail || `client-${review.clientId}`;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return Object.values(occurrences).filter((count) => count > 1).length;
}

function hasRapidAvailability(service) {
  return typeof service?.deliveryTimeDays === 'number' && service.deliveryTimeDays <= 1;
}

export default function LocalTrustSection({ profile, services = [], reviews = [] }) {
  const localServiceCount = services.filter((service) => service.executionMode !== 'REMOTE').length;
  const rapidServiceCount = services.filter(hasRapidAvailability).length;
  const repeatClientCount = countRepeatClients(reviews);
  const axisAverages = getReviewAxisAverages(reviews);
  const averageRating = reviews.length > 0
    ? formatReviewScore(
        reviews.reduce((sum, review) => sum + (getReviewAverage(review) || 0), 0) / reviews.length,
      )
    : null;

  const axisSummary = axisAverages
    .filter((axis) => axis.average !== null)
    .map((axis) => `${axis.label} ${formatReviewScore(axis.average)}/5`)
    .join(' | ');

  const currentSignals = [
    profile?.city
      ? {
          icon: MapPin,
          title: 'Ville confirmee',
          description: `Le profil public est rattache a ${profile.city}.`,
        }
      : null,
    localServiceCount > 0
      ? {
          icon: ShieldCheck,
          title: 'Interventions locales',
          description: `${localServiceCount} service${localServiceCount > 1 ? 's' : ''} sont proposes sur place ou en hybride.`,
        }
      : null,
    rapidServiceCount > 0
      ? {
          icon: Clock3,
          title: 'Disponibilite rapide',
          description: `${rapidServiceCount} service${rapidServiceCount > 1 ? 's' : ''} peuvent demarrer sous 24h.`,
        }
      : null,
    reviews.length > 0
      ? {
          icon: Star,
          title: 'Avis multi-axes',
          description: axisSummary || `${reviews.length} avis publics decrivent deja la mission sur plusieurs axes concrets.`,
        }
      : null,
    repeatClientCount > 0
      ? {
          icon: Repeat,
          title: 'Clients recurrents',
          description: `${repeatClientCount} client${repeatClientCount > 1 ? 's' : ''} sont revenus au moins deux fois.`,
        }
      : null,
  ].filter(Boolean);

  const plannedSignals = [
    {
      icon: ShieldCheck,
      label: 'Identite validee',
    },
    {
      icon: Phone,
      label: 'Telephone valide',
    },
    {
      icon: MapPin,
      label: 'Freelance rencontre',
    },
    {
      icon: MapPin,
      label: 'Ville verifiee',
    },
  ];

  return (
    <section className="card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
      <div className="public-section-header">
        <div>
          <h2>Confiance locale</h2>
          <p className="public-section-intro">
            Des badges utiles pour une relation locale reelle : presence terrain, execution fiable et avis concrets.
          </p>
        </div>
        <span className="badge badge-primary">
          <Star size={12} />
          {averageRating ? `${averageRating} / 5` : `${currentSignals.length} signal${currentSignals.length > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="public-trust-stats">
        <div className="public-trust-stat">
          <strong>{currentSignals.length}</strong>
          <span>signaux actifs</span>
        </div>
        <div className="public-trust-stat">
          <strong>{reviews.length}</strong>
          <span>avis publics</span>
        </div>
        <div className="public-trust-stat">
          <strong>{repeatClientCount}</strong>
          <span>clients recurrents</span>
        </div>
      </div>

      {currentSignals.length > 0 ? (
        <div className="public-trust-grid">
          {currentSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <article className="public-trust-card" key={signal.title}>
                <span className="public-trust-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <h3>{signal.title}</h3>
                  <p>{signal.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="public-empty-block">
          <p>
            Ce profil affiche encore peu de signaux de confiance locale. Les premiers avis et services publics
            permettront de le rendre plus lisible.
          </p>
        </div>
      )}

      <div className="public-trust-roadmap">
        <span className="public-trust-roadmap-label">Bientot :</span>
        <div className="public-trust-roadmap-list">
          {plannedSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <span key={signal.label} className="public-planned-badge">
                <Icon size={14} />
                {signal.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
