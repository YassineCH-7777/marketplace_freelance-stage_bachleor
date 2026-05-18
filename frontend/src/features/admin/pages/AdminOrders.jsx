import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { getAdminOrders } from '@/api/adminApi';
import { formatAdminDate, formatAdminMoney, getAdminBadgeClass } from '@/utils/adminMeta';
import { getMissionProgress, getOrderStatusMeta, getPaymentStatusMeta } from '@/utils/orderExecution';
import '@/styles/dashboard.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

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
                        <td>{formatAdminDate(order.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ color: 'var(--text-muted)' }}>
                        Aucune commande trouvee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
