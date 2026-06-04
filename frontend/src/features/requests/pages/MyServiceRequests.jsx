import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyServiceRequests } from '@/api/requestApi';
import { Plus, FileText, ChevronRight, Zap, MapPin, CheckCircle, X } from 'lucide-react';
import '@/styles/requests.css';

const statusMap = {
  OPEN: { label: 'Ouverte', cls: 'badge-success' },
  IN_DISCUSSION: { label: 'En discussion', cls: 'badge-warning' },
  IN_PROGRESS: { label: 'En cours', cls: 'badge-primary' },
  COMPLETED: { label: 'Terminee', cls: 'badge-success' },
  CANCELLED: { label: 'Annulee', cls: 'badge-muted' },
};

export default function MyServiceRequests() {
  const location = useLocation();
  const refreshRequestsAt = location.state?.refreshRequestsAt;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(() => location.state?.message || '');

  useEffect(() => {
    let isMounted = true;

    getMyServiceRequests()
      .then(r => {
        if (isMounted) setRequests(r.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshRequestsAt]);

  return (
    <div className="requests-page"><div className="container">
      <div className="my-requests-header animate-fade-in-up">
        <h1>Mes demandes</h1>
        <Link to="/client/requests/new" className="btn btn-primary"><Plus size={16} /> Nouvelle demande</Link>
      </div>
      {successMessage && (
        <div className="request-success-banner animate-fade-in">
          <CheckCircle size={16} /> {successMessage}
          <button type="button" onClick={() => setSuccessMessage('')} aria-label="Fermer"><X size={14} /></button>
        </div>
      )}
      {loading ? (
        <div className="requests-loading animate-fade-in"><div className="spinner-dots"><span /><span /><span /></div></div>
      ) : requests.length === 0 ? (
        <div className="requests-empty animate-fade-in-up">
          <FileText size={48} /><h3>Aucune demande publiee</h3><p>Publiez votre premier besoin pour recevoir des candidatures.</p>
          <Link to="/client/requests/new" className="btn btn-primary"><Plus size={16} /> Publier une demande</Link>
        </div>
      ) : (
        <div className="my-requests-list stagger">
          {requests.map(req => {
            const st = statusMap[req.status] || { label: req.status, cls: '' };
            return (
              <Link key={req.id} to={`/requests/${req.id}`} className="my-request-item animate-fade-in-up">
                <div className="my-request-info">
                  <h3>{req.title}</h3>
                  <div className="my-request-meta">
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {req.urgent && <span className="badge badge-urgent"><Zap size={10} /> Urgent</span>}
                    {req.city && <span className="request-meta-item"><MapPin size={12} /> {req.city}</span>}
                    <span className="request-meta-item">{req.proposalCount || 0} candidature{(req.proposalCount || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <ChevronRight size={18} />
              </Link>
            );
          })}
        </div>
      )}
    </div></div>
  );
}
