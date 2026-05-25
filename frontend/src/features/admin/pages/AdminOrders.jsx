import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, RotateCcw, X } from 'lucide-react';
import { getAdminOrders, resolveAdminOrderDispute } from '@/api/adminApi';
import { formatAdminDate, formatAdminMoney, getAdminBadgeClass } from '@/utils/adminMeta';
import { getMissionProgress, getOrderStatusMeta, getPaymentStatusMeta } from '@/utils/orderExecution';
import '@/styles/dashboard.css';

const disputeActionLabels = {
  ARBITRATE: 'Arbitrer',
  REFUND: 'Rembourser',
  CLOSE: 'Cloturer',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [decisionModal, setDecisionModal] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getAdminOrders()
      .then((response) => {
        if (isMounted) setOrders(response.data);
      })
      .catch(() => {
        if (isMounted) setOrders([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderStatusFilter === 'ALL' || order.status === orderStatusFilter),
    [orderStatusFilter, orders],
  );

  const openDecisionModal = (order, action) => {
    setDecisionModal({ order, action });
    setDecisionNotes(order.disputeAdminNotes || '');
  };

  const closeDecisionModal = () => {
    setDecisionModal(null);
    setDecisionNotes('');
    setSubmittingDecision(false);
  };

  const handleDisputeDecision = async (event) => {
    event.preventDefault();
    if (!decisionModal) {
      return;
    }

    setSubmittingDecision(true);
    try {
      const response = await resolveAdminOrderDispute(decisionModal.order.id, {
        action: decisionModal.action,
        adminNotes: decisionNotes,
      });
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === response.data.id ? response.data : order)),
      );
      alert(`Litige ${disputeActionLabels[decisionModal.action].toLowerCase()} avec succes.`);
      closeDecisionModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la decision de litige');
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <ClipboardList size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Commandes
          </h1>
          <p className="dashboard-subtitle">Suivez les missions et leurs statuts de paiement et livraison.</p>
        </div>

        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <ClipboardList size={15} /> Commandes
              </span>
              <h2>Suivi des missions</h2>
            </div>
            <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="ACCEPTED">Validees</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="WAITING_CLIENT">Attente client</option>
              <option value="DELIVERED">Livrees</option>
              <option value="REVISION">Revision</option>
              <option value="COMPLETED">Terminees</option>
              <option value="CANCELLED">Annulees</option>
              <option value="DISPUTED">Litiges</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">
              <Loader2 size={32} className="spinner" />
            </div>
          ) : (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Client</th>
                    <th>Freelance</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Progression</th>
                    <th>Paiement</th>
                    <th>Litige</th>
                    <th>Actions</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="td-title">
                          #{order.id} {order.serviceTitle}
                        </td>
                        <td>{order.clientEmail}</td>
                        <td>{order.freelancerEmail}</td>
                        <td>{formatAdminMoney(order.amount)}</td>
                        <td>
                          <span className={`badge ${getAdminBadgeClass(order.status)}`}>
                            {getOrderStatusMeta(order.status).label}
                          </span>
                        </td>
                        <td>{getMissionProgress(order)}%</td>
                        <td>
                          <span className={`badge ${getPaymentStatusMeta(order.paymentStatus).badgeClass}`}>
                            {getPaymentStatusMeta(order.paymentStatus).label}
                          </span>
                        </td>
                        <td>
                          {order.disputeReason ? (
                            <div className="admin-dispute-cell">
                              <strong>{order.disputeReason}</strong>
                              {order.disputeOpenedByEmail && <span>Par {order.disputeOpenedByEmail}</span>}
                              {order.disputeAdminNotes && <span>Admin : {order.disputeAdminNotes}</span>}
                            </div>
                          ) : (
                            <span className="admin-muted-line">Aucun</span>
                          )}
                        </td>
                        <td>
                          {order.status === 'DISPUTED' ? (
                            <div className="admin-order-actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={() => openDecisionModal(order, 'ARBITRATE')}
                              >
                                <AlertTriangle size={13} /> Arbitrer
                              </button>
                              <button
                                type="button"
                                className="btn btn-refuse btn-xs"
                                onClick={() => openDecisionModal(order, 'REFUND')}
                              >
                                <RotateCcw size={13} /> Rembourser
                              </button>
                              <button
                                type="button"
                                className="btn btn-accept btn-xs"
                                onClick={() => openDecisionModal(order, 'CLOSE')}
                              >
                                <CheckCircle2 size={13} /> Cloturer
                              </button>
                            </div>
                          ) : order.disputeResolution ? (
                            <span className={`badge ${getAdminBadgeClass(order.disputeResolution)}`}>
                              {order.disputeResolution}
                            </span>
                          ) : (
                            <span className="admin-muted-line">-</span>
                          )}
                        </td>
                        <td>{formatAdminDate(order.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ color: 'var(--text-muted)' }}>
                        Aucune commande trouvee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {decisionModal && (
          <div className="modal-overlay" onClick={closeDecisionModal}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{disputeActionLabels[decisionModal.action]} le litige</h2>
                <button className="modal-close" onClick={closeDecisionModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="delivery-confirmation-note">
                <strong>Mission #{decisionModal.order.id} - {decisionModal.order.serviceTitle}</strong>
                <p>{decisionModal.order.disputeReason}</p>
              </div>

              <form className="modal-form" onSubmit={handleDisputeDecision}>
                <div className="form-group">
                  <label className="form-label">
                    {decisionModal.action === 'ARBITRATE' ? 'Notes d arbitrage' : 'Notes admin'}
                  </label>
                  <textarea
                    className="form-textarea"
                    value={decisionNotes}
                    onChange={(event) => setDecisionNotes(event.target.value)}
                    placeholder="Expliquez la decision pour garder une trace claire dans la mission."
                    rows={5}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeDecisionModal}>
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={decisionModal.action === 'REFUND' ? 'btn btn-refuse' : 'btn btn-primary'}
                    disabled={submittingDecision}
                  >
                    {submittingDecision ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Traitement...
                      </>
                    ) : (
                      disputeActionLabels[decisionModal.action]
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
