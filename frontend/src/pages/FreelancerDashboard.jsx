import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getFreelancerOrders, getIncomingRequests } from '../api/userApi';
import { Briefcase, ClipboardList, Star, TrendingUp, ArrowRight, Package, UserCheck } from 'lucide-react';
import './Dashboard.css';

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getIncomingRequests().then(r => setRequests(r.data)).catch(() => {});
    getFreelancerOrders().then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const activeOrders = orders.filter(o => o.status === 'IN_PROGRESS');

  const stats = [
    { icon: <ClipboardList size={22} />, value: pendingRequests.length, label: 'Demandes en attente', color: 'yellow' },
    { icon: <Package size={22} />, value: activeOrders.length, label: 'Commandes en cours', color: 'blue' },
    { icon: <Briefcase size={22} />, value: orders.length, label: 'Total commandes', color: 'purple' },
    { icon: <TrendingUp size={22} />, value: requests.filter(r => r.status === 'ACCEPTED').length, label: 'Demandes acceptées', color: 'green' },
  ];

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            Bienvenue, <span className="gradient-text">{user?.email?.split('@')[0]}</span> 👋
          </h1>
          <p className="dashboard-subtitle">Gérez vos services, demandes et commandes depuis votre tableau de bord.</p>
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
          <Link to="/freelancer/services" className="nav-tab"><Briefcase size={16} /> Mes Services</Link>
          <Link to="/freelancer/requests" className="nav-tab"><ClipboardList size={16} /> Demandes Reçues</Link>
          <Link to="/freelancer/orders" className="nav-tab"><Package size={16} /> Commandes</Link>
          <Link to="/freelancer/profile" className="nav-tab"><UserCheck size={16} /> Mon Profil</Link>
          <Link to="/freelancer/reviews" className="nav-tab"><Star size={16} /> Avis Reçus</Link>
        </div>

        {/* Recent Requests */}
        {pendingRequests.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Dernières demandes</h2>
              <Link to="/freelancer/requests" className="btn btn-secondary btn-sm">Voir tout <ArrowRight size={14} /></Link>
            </div>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Client</th>
                    <th>Prix proposé</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.slice(0, 5).map(req => (
                    <tr key={req.id}>
                      <td className="td-title">{req.serviceTitle}</td>
                      <td>{req.clientEmail}</td>
                      <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{req.proposedPrice} MAD</span></td>
                      <td>{new Date(req.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <Link to="/freelancer/requests" className="btn btn-sm btn-edit">Gérer</Link>
                      </td>
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
