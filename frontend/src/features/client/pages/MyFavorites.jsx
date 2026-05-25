import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Heart, Loader2, MapPin, Star, UserRound } from 'lucide-react';
import { getClientFavorites, removeFreelancerFavorite, removeServiceFavorite } from '@/api/favoriteApi';
import FavoriteButton from '@/components/common/FavoriteButton';
import '@/styles/dashboard.css';

function formatPrice(value) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function getFreelancerName(favorite) {
  const fullName = [favorite.freelancerFirstName, favorite.freelancerLastName].filter(Boolean).join(' ');
  if (fullName) {
    return fullName;
  }
  return favorite.freelancerEmail?.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Freelance local';
}

export default function MyFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingKey, setRemovingKey] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getClientFavorites()
      .then((response) => {
        if (isMounted) {
          setFavorites(response.data || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFavorites([]);
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

  const serviceFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.type === 'SERVICE'),
    [favorites],
  );
  const freelancerFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.type === 'FREELANCER'),
    [favorites],
  );

  const handleRemoveFavorite = async (favorite) => {
    const key = `${favorite.type}-${favorite.id}`;
    setRemovingKey(key);

    try {
      if (favorite.type === 'SERVICE') {
        await removeServiceFavorite(favorite.serviceId);
      } else {
        await removeFreelancerFavorite(favorite.freelancerId);
      }
      setFavorites((current) => current.filter((entry) => entry.id !== favorite.id));
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression du favori.');
    } finally {
      setRemovingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="favorites-header animate-fade-in-up">
          <div>
            <h1 className="dashboard-title">
              <Heart size={28} fill="currentColor" /> Mes favoris
            </h1>
            <p className="dashboard-subtitle">Services et freelances sauvegardes pour les retrouver rapidement.</p>
          </div>
          <Link to="/services" className="btn btn-primary">
            <Briefcase size={16} /> Explorer les services
          </Link>
        </div>

        {favorites.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Heart size={48} />
            </div>
            <h3 className="empty-state-title">Aucun favori pour le moment</h3>
            <p className="empty-state-desc">Sauvegardez un service ou un freelance avec le bouton coeur.</p>
          </div>
        ) : (
          <div className="favorites-layout">
            <section className="favorites-section">
              <div className="favorites-section-head">
                <h2>Services sauvegardes</h2>
                <span>{serviceFavorites.length}</span>
              </div>

              {serviceFavorites.length === 0 ? (
                <p className="favorites-empty-line">Aucun service sauvegarde.</p>
              ) : (
                <div className="favorites-grid">
                  {serviceFavorites.map((favorite) => (
                    <article className="favorite-card" key={favorite.id}>
                      <div className="favorite-card-main">
                        {favorite.serviceCoverImageUrl ? (
                          <img src={favorite.serviceCoverImageUrl} alt="" className="favorite-card-cover" />
                        ) : (
                          <div className="favorite-card-cover is-placeholder">
                            <Briefcase size={22} />
                          </div>
                        )}
                        <div className="favorite-card-copy">
                          <span className="badge badge-primary">{favorite.serviceCategoryName || 'Service'}</span>
                          <h3>{favorite.serviceTitle}</h3>
                          <p>
                            <MapPin size={13} />
                            {favorite.serviceCity || favorite.freelancerCity || 'A definir'}
                          </p>
                          <strong>{formatPrice(favorite.servicePrice)} MAD</strong>
                        </div>
                      </div>
                      <div className="favorite-card-actions">
                        <Link to={`/services/${favorite.serviceId}`} className="btn btn-secondary btn-sm">
                          Voir service
                        </Link>
                        <FavoriteButton
                          active
                          compact
                          loading={removingKey === `SERVICE-${favorite.id}`}
                          onClick={() => handleRemoveFavorite(favorite)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="favorites-section">
              <div className="favorites-section-head">
                <h2>Freelances sauvegardes</h2>
                <span>{freelancerFavorites.length}</span>
              </div>

              {freelancerFavorites.length === 0 ? (
                <p className="favorites-empty-line">Aucun freelance sauvegarde.</p>
              ) : (
                <div className="favorites-grid">
                  {freelancerFavorites.map((favorite) => (
                    <article className="favorite-card" key={favorite.id}>
                      <div className="favorite-card-main">
                        <div className="favorite-card-cover is-placeholder">
                          <UserRound size={24} />
                        </div>
                        <div className="favorite-card-copy">
                          <span className="badge badge-primary">Freelance</span>
                          <h3>{getFreelancerName(favorite)}</h3>
                          <p>
                            <MapPin size={13} />
                            {favorite.freelancerCity || 'Ville non renseignee'}
                          </p>
                          <p>
                            <Star size={13} />
                            {favorite.freelancerRating || '4.8'} ({favorite.freelancerTotalReviews || 0} avis)
                          </p>
                        </div>
                      </div>
                      <div className="favorite-card-actions">
                        <Link to={`/freelancers/${favorite.freelancerId}`} className="btn btn-secondary btn-sm">
                          Voir profil
                        </Link>
                        <FavoriteButton
                          active
                          compact
                          loading={removingKey === `FREELANCER-${favorite.id}`}
                          onClick={() => handleRemoveFavorite(favorite)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
