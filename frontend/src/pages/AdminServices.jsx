import { useEffect, useMemo, useState } from 'react';
import { Ban, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';
import { getAdminServices, moderateAdminService } from '../api/adminApi';
import { formatAdminMoney, getAdminBadgeClass } from '../utils/adminMeta';
import './Dashboard.css';

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState(null);
  const [serviceStatusFilter, setServiceStatusFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;

    getAdminServices()
      .then((response) => {
        if (isMounted) setServices(response.data);
      })
      .catch(() => {
        if (isMounted) setServices([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredServices = useMemo(
    () => services.filter((service) => serviceStatusFilter === 'ALL' || service.status === serviceStatusFilter),
    [serviceStatusFilter, services],
  );

  const handleModerateService = async (serviceId, status) => {
    setModeratingId(serviceId);
    try {
      await moderateAdminService(serviceId, status);
      setServices((currentServices) =>
        currentServices.map((entry) => (entry.id === serviceId ? { ...entry, status } : entry)),
      );
    } finally {
      setModeratingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Briefcase size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Services
          </h1>
          <p className="dashboard-subtitle">Moderez les annonces et leur visibilite dans le catalogue.</p>
        </div>

        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <Briefcase size={15} /> Services
              </span>
              <h2>Moderation des annonces</h2>
            </div>
            <select value={serviceStatusFilter} onChange={(event) => setServiceStatusFilter(event.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="PUBLISHED">Publies</option>
              <option value="SUSPENDED">Suspendus</option>
              <option value="DRAFT">Brouillons</option>
              <option value="ARCHIVED">Archives</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">
              <Loader2 size={32} className="spinner" />
            </div>
          ) : (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Freelance</th>
                    <th>Categorie</th>
                    <th>Prix</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length > 0 ? (
                    filteredServices.map((service) => (
                      <tr key={service.id}>
                        <td className="td-title">
                          {service.title}
                          <span className="admin-muted-line">{service.serviceCity || '-'}</span>
                        </td>
                        <td>{service.freelancerEmail}</td>
                        <td>{service.categoryName}</td>
                        <td>{formatAdminMoney(service.price)}</td>
                        <td>
                          <span className={`badge ${getAdminBadgeClass(service.status)}`}>{service.status}</span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn btn-sm btn-accept"
                              disabled={moderatingId === service.id || service.status === 'PUBLISHED'}
                              onClick={() => handleModerateService(service.id, 'PUBLISHED')}
                              type="button"
                            >
                              {moderatingId === service.id ? (
                                <Loader2 size={14} className="spinner" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              Publier
                            </button>
                            <button
                              className="btn btn-sm btn-delete"
                              disabled={moderatingId === service.id || service.status === 'SUSPENDED'}
                              onClick={() => handleModerateService(service.id, 'SUSPENDED')}
                              type="button"
                            >
                              {moderatingId === service.id ? <Loader2 size={14} className="spinner" /> : <Ban size={14} />}
                              Suspendre
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ color: 'var(--text-muted)' }}>
                        Aucun service trouve.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
