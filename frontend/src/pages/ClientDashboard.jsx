import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClientOrders } from '../api/orderApi';
import { ShoppingBag, Package, MessageSquare, Bell, ArrowRight, Search } from 'lucide-react';
import './Dashboard.css';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getClientOrders().then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const activeOrders = orders.filter(o => o.status === 'IN_PROGRESS');
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');

  const stats = [
    { icon: <Package size={22} />, value: activeOrders.length, label: 'Commandes en cours', color: 'blue' },
    { icon: <ShoppingBag size={22} />, value: completedOrders.length, label: 'Commandes terminées', color: 'green' },
    { icon: <ShoppingBag size={22} />, value: orders.length, label: 'Total commandes', color: 'purple' },
  ];

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
          <h1 className="dashboard-title">
            Bonjour, <span className="gradient-text">{user?.email?.split('@')[0]}</span> 👋
          </h1>
          <p className="dashboard-subtitle">Explorez les services, suivez vos commandes et communiquez avec vos freelances.</p>
        </div>

        <div className="dashboard-stats stagger">
          {stats.map((s, i) => (
            <div className="dash-stat-card animate-fade-in-up" key={i}>
              <div className={`dash-stat-icon ${s.color}`}>{s.icon}</div>
              <div className="dash-stat-info">
                <span className="dash-stat-value">{s.value}</span>
                <span className="dash-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-nav animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/services" className="nav-tab"><Search size={16} /> Explorer les services</Link>
          <Link to="/client/orders" className="nav-tab"><Package size={16} /> Mes Commandes</Link>
          <Link to="/messages" className="nav-tab"><MessageSquare size={16} /> Messages</Link>
          <Link to="/notifications" className="nav-tab"><Bell size={16} /> Notifications</Link>
        </div>

        {orders.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Dernières commandes</h2>
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
                  {orders.slice(0, 5).map(o => (
                    <tr key={o.id}>
                      <td className="td-title">{o.serviceTitle}</td>
                      <td>{o.freelancerId}</td>
                      <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{o.amount} MAD</span></td>
                      <td>{statusBadge(o.status)}</td>
                      <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
