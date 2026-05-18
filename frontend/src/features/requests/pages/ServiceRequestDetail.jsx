import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { getRequestDetail } from '@/api/requestApi';
import { getServiceRequestDetail, acceptProposal, rejectProposal, closeServiceRequest } from '@/api/requestApi';
import { submitProposal } from '@/api/requestApi';
import AttachmentList from '@/components/common/AttachmentList';
import { MapPin, Calendar, Coins, Zap, Star, CheckCircle, XCircle, Clock, Send, Award, X, Paperclip } from 'lucide-react';
import '@/styles/requests.css';

export default function ServiceRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Proposal form
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [proposalError, setProposalError] = useState('');

  const isOwner = user && request && user.id === request.clientId;
  const isFreelancer = user && user.role === 'FREELANCER';
  const alreadyApplied = request?.proposals?.some(p => p.freelancerId === user?.id);
  const requestId = request?.id;
  const requestClientId = request?.clientId;
  const userId = user?.id;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Try public first
        const response = await getRequestDetail(id);
        setRequest(response.data);
      } catch {
        setError('Demande introuvable');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Reload with client detail if owner
  useEffect(() => {
    let isMounted = true;

    if (requestId && userId === requestClientId) {
      getServiceRequestDetail(id)
        .then((response) => {
          if (isMounted) {
            setRequest(response.data);
          }
        })
        .catch(() => undefined);
    }
    return () => {
      isMounted = false;
    };
  }, [id, requestClientId, requestId, userId]);

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setProposalError('');
    setSubmitting(true);
    try {
      await submitProposal({
        serviceRequestId: Number(id),
        message: proposalMessage,
        proposedPrice: Number(proposedPrice),
        estimatedDays: Number(estimatedDays),
        portfolioUrl: portfolioUrl || null,
      });
      setSuccessMessage('Votre candidature a ete envoyee !');
      setShowProposalForm(false);
      // Reload
      const r = await getRequestDetail(id);
      setRequest(r.data);
    } catch (err) {
      setProposalError(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptProposal = async (proposalId) => {
    setActionLoading(proposalId);
    try {
      await acceptProposal(id, proposalId);
      setSuccessMessage('Proposition acceptee ! Une mission a ete creee.');
      const r = await getServiceRequestDetail(id);
      setRequest(r.data);
    } catch (err) {
      setProposalError(err.response?.data?.message || 'Erreur lors de l\'acceptation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProposal = async (proposalId) => {
    setActionLoading(proposalId);
    try {
      await rejectProposal(id, proposalId);
      const r = await getServiceRequestDetail(id);
      setRequest(r.data);
    } catch (err) {
      setProposalError(err.response?.data?.message || 'Erreur lors du rejet.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseRequest = async () => {
    if (!window.confirm('Cloturer cette demande ? Les candidatures en attente seront automatiquement rejetees.')) return;
    try {
      await closeServiceRequest(id);
      setSuccessMessage('Demande cloturee.');
      const r = await getServiceRequestDetail(id);
      setRequest(r.data);
    } catch (err) {
      setProposalError(err.response?.data?.message || 'Erreur.');
    }
  };

  const formatBudget = (min, max) => {
    if (min && max) return `${min} - ${max} MAD`;
    if (min) return `A partir de ${min} MAD`;
    if (max) return `Jusqu'a ${max} MAD`;
    return 'Non specifie';
  };

  const statusLabel = (status) => {
    const map = {
      PENDING: { label: 'En attente', cls: 'badge-warning' },
      ACCEPTED: { label: 'Acceptee', cls: 'badge-success' },
      REJECTED: { label: 'Rejetee', cls: 'badge-danger' },
      WITHDRAWN: { label: 'Retiree', cls: 'badge-muted' },
    };
    const s = map[status] || { label: status, cls: 'badge-primary' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  if (loading) return (
    <div className="requests-page"><div className="container"><div className="requests-loading animate-fade-in"><div className="spinner-dots"><span /><span /><span /></div><p>Chargement...</p></div></div></div>
  );
  if (error || !request) return (
    <div className="requests-page"><div className="container"><div className="requests-empty animate-fade-in-up"><h3>{error || 'Demande introuvable'}</h3></div></div></div>
  );

  return (
    <div className="requests-page">
      <div className="container">
        {successMessage && (
          <div className="request-success-banner animate-fade-in">
            <CheckCircle size={16} /> {successMessage}
            <button type="button" onClick={() => setSuccessMessage('')}><X size={14} /></button>
          </div>
        )}

        <div className="request-detail animate-fade-in-up">
          <div className="request-detail-main">
            <div className="request-detail-header">
              <div>
                <h1>{request.title}</h1>
                <div className="request-detail-badges">
                  <span className="badge badge-primary">{request.categoryName}</span>
                  {request.urgent && <span className="badge badge-urgent"><Zap size={10} /> Urgent</span>}
                  {request.remote && <span className="badge badge-remote">Remote</span>}
                  <span className={`badge badge-status-${request.status?.toLowerCase()}`}>{request.status}</span>
                </div>
              </div>
            </div>

            <div className="request-detail-description">
              <h3>Description du projet</h3>
              <p>{request.description}</p>
            </div>

            {request.attachments?.length > 0 && (
              <div className="request-detail-attachments">
                <h3><Paperclip size={16} /> Brief et pieces jointes</h3>
                <AttachmentList attachments={request.attachments} />
              </div>
            )}

            {request.requiredSkills && request.requiredSkills.length > 0 && (
              <div className="request-detail-skills">
                <h3>Competences requises</h3>
                <div className="request-skills-list">
                  {request.requiredSkills.map((skill, i) => (
                    <span key={i} className="request-skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Proposal form for freelancers */}
            {isFreelancer && !isOwner && !alreadyApplied && request.status === 'OPEN' && (
              <div className="request-proposal-section">
                {!showProposalForm ? (
                  <button className="btn btn-primary btn-lg" onClick={() => setShowProposalForm(true)}>
                    <Send size={16} /> Postuler a cette demande
                  </button>
                ) : (
                  <form className="request-proposal-form" onSubmit={handleSubmitProposal}>
                    <h3><Send size={16} /> Ma candidature</h3>
                    {proposalError && <div className="form-error">{proposalError}</div>}
                    <div className="form-group">
                      <label className="form-label">Message de candidature *</label>
                      <textarea className="form-input" rows={4} value={proposalMessage} onChange={(e) => setProposalMessage(e.target.value)} placeholder="Decrivez votre approche et pourquoi vous etes le bon choix..." required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Prix propose (MAD) *</label>
                        <input type="number" className="form-input" value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} placeholder="Ex: 5000" required min="0" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Delai estime (jours) *</label>
                        <input type="number" className="form-input" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} placeholder="Ex: 14" required min="1" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Lien portfolio (optionnel)</label>
                      <input type="url" className="form-input" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Envoi...' : 'Envoyer ma candidature'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowProposalForm(false)}>Annuler</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {isFreelancer && alreadyApplied && (
              <div className="request-already-applied">
                <CheckCircle size={16} /> Vous avez deja postule a cette demande.
              </div>
            )}

            {/* Proposals comparison table (client owner view) */}
            {isOwner && request.proposals && (
              <div className="request-proposals-section">
                <div className="request-proposals-header">
                  <h3><Award size={18} /> Candidatures ({request.proposals.length})</h3>
                  {(request.status === 'OPEN' || request.status === 'IN_DISCUSSION' || request.status === 'IN_PROGRESS') && (
                    <button className="btn btn-secondary btn-sm" onClick={handleCloseRequest}>Cloturer la demande</button>
                  )}
                </div>
                {proposalError && <div className="form-error" style={{ marginBottom: '1rem' }}>{proposalError}</div>}
                {request.proposals.length === 0 ? (
                  <p className="request-proposals-empty">Aucune candidature recue pour le moment.</p>
                ) : (
                  <div className="proposals-table-wrapper">
                    <table className="proposals-table">
                      <thead>
                        <tr>
                          <th>Freelance</th>
                          <th>Prix</th>
                          <th>Delai</th>
                          <th>Note</th>
                          <th>Ville</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {request.proposals.map((p) => (
                          <tr key={p.id} className={`proposal-row proposal-row-${p.status?.toLowerCase()}`}>
                            <td>
                              <div className="proposal-freelancer">
                                <strong>{p.freelancerFirstName} {p.freelancerLastName}</strong>
                                {p.freelancerHeadline && <small>{p.freelancerHeadline}</small>}
                              </div>
                            </td>
                            <td className="proposal-price">{p.proposedPrice} MAD</td>
                            <td>{p.estimatedDays} j</td>
                            <td>
                              <span className="proposal-rating">
                                <Star size={12} /> {p.freelancerRating || '—'}
                              </span>
                            </td>
                            <td>{p.freelancerCity || '—'}</td>
                            <td>{statusLabel(p.status)}</td>
                            <td className="proposal-actions">
                              {p.status === 'PENDING' && (
                                <>
                                  <button
                                    className="btn btn-sm btn-accept"
                                    disabled={actionLoading === p.id}
                                    onClick={() => handleAcceptProposal(p.id)}
                                  >
                                    <CheckCircle size={12} /> Accepter
                                  </button>
                                  <button
                                    className="btn btn-sm btn-reject"
                                    disabled={actionLoading === p.id}
                                    onClick={() => handleRejectProposal(p.id)}
                                  >
                                    <XCircle size={12} /> Rejeter
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="request-detail-sidebar">
            <div className="request-sidebar-card">
              <h4>Details du projet</h4>
              <ul className="request-sidebar-list">
                <li><Coins size={14} /> <span>Budget</span><strong>{formatBudget(request.budgetMin, request.budgetMax)}</strong></li>
                {request.deadline && <li><Calendar size={14} /> <span>Echeance</span><strong>{new Date(request.deadline).toLocaleDateString('fr-FR')}</strong></li>}
                {request.city && <li><MapPin size={14} /> <span>Ville</span><strong>{request.city}</strong></li>}
                <li><Clock size={14} /> <span>Publiee le</span><strong>{new Date(request.createdAt).toLocaleDateString('fr-FR')}</strong></li>
              </ul>
            </div>

            <div className="request-sidebar-card">
              <h4>Publiee par</h4>
              <div className="request-client-info">
                <strong>{request.clientFirstName} {request.clientLastName}</strong>
                {request.clientCity && <span><MapPin size={12} /> {request.clientCity}</span>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
