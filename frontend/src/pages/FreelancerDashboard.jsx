import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIncomingRequests } from '../api/userApi';
import { ArrowRight, ClipboardList } from 'lucide-react';
import './Dashboard.css';

export default function FreelancerDashboard() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    getIncomingRequests().then(r => setRequests(r.data)).catch(() => {});
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="dashboard-page">
      <div className="container">
        {pendingRequests.length > 0 ? (
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
        ) : (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <ClipboardList size={48} />
            </div>
            <h3 className="empty-state-title">Aucune demande en attente</h3>
            <p className="empty-state-desc">Les nouvelles demandes client apparaitront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}
