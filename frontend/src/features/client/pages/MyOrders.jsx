import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, Loader2, Package, Star, X } from 'lucide-react';
import {
  acceptOrderDelivery,
  confirmEscrowPayment,
  getClientOrders,
  openClientOrderDispute,
  requestOrderRevision,
} from '@/api/orderApi';
import { leaveReview } from '@/api/reviewApi';
import MissionExecutionCard from '@/components/orders/MissionExecutionCard';
import { activeMissionStatuses } from '@/utils/orderExecution';
import { formatReviewScore, getReviewAverage, reviewAxes } from '@/utils/reviewMeta';
import '@/styles/dashboard.css';

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

function getRevisionCount(order) {
  return Number(order?.revisionCount) || 0;
}

function getMaxRevisionRounds(order) {
  return Number.isFinite(Number(order?.maxRevisionRounds)) ? Number(order.maxRevisionRounds) : 3;
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(defaultReviewDraft);
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryComment, setDeliveryComment] = useState('');
  const [revisionModal, setRevisionModal] = useState(null);
  const [revisionComment, setRevisionComment] = useState('');
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [confirmingEscrowId, setConfirmingEscrowId] = useState(null);
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
    { icon: <Package size={22} />, value: orders.filter((order) => activeMissionStatuses.includes(order.status)).length, label: 'Missions actives', color: 'blue' },
    { icon: <ClipboardList size={22} />, value: orders.filter((order) => order.activities?.length || order.notes).length, label: 'Suivis traces', color: 'purple' },
    { icon: <FileText size={22} />, value: orders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(order.status)).length, label: 'Livraisons recues', color: 'green' },
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

  const updateOrderInState = (updatedOrder) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    );
  };

  const handleConfirmEscrow = async (order) => {
    setConfirmingEscrowId(order.id);
    try {
      const response = await confirmEscrowPayment(order.id);
      updateOrderInState(response.data);
      alert('Paiement simule bloque. Le freelance peut demarrer la mission.');
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors du blocage du paiement simule');
    } finally {
      setConfirmingEscrowId(null);
    }
  };

  const openDeliveryModal = (order) => {
    setDeliveryModal(order);
    setDeliveryComment('');
  };

  const closeDeliveryModal = () => {
    setDeliveryModal(null);
    setDeliveryComment('');
    setSubmitting(false);
  };

  const handleAcceptDelivery = async (event) => {
    event.preventDefault();
    if (!deliveryModal) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await acceptOrderDelivery(deliveryModal.id, {
        comment: deliveryComment || 'Livraison verifiee et validee depuis l espace client.',
      });
      updateOrderInState(response.data);
      alert('Livraison validee. La mission est maintenant terminee.');
      closeDeliveryModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la validation de la livraison');
      setSubmitting(false);
    }
  };

  const openRevisionModal = (order) => {
    if (getRevisionCount(order) >= getMaxRevisionRounds(order)) {
      alert('Le nombre maximum de revisions est atteint pour cette mission.');
      return;
    }

    setRevisionModal(order);
    setRevisionComment(order.revisionRequest || '');
  };

  const closeRevisionModal = () => {
    setRevisionModal(null);
    setRevisionComment('');
    setSubmitting(false);
  };

  const handleRevisionRequest = async (event) => {
    event.preventDefault();
    if (!revisionModal) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await requestOrderRevision(revisionModal.id, { comment: revisionComment });
      updateOrderInState(response.data);
      alert('Demande de revision envoyee au freelance.');
      closeRevisionModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la demande de revision');
      setSubmitting(false);
    }
  };

  const openDisputeModal = (order) => {
    setDisputeModal(order);
    setDisputeReason(order.disputeReason || '');
  };

  const closeDisputeModal = () => {
    setDisputeModal(null);
    setDisputeReason('');
    setSubmitting(false);
  };

  const handleOpenDispute = async (event) => {
    event.preventDefault();
    if (!disputeModal) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await openClientOrderDispute(disputeModal.id, { reason: disputeReason });
      updateOrderInState(response.data);
      alert('Litige ouvert. Un administrateur pourra arbitrer la mission.');
      closeDisputeModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de l ouverture du litige');
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
                onConfirmEscrow={handleConfirmEscrow}
                onAcceptDelivery={openDeliveryModal}
                onOpenDispute={openDisputeModal}
                onRequestRevision={openRevisionModal}
                onReview={openReviewModal}
                confirmingEscrow={confirmingEscrowId === order.id}
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

        {deliveryModal && (
          <div className="modal-overlay" onClick={closeDeliveryModal}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Confirmer la livraison</h2>
                <button className="modal-close" onClick={closeDeliveryModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="delivery-confirmation-note">
                <strong>{deliveryModal.serviceTitle}</strong>
                <p>Avant de valider, verifiez que la livraison correspond au brief et que les fichiers ou preuves sont bien accessibles.</p>
                <p>Revisions utilisees : {getRevisionCount(deliveryModal)} / {getMaxRevisionRounds(deliveryModal)}</p>
              </div>

              <div className="delivery-confirmation-list">
                <div>
                  <CheckCircle2 size={16} />
                  <span>J ai consulte la note de livraison et les pieces jointes.</span>
                </div>
                <div>
                  <CheckCircle2 size={16} />
                  <span>Le resultat attendu est complet ou suffisamment conforme.</span>
                </div>
                <div>
                  <CheckCircle2 size={16} />
                  <span>Je comprends que la validation cloture la mission et libere le paiement simule.</span>
                </div>
              </div>

              <form className="modal-form" onSubmit={handleAcceptDelivery}>
                <div className="form-group">
                  <label className="form-label">Commentaire de validation (optionnel)</label>
                  <textarea
                    className="form-textarea"
                    value={deliveryComment}
                    onChange={(event) => setDeliveryComment(event.target.value)}
                    placeholder="Exemple : livraison verifiee, fichiers recus et resultat conforme au brief."
                    rows={4}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeDeliveryModal}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const currentDelivery = deliveryModal;
                      closeDeliveryModal();
                      openRevisionModal(currentDelivery);
                    }}
                    disabled={submitting}
                  >
                    Demander une revision
                  </button>
                  <button type="submit" className="btn btn-accept" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Validation...
                      </>
                    ) : (
                      'Confirmer la livraison'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {revisionModal && (
          <div className="modal-overlay" onClick={closeRevisionModal}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Demander une revision</h2>
                <button className="modal-close" onClick={closeRevisionModal}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
                Precisez le retour attendu sur "{revisionModal.serviceTitle}" pour garder une trace claire dans la timeline.
              </p>
              <p className="revision-limit-copy">
                Revision {getRevisionCount(revisionModal) + 1} sur {getMaxRevisionRounds(revisionModal)}.
              </p>

              <form className="modal-form" onSubmit={handleRevisionRequest}>
                <div className="form-group">
                  <label className="form-label">Retour client</label>
                  <textarea
                    className="form-textarea"
                    value={revisionComment}
                    onChange={(event) => setRevisionComment(event.target.value)}
                    placeholder="Exemple : merci d'ajouter les sources, corriger la couleur principale et renvoyer une version finale."
                    rows={5}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeRevisionModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Envoi...
                      </>
                    ) : (
                      'Envoyer la revision'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {disputeModal && (
          <div className="modal-overlay" onClick={closeDisputeModal}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Ouvrir un litige</h2>
                <button className="modal-close" onClick={closeDisputeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="delivery-confirmation-note">
                <strong>{disputeModal.serviceTitle}</strong>
                <p>Expliquez le probleme de facon factuelle pour aider l admin a arbitrer la mission.</p>
              </div>

              <form className="modal-form" onSubmit={handleOpenDispute}>
                <div className="form-group">
                  <label className="form-label">Motif du litige</label>
                  <textarea
                    className="form-textarea"
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    placeholder="Exemple : la livraison ne correspond pas au brief, les fichiers sources manquent et le delai est depasse."
                    rows={5}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeDisputeModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-refuse" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Ouverture...
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} /> Ouvrir le litige
                      </>
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
