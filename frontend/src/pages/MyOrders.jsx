import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileText, Loader2, Package, Star, X } from 'lucide-react';
import { getClientOrders } from '../api/orderApi';
import { leaveReview } from '../api/reviewApi';
import MissionExecutionCard from '../components/orders/MissionExecutionCard';
import { formatReviewScore, getReviewAverage, reviewAxes } from '../utils/reviewMeta';
import './Dashboard.css';

const defaultReviewDraft = {
  qualityRating: 5,
  punctualityRating: 5,
  communicationRating: 5,
  comment: '',
};

async function loadOrders(setOrders, setLoading, showLoader = true) {
  if (showLoader) {
    setLoading(true);
  }

  try {
    const response = await getClientOrders();
    setOrders(response.data);
  } catch {
    setOrders([]);
  } finally {
    if (showLoader) {
      setLoading(false);
    }
  }
}

function buildReviewDraft(order) {
  return {
    qualityRating: order?.reviewQualityRating || 5,
    punctualityRating: order?.reviewPunctualityRating || 5,
    communicationRating: order?.reviewCommunicationRating || 5,
    comment: order?.reviewComment || '',
  };
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(defaultReviewDraft);
  const [submitting, setSubmitting] = useState(false);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt),
      ),
    [orders],
  );

  const reviewAverage = useMemo(() => getReviewAverage(reviewDraft), [reviewDraft]);

  const stats = [
    { icon: <Package size={22} />, value: orders.filter((order) => order.status === 'IN_PROGRESS').length, label: 'Missions en cours', color: 'blue' },
    { icon: <ClipboardList size={22} />, value: orders.filter((order) => order.notes).length, label: 'Suivis partages', color: 'purple' },
    { icon: <FileText size={22} />, value: orders.filter((order) => order.status === 'COMPLETED').length, label: 'Comptes-rendus finaux', color: 'green' },
  ];

  const fetchOrders = (showLoader = true) => loadOrders(setOrders, setLoading, showLoader);

  useEffect(() => {
    loadOrders(setOrders, setLoading);
  }, []);

  const closeReviewModal = () => {
    setReviewModal(null);
    setReviewDraft(defaultReviewDraft);
    setSubmitting(false);
  };

  const openReviewModal = (order) => {
    setReviewModal(order);
    setReviewDraft(buildReviewDraft(order));
  };

  const handleAxisRating = (axisKey, value) => {
    setReviewDraft((currentDraft) => ({
      ...currentDraft,
      [axisKey]: value,
    }));
  };

  const handleReview = async (event) => {
    event.preventDefault();
    if (!reviewModal) {
      return;
    }

    setSubmitting(true);

    try {
      await leaveReview({
        orderId: reviewModal.id,
        qualityRating: reviewDraft.qualityRating,
        punctualityRating: reviewDraft.punctualityRating,
        communicationRating: reviewDraft.communicationRating,
        comment: reviewDraft.comment,
      });
      await fetchOrders(false);
      alert(reviewModal.reviewId ? 'Avis mis a jour avec succes !' : 'Avis enregistre avec succes !');
      closeReviewModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur');
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Package size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Mes Missions
          </h1>
          <p className="dashboard-subtitle">
            Suivez l'execution, les preuves de livraison et le compte-rendu final depuis un meme espace.
          </p>
        </div>

        {!loading && orders.length > 0 && (
          <div className="dashboard-stats stagger">
            {stats.map((stat, index) => (
              <div className="dash-stat-card animate-fade-in-up" key={index}>
                <div className={`dash-stat-icon ${stat.color}`}>{stat.icon}</div>
                <div className="dash-stat-info">
                  <span className="dash-stat-value">{stat.value}</span>
                  <span className="dash-stat-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Package size={48} />
            </div>
            <h3 className="empty-state-title">Aucune mission</h3>
            <p className="empty-state-desc">
              Vos futures commandes apparaitront ici avec leur suivi, leurs validations et leur compte-rendu final.
            </p>
          </div>
        ) : (
          <div className="mission-grid stagger">
            {sortedOrders.map((order) => (
              <MissionExecutionCard
                key={order.id}
                order={order}
                role="client"
                onReview={openReviewModal}
              />
            ))}
          </div>
        )}

        {reviewModal && (
          <div className="modal-overlay" onClick={closeReviewModal}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{reviewModal.reviewId ? 'Modifier l avis' : 'Evaluer la mission'}</h2>
                <button className="modal-close" onClick={closeReviewModal}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
                Partagez un retour utile sur "{reviewModal.serviceTitle}" avec trois axes concrets pour les missions locales.
              </p>

              <div className="review-overview">
                <span className="review-overview-label">Note globale calculee</span>
                <strong>{formatReviewScore(reviewAverage)} / 5</strong>
                <p>Qualite, ponctualite et communication restent visibles separement dans le profil freelance.</p>
              </div>

              <form className="modal-form" onSubmit={handleReview}>
                <div className="review-axis-grid">
                  {reviewAxes.map((axis) => (
                    <div className="review-axis-card" key={axis.key}>
                      <div className="review-axis-head">
                        <div>
                          <span className="form-label">{axis.label}</span>
                          <p className="review-axis-helper">{axis.helper}</p>
                        </div>
                        <span className="review-axis-score">{reviewDraft[axis.key]} / 5</span>
                      </div>

                      <div className="review-axis-stars">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            type="button"
                            key={value}
                            onClick={() => handleAxisRating(axis.key, value)}
                            className="review-star-button"
                            aria-label={`${axis.label} ${value} sur 5`}
                          >
                            <Star
                              size={22}
                              fill={value <= reviewDraft[axis.key] ? 'currentColor' : 'none'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label className="form-label">Commentaire (optionnel)</label>
                  <textarea
                    className="form-textarea"
                    value={reviewDraft.comment}
                    onChange={(event) =>
                      setReviewDraft((currentDraft) => ({
                        ...currentDraft,
                        comment: event.target.value,
                      }))
                    }
                    placeholder="Exemple : tres bonne qualite sur place, ponctuel, communication claire avant et apres l intervention."
                    rows={4}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeReviewModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Envoi...
                      </>
                    ) : reviewModal.reviewId ? (
                      'Mettre a jour l avis'
                    ) : (
                      'Enregistrer l avis'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
