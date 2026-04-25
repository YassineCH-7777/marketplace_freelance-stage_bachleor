import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader2, MapPin } from 'lucide-react';
import FreelancerProfileCard from '../components/freelance/FreelancerProfileCard';
import LocalTrustSection from '../components/freelance/LocalTrustSection';
import PortfolioSection from '../components/freelance/PortfolioSection';
import { getActiveServices, getFreelancerProfile } from '../api/serviceApi';
import { getFreelancerReviews } from '../api/reviewApi';
import {
  getDeliveryTimeLabel,
  getExecutionModeLabel,
  getExecutionModeTone,
  getServiceLocationLabel,
} from '../utils/serviceMeta';
import './Dashboard.css';
import './FreelancerPublicProfile.css';

export default function FreelancerPublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getFreelancerProfile(id), getActiveServices(), getFreelancerReviews(id)])
      .then(([profileResult, servicesResult, reviewsResult]) => {
        if (!isMounted) {
          return;
        }

        setProfile(profileResult.status === 'fulfilled' ? profileResult.value.data : null);

        const activeServices = servicesResult.status === 'fulfilled' ? servicesResult.value.data : [];
        setServices(
          activeServices.filter((service) => String(service.freelancerId) === String(id)),
        );
        setReviews(reviewsResult.status === 'fulfilled' ? reviewsResult.value.data : []);
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

  if (loading) {
    return (
      <div className="dashboard-page freelancer-public-page">
        <div className="container">
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile && services.length === 0) {
    return (
      <div className="dashboard-page freelancer-public-page">
        <div className="container">
          <div className="empty-state">
            <h3 className="empty-state-title">Profil freelance introuvable</h3>
            <p className="empty-state-desc">
              Ce freelance n&apos;a pas encore de profil public disponible.
            </p>
            <Link to="/services" className="btn btn-secondary">
              <ArrowLeft size={16} /> Retour aux services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page freelancer-public-page">
      <div className="container public-profile-stack">
        <Link to="/services" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={16} /> Retour aux services
        </Link>

        <FreelancerProfileCard
          freelancerId={id}
          profile={profile}
          fallbackEmail={services[0]?.freelancerEmail}
        />

        <LocalTrustSection profile={profile} services={services} reviews={reviews} />

        <PortfolioSection portfolioUrl={profile?.portfolioUrl} />

        <section className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="public-section-header">
            <h2>Services proposes</h2>
            <span className="badge badge-primary">
              <Briefcase size={12} />
              {services.length} service{services.length > 1 ? 's' : ''}
            </span>
          </div>

          {services.length > 0 ? (
            <div className="public-services-grid">
              {services.map((service) => (
                <article className="card public-service-card" key={service.id}>
                  <div className="service-card-header">
                    <span className="badge badge-primary">{service.categoryName || 'Service'}</span>
                    <span className="service-price">{service.price} MAD</span>
                  </div>
                  <h3 className="service-card-title">{service.title}</h3>
                  <p>
                    {service.description?.slice(0, 160)}
                    {service.description?.length > 160 ? '...' : ''}
                  </p>
                  <div className="service-meta-chips">
                    <span className="service-chip">
                      <MapPin size={12} />
                      {getServiceLocationLabel(service)}
                    </span>
                    <span className={`service-chip ${getExecutionModeTone(service.executionMode)}`}>
                      {getExecutionModeLabel(service.executionMode)}
                    </span>
                    <span className="service-chip">{getDeliveryTimeLabel(service.deliveryTimeDays)}</span>
                  </div>
                  <Link
                    to={`/services/${service.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Voir le service
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="public-empty-block">
              <p>Ce freelance n&apos;a pas encore de service public actif.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
