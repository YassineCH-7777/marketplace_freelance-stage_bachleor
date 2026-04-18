import { useState, useEffect } from 'react';
import { getClientOrders } from '../api/orderApi';
import { leaveReview } from '../api/reviewApi';
import { Package, Loader2, Inbox, Star, X } from 'lucide-react';
import './Dashboard.css';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    getClientOrders()
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leaveReview({ orderId: reviewModal.id, rating, comment });
      alert('Avis envoyé avec succès !');
      setReviewModal(null);
      setRating(5);
      setComment('');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      IN_PROGRESS: { cls: 'badge-primary', label: 'En cours' },
      COMPLETED: { cls: 'badge-success', label: 'Terminée' },
      CANCELLED: { cls: 'badge-warning', label: 'Annulée' },
      PENDING: { cls: 'badge-warning', label: 'En attente' },
    };
    const s = map[status] || { cls: 'badge-primary', label: status };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title"><Package size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Mes Commandes</h1>
          <p className="dashboard-subtitle">Suivez vos commandes et laissez un avis une fois terminées.</p>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Inbox size={48} /></div>
            <h3 className="empty-state-title">Aucune commande</h3>
            <p className="empty-state-desc">Explorez les services et envoyez une demande pour passer votre première commande.</p>
          </div>
        ) : (
          <div className="dash-table-wrapper animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="td-title">{o.serviceTitle}</td>
                    <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{o.amount} MAD</span></td>
                    <td>{statusBadge(o.status)}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {o.status === 'COMPLETED' ? (
                        <button className="btn btn-sm btn-accept" onClick={() => setReviewModal(o)}>
                          <Star size={14} /> Laisser un avis
                        </button>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div className="modal-overlay" onClick={() => setReviewModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Laisser un avis</h2>
                <button className="modal-close" onClick={() => setReviewModal(null)}><X size={20} /></button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
                Évaluez la prestation pour « {reviewModal.serviceTitle} »
              </p>
              <form className="modal-form" onSubmit={handleReview}>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: n <= rating ? 'var(--warning)' : 'var(--gray-700)',
                          fontSize: '1.5rem', padding: '0.25rem',
                        }}
                      >
                        <Star size={24} fill={n <= rating ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Commentaire (optionnel)</label>
                  <textarea className="form-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Partagez votre expérience..." rows={3} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setReviewModal(null)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><Loader2 size={16} className="spinner" /> Envoi...</> : 'Envoyer l\'avis'}
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
