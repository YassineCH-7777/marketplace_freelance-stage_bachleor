import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClientOrders } from '@/api/orderApi';
import { ArrowRight, Package } from 'lucide-react';
import { getOrderStatusMeta } from '@/utils/orderExecution';
import '@/styles/dashboard.css';

export default function ClientDashboard() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getClientOrders().then((response) => setOrders(response.data)).catch(() => {});
  }, []);

  const statusBadge = (status) => {
    const statusMeta = getOrderStatusMeta(status);
    return <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>;
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        {orders.length > 0 ? (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Dernieres commandes</h2>
              <Link to="/client/orders" className="btn btn-secondary btn-sm">Voir tout <ArrowRight size={14} /></Link>
            </div>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Freelance</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td className="td-title">{order.serviceTitle}</td>
                      <td>{order.freelancerEmail || order.freelancerId}</td>
                      <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{order.amount} MAD</span></td>
                      <td>{statusBadge(order.status)}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Package size={48} />
            </div>
            <h3 className="empty-state-title">Aucune commande pour le moment</h3>
            <p className="empty-state-desc">Vos commandes recentes apparaitront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}
