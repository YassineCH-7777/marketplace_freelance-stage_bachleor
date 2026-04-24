import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, User, ArrowLeft, Send, Loader2, CheckCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { createOrderRequest } from '../api/orderApi';
import { getActiveServices } from '../api/serviceApi';
import './Services.css';
import './Dashboard.css';

export default function ServiceDetails() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getActiveServices()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const foundService = response.data.find((entry) => entry.id === parseInt(id, 10));
        setService(foundService || null);

        if (foundService) {
          setPrice(String(foundService.price));
        }
      })
      .catch(() => {
        if (isMounted) {
          setService(null);
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
  }, [id]);

  const handleSendRequest = async (event) => {
    event.preventDefault();
    setSending(true);

    try {
      await createOrderRequest({
        serviceId: service.id,
        initialMessage: message,
        proposedPrice: parseFloat(price),
      });
      setSent(true);
    } catch (error) {
      alert(error.response?.data?.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="service-detail-page">
        <div className="container">
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="service-detail-page">
        <div className="container">
          <div className="empty-state">
            <h3 className="empty-state-title">Service introuvable</h3>
            <Link to="/services" className="btn btn-secondary">
              <ArrowLeft size={16} /> Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-detail-page">
      <div className="container">
        <Link
          to="/services"
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '1.5rem', display: 'inline-flex' }}
        >
          <ArrowLeft size={16} /> Retour aux services
        </Link>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)',
            gap: '2rem',
            alignItems: 'flex-start',
          }}
        >
          <div className="service-detail-card animate-fade-in-up">
            <div className="service-detail-badge-row">
              <span className="badge badge-primary">{service.categoryName || 'Service'}</span>
            </div>
            <h1 className="service-detail-title">{service.title}</h1>
            <div className="service-detail-price">{service.price} MAD</div>
            <p className="service-detail-desc">{service.description}</p>

            <div className="service-detail-meta">
              <div className="meta-item">
                <User size={16} />
                <span>{service.freelancerEmail || `Freelance #${service.freelancerId}`}</span>
              </div>
              {service.freelancerCity && (
                <div className="meta-item">
                  <MapPin size={16} />
                  <span>{service.freelancerCity}</span>
                </div>
              )}
            </div>

            <Link to={`/freelancers/${service.freelancerId}`} className="btn btn-secondary">
              <User size={16} /> Voir le profil du freelance
            </Link>
          </div>

          <div className="request-form-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--accent-400)', marginBottom: '1rem' }} />
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Demande envoyee</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  Le freelance recevra votre demande et pourra vous repondre rapidement.
                </p>
              </div>
            ) : !isAuthenticated ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Interesse ?</h3>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 'var(--text-sm)',
                    marginBottom: '1rem',
                  }}
                >
                  Connectez-vous pour envoyer une demande de prestation.
                </p>
                <Link to="/login" className="btn btn-primary">
                  Se connecter
                </Link>
              </div>
            ) : user?.role === 'FREELANCER' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  Vous etes connecte en tant que freelance. Seuls les clients peuvent envoyer des
                  demandes.
                </p>
              </div>
            ) : (
              <>
                <h3>
                  <Send size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> Envoyer une demande
                </h3>
                <form className="request-form" onSubmit={handleSendRequest}>
                  <div className="form-group">
                    <label className="form-label">Message au freelance</label>
                    <textarea
                      className="form-textarea"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      required
                      placeholder="Decrivez votre besoin, vos attentes..."
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prix propose (MAD)</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-accent btn-lg"
                    style={{ width: '100%' }}
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <Loader2 size={18} className="spinner" /> Envoi...
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Envoyer la demande
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
