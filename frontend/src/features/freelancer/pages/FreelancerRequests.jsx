import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncomingRequests, acceptRequest, refuseRequest } from '@/api/userApi';
import { createConversation } from '@/api/messageApi';
import { ClipboardList, Check, X, Loader2, Inbox, MessageSquare } from 'lucide-react';
import '@/styles/dashboard.css';

export default function FreelancerRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [messageLoading, setMessageLoading] = useState(null);
  const [actionError, setActionError] = useState('');

  const fetchRequests = () => {
    setLoading(true);
    getIncomingRequests()
      .then(r => setRequests(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAccept = async (id) => {
    setActionError('');
    setActionLoading(id);
    try {
      await acceptRequest(id);
      fetchRequests();
    } catch { setActionError('Erreur lors de l acceptation de la demande.'); }
    finally { setActionLoading(null); }
  };

  const handleRefuse = async (id) => {
    if (!window.confirm('Refuser cette demande ?')) return;
    setActionError('');
    setActionLoading(id);
    try {
      await refuseRequest(id);
      fetchRequests();
    } catch { setActionError('Erreur lors du refus de la demande.'); }
    finally { setActionLoading(null); }
  };

  const handleMessageClient = async (request) => {
    setActionError('');
    setMessageLoading(request.id);
    try {
      const response = await createConversation(request.clientId, 'CLIENT');
      navigate('/messages', { state: { conversationId: response.data.id } });
    } catch (error) {
      setActionError(error.response?.data?.message || 'Erreur lors de la creation de la conversation');
    } finally {
      setMessageLoading(null);
    }
  };

  const statusBadge = (status) => {
    const map = {
      PENDING: { cls: 'badge-warning', label: 'En attente' },
      ACCEPTED: { cls: 'badge-success', label: 'Acceptée' },
      REJECTED: { cls: 'badge badge-warning', label: 'Refusée' },
    };
    const s = map[status] || { cls: 'badge-primary', label: status };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title"><ClipboardList size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Demandes Reçues</h1>
          <p className="dashboard-subtitle">Traitez les demandes de prestation envoyées par vos clients.</p>
        </div>

        {actionError && <p className="form-error">{actionError}</p>}

        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : requests.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Inbox size={48} /></div>
            <h3 className="empty-state-title">Aucune demande</h3>
            <p className="empty-state-desc">Vous n'avez pas encore reçu de demandes de clients. Publiez des services attractifs pour les attirer !</p>
          </div>
        ) : (
          <div className="dash-table-wrapper animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Message</th>
                  <th>Prix</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td className="td-title">{req.serviceTitle}</td>
                    <td>{req.clientEmail}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.initialMessage}</td>
                    <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{req.proposedPrice} MAD</span></td>
                    <td>{statusBadge(req.status)}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {req.status === 'PENDING' ? (
                        <div className="action-btns">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleMessageClient(req)}
                            disabled={messageLoading === req.id}
                          >
                            {messageLoading === req.id ? (
                              <Loader2 size={14} className="spinner" />
                            ) : (
                              <MessageSquare size={14} />
                            )}
                            Message
                          </button>
                          <button className="btn btn-sm btn-accept" onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id}>
                            {actionLoading === req.id ? <Loader2 size={14} className="spinner" /> : <><Check size={14} /> Accepter</>}
                          </button>
                          <button className="btn btn-sm btn-refuse" onClick={() => handleRefuse(req.id)} disabled={actionLoading === req.id}>
                            <X size={14} /> Refuser
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleMessageClient(req)}
                          disabled={messageLoading === req.id}
                        >
                          {messageLoading === req.id ? (
                            <Loader2 size={14} className="spinner" />
                          ) : (
                            <MessageSquare size={14} />
                          )}
                          Message
                        </button>
                      )}
                    </td>
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
