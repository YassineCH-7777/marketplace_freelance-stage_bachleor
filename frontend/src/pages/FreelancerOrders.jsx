import { useState, useEffect } from 'react';
import { getFreelancerOrders } from '../api/userApi';
import { Package, Loader2, Inbox } from 'lucide-react';
import './Dashboard.css';

export default function FreelancerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFreelancerOrders()
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <p className="dashboard-subtitle">Suivez l'avancement de vos commandes en cours.</p>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Inbox size={48} /></div>
            <h3 className="empty-state-title">Aucune commande</h3>
            <p className="empty-state-desc">Vous n'avez pas encore de commandes. Acceptez des demandes pour en recevoir !</p>
          </div>
        ) : (
          <div className="dash-table-wrapper animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="td-title">{o.serviceTitle}</td>
                    <td>{o.clientEmail}</td>
                    <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{o.amount} MAD</span></td>
                    <td>{statusBadge(o.status)}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
