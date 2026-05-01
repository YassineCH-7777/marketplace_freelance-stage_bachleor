import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Star,
  Tag,
  User,
  XCircle,
} from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import { createOrderRequest } from '@/api/orderApi';
import { createConversation } from '@/api/messageApi';
import { getActiveServices } from '@/api/serviceApi';
import {
  getDeliveryTimeLabel,
  getExecutionModeLabel,
  getExecutionModeTone,
  getServiceLocationLabel,
} from '@/utils/serviceMeta';
import {
  getServiceCoverImageUrl,
  getServiceGalleryImageUrls,
  parseServiceDescription,
  stripServiceMediaSection,
} from '@/utils/serviceDescription';
import '@/styles/services.css';
import '@/styles/dashboard.css';

const FREELANCER_NAMES = {
  'freelance1@marketplace.com': 'Yassine Freelancer',
  'freelance2@marketplace.com': 'Mahmoud Freelancer',
  'yassine@freelance.com': 'Yassine Freelancer',
  'sophie@freelance.com': 'Sophie Freelancer',
};

const FREELANCER_RATINGS = {
  'freelance1@marketplace.com': '5.0',
  'freelance2@marketplace.com': '4.8',
  'yassine@freelance.com': '5.0',
  'sophie@freelance.com': '4.8',
};

function getFreelancerName(service) {
  const email = service?.freelancerEmail || '';
  if (FREELANCER_NAMES[email]) {
    return FREELANCER_NAMES[email];
  }

  const name = email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Freelance local';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getRating(service) {
  return FREELANCER_RATINGS[service?.freelancerEmail] || '4.8';
}

function formatPrice(value) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

const DESCRIPTION_SECTION_META = {
  'Ce qui est inclus': { icon: CheckCircle, tone: 'is-positive' },
  "Ce qui n'est pas inclus": { icon: XCircle, tone: 'is-muted' },
  Tarification: { icon: CreditCard, tone: 'is-pricing' },
  'Disponibilite et delais': { icon: Clock, tone: 'is-planning' },
  'Conditions du service': { icon: ShieldCheck, tone: 'is-conditions' },
  'Sous-categorie': { icon: Tag, tone: 'is-category' },
};

function getDescriptionSectionMeta(title) {
  return DESCRIPTION_SECTION_META[title] || { icon: FileText, tone: 'is-neutral' };
}

function ServiceInfoSection({ section }) {
  const { icon: Icon, tone } = getDescriptionSectionMeta(section.title);

  return (
    <article className={`service-info-panel ${tone}`}>
      <div className="service-info-panel-head">
        <span className="service-info-panel-icon">
          <Icon size={17} />
        </span>
        <h3>{section.title}</h3>
      </div>
      <div className="service-info-items">
        {section.items.map((item, index) => (
          item.label ? (
            <div className="service-info-row" key={`${section.title}-${item.raw}-${index}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ) : (
            <div className="service-info-bullet" key={`${section.title}-${item.raw}-${index}`}>
              <CheckCircle size={14} />
              <p>{item.value}</p>
            </div>
          )
        ))}
      </div>
    </article>
  );
}

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [sending, setSending] = useState(false);
  const [contacting, setContacting] = useState(false);
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

  const handleContactFreelancer = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'CLIENT') {
      alert('Seuls les clients peuvent contacter un freelance depuis un service.');
      return;
    }

    setContacting(true);
    try {
      const response = await createConversation(service.freelancerId, 'FREELANCER');
      navigate('/messages', { state: { conversationId: response.data.id } });
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la creation de la conversation');
    } finally {
      setContacting(false);
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

  const coverImageUrl = getServiceCoverImageUrl(service);
  const galleryImageUrls = getServiceGalleryImageUrls(service).filter((imageUrl) => imageUrl !== coverImageUrl);
  const serviceDescription = stripServiceMediaSection(service.description);
  const descriptionContent = parseServiceDescription(serviceDescription);
  const freelancerName = getFreelancerName(service);
  const locationLabel = getServiceLocationLabel(service);
  const deliveryLabel = getDeliveryTimeLabel(service.deliveryTimeDays);
  const executionModeLabel = getExecutionModeLabel(service.executionMode);
  const formattedPrice = formatPrice(service.price);
  const trustItems = [
    'Brief clair avant demarrage',
    'Budget visible avant contact',
    'Conversation integree a la plateforme',
  ];

  return (
    <div className="service-detail-page">
      <div className="container service-detail-shell">
        <Link to="/services" className="service-detail-back">
          <ArrowLeft size={16} /> Retour aux services
        </Link>

        <div className="service-detail-layout">
          <div className="service-detail-card animate-fade-in-up">
            <div className="service-detail-badge-row">
              <span className="badge badge-primary">{service.categoryName || 'Service'}</span>
              <span className={`service-chip ${getExecutionModeTone(service.executionMode)}`}>
                {executionModeLabel}
              </span>
              <span className="service-chip">
                <Clock size={13} />
                {deliveryLabel}
              </span>
            </div>

            <h1 className="service-detail-title">{service.title}</h1>

            <div className="service-detail-provider">
              <div className="service-detail-avatar">{getInitials(freelancerName)}</div>
              <div>
                <strong>{freelancerName}</strong>
                <span>{service.freelancerEmail || `Freelance #${service.freelancerId}`}</span>
              </div>
              <div className="service-detail-rating">
                <Star size={14} />
                {getRating(service)}
              </div>
            </div>

            <div className="service-detail-media">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="" className="service-detail-cover" />
              ) : (
                <div className="service-detail-cover-placeholder">
                  <FileText size={30} />
                  <span>Presentation du service</span>
                </div>
              )}
            </div>

            {galleryImageUrls.length > 0 && (
              <div className="service-detail-gallery" aria-label="Galerie du service">
                {galleryImageUrls.map((imageUrl) => (
                  <img src={imageUrl} alt="" key={imageUrl} />
                ))}
              </div>
            )}

            <div className="service-detail-meta">
              <div className="meta-item">
                <CreditCard size={17} />
                <span>Budget</span>
                <strong>{formattedPrice} MAD</strong>
              </div>
              <div className="meta-item">
                <MapPin size={16} />
                <span>Localisation</span>
                <strong>{locationLabel}</strong>
              </div>
              <div className="meta-item">
                <Clock size={16} />
                <span>Delai</span>
                <strong>{deliveryLabel}</strong>
              </div>
              <div className="meta-item">
                <Tag size={16} />
                <span>Mode</span>
                <strong>{executionModeLabel}</strong>
              </div>
            </div>

            <section className="service-detail-section">
              <div className="service-detail-section-head">
                <FileText size={18} />
                <h2>Informations sur le service</h2>
              </div>
              <div className="service-detail-overview">
                {descriptionContent.intro.length > 0 && (
                  <div className="service-detail-desc">
                    {descriptionContent.intro.map((block) => (
                      <p key={block}>{block}</p>
                    ))}
                  </div>
                )}

                {descriptionContent.sections.length > 0 && (
                  <div className="service-info-grid">
                    {descriptionContent.sections.map((section) => (
                      <ServiceInfoSection section={section} key={section.title} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="service-detail-section">
              <div className="service-detail-section-head">
                <ShieldCheck size={18} />
                <h2>Cadre de collaboration</h2>
              </div>
              <div className="service-detail-trust-grid">
                {trustItems.map((item) => (
                  <div className="service-detail-trust-item" key={item}>
                    <CheckCircle size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="service-detail-sidebar">
            <div className="service-detail-price-card animate-fade-in-up">
              <span>A partir de</span>
              <strong>{formattedPrice} MAD</strong>
              <p>{deliveryLabel} - {executionModeLabel}</p>
            </div>

            <div className="request-form-card animate-fade-in-up">
              {sent ? (
                <div className="service-detail-state">
                  <CheckCircle size={48} />
                  <h3>Demande envoyee</h3>
                  <p>
                    Le freelance recevra votre demande et pourra vous repondre rapidement.
                  </p>
                </div>
              ) : !isAuthenticated ? (
                <div className="service-detail-state">
                  <h3>Interesse ?</h3>
                  <p>
                    Connectez-vous pour envoyer une demande de prestation.
                  </p>
                  <Link to="/login" className="btn btn-primary">
                    Se connecter
                  </Link>
                </div>
              ) : user?.role === 'FREELANCER' ? (
                <div className="service-detail-state">
                  <p>
                    Vous etes connecte en tant que freelance. Seuls les clients peuvent envoyer des
                    demandes.
                  </p>
                </div>
              ) : (
                <>
                  <h3>
                    <Send size={18} /> Envoyer une demande
                  </h3>
                  <form className="request-form" onSubmit={handleSendRequest}>
                    <div className="form-group">
                      <label className="form-label">Message au freelance</label>
                      <textarea
                        className="form-textarea"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        required
                        placeholder="Contexte, objectifs, delai souhaite..."
                        rows={5}
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
                      className="btn btn-primary btn-lg service-detail-submit"
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

            <div className="service-detail-contact-card">
              <div className="service-detail-contact-head">
                <div className="service-detail-avatar">{getInitials(freelancerName)}</div>
                <div>
                  <strong>{freelancerName}</strong>
                  <span>{locationLabel}</span>
                </div>
              </div>
              <Link to={`/freelancers/${service.freelancerId}`} className="btn btn-secondary service-detail-side-action">
                <User size={16} /> Voir le profil
              </Link>
              <button
                type="button"
                className="btn btn-secondary service-detail-side-action"
                onClick={handleContactFreelancer}
                disabled={contacting}
              >
                {contacting ? (
                  <Loader2 size={16} className="spinner" />
                ) : (
                  <MessageSquare size={16} />
                )}
                Contacter
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
