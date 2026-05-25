import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProposals, withdrawProposal } from '@/api/requestApi';
import { FileText, ChevronRight, Coins, Clock, ListChecks, XCircle } from 'lucide-react';
import '@/styles/requests.css';

const statusMap = {
  PENDING: { label: 'En attente', cls: 'badge-warning' },
  ACCEPTED: { label: 'Acceptee', cls: 'badge-success' },
  REJECTED: { label: 'Rejetee', cls: 'badge-danger' },
  WITHDRAWN: { label: 'Retiree', cls: 'badge-muted' },
};

export default function MyProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getMyProposals();
      setProposals(response.data);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    getMyProposals()
      .then((response) => {
        if (isMounted) {
          setProposals(response.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProposals([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Retirer cette candidature ?')) return;
    try {
      await withdrawProposal(id);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || 'Impossible de retirer cette candidature.');
    }
  };

  return (
    <div className="requests-page"><div className="container">
      <div className="my-requests-header animate-fade-in-up"><h1>Mes candidatures</h1></div>
      {loading ? (
        <div className="requests-loading animate-fade-in"><div className="spinner-dots"><span /><span /><span /></div></div>
      ) : proposals.length === 0 ? (
        <div className="requests-empty animate-fade-in-up">
          <FileText size={48} /><h3>Aucune candidature</h3><p>Parcourez les demandes et postulez pour commencer.</p>
          <Link to="/requests" className="btn btn-primary">Voir les demandes</Link>
        </div>
      ) : (
        <div className="my-requests-list stagger">
          {proposals.map(p => {
            const st = statusMap[p.status] || { label: p.status, cls: '' };
            return (
              <div key={p.id} className="my-request-item animate-fade-in-up">
                <Link to={`/requests/${p.serviceRequestId}`} className="my-request-info" style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <h3>{p.serviceRequestTitle}</h3>
                  <div className="my-request-meta">
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    <span className="request-meta-item"><Coins size={12} /> {p.proposedPrice} MAD</span>
                    <span className="request-meta-item"><Clock size={12} /> {p.estimatedDays} jours</span>
                  </div>
                  {p.proposedSteps?.length > 0 && (
                    <div className="my-proposal-steps">
                      <ListChecks size={13} />
                      <span>{p.proposedSteps.slice(0, 2).join(' / ')}</span>
                    </div>
                  )}
                </Link>
                <div className="my-proposal-actions">
                  {p.status === 'PENDING' && (
                    <button className="btn btn-sm btn-reject" onClick={() => handleWithdraw(p.id)}><XCircle size={12} /> Retirer</button>
                  )}
                  <Link to={`/requests/${p.serviceRequestId}`}><ChevronRight size={18} /></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div></div>
  );
}
