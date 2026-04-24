import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, X, Loader2, Briefcase } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getActiveServices } from '../api/serviceApi';
import {
  createFreelancerService,
  updateFreelancerService,
  deleteFreelancerService,
} from '../api/userApi';
import './Dashboard.css';

function extractCategories(services) {
  const categoryMap = new Map();

  services.forEach((service) => {
    if (service.categoryId) {
      categoryMap.set(service.categoryId, {
        id: service.categoryId,
        name: service.categoryName || `Categorie ${service.categoryId}`,
      });
    }
  });

  return Array.from(categoryMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export default function MyServices() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', categoryId: '' });
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getActiveServices()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const allServices = response.data || [];
        setServices(allServices.filter((service) => service.freelancerId === user?.id));
        setCategories(extractCategories(allServices));
      })
      .catch(() => {
        if (isMounted) {
          setServices([]);
          setCategories([]);
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
  }, [user?.id]);

  const refreshServices = () => {
    setLoading(true);

    getActiveServices()
      .then((response) => {
        const allServices = response.data || [];
        setServices(allServices.filter((service) => service.freelancerId === user?.id));
        setCategories(extractCategories(allServices));
      })
      .catch(() => {
        setServices([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', description: '', price: '', categoryId: '' });
    setShowModal(true);
  };

  const openEdit = (service) => {
    setEditId(service.id);
    setForm({
      title: service.title,
      description: service.description,
      price: service.price,
      categoryId: String(service.categoryId),
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        categoryId: parseInt(form.categoryId, 10),
      };

      if (editId) {
        await updateFreelancerService(editId, payload);
      } else {
        await createFreelancerService(payload);
      }

      setShowModal(false);
      refreshServices();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archiver ce service ? Il ne sera plus visible publiquement.')) {
      return;
    }

    try {
      await deleteFreelancerService(id);
      refreshServices();
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h1 className="dashboard-title">Mes Services</h1>
              <p className="dashboard-subtitle">Gerez vos offres publiees sur la plateforme.</p>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} /> Nouveau service
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        ) : services.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Briefcase size={48} />
            </div>
            <h3 className="empty-state-title">Aucun service publie</h3>
            <p className="empty-state-desc">
              Creez votre premier service pour commencer a recevoir des demandes de clients.
            </p>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} /> Publier un service
            </button>
          </div>
        ) : (
          <div className="dash-table-wrapper animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Categorie</th>
                  <th>Prix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="td-title">{service.title}</td>
                    <td>
                      <span className="badge badge-primary">
                        {service.categoryName || `Cat. ${service.categoryId}`}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>
                        {service.price} MAD
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-edit" onClick={() => openEdit(service)}>
                          <Edit3 size={14} /> Modifier
                        </button>
                        <button className="btn btn-sm btn-delete" onClick={() => handleDelete(service.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editId ? 'Modifier le service' : 'Nouveau service'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Titre</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    required
                    placeholder="Ex: Creation de site web"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    required
                    placeholder="Decrivez votre service en detail..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prix (MAD)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    required
                    placeholder="500"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categorie</label>
                  <select
                    className="form-input"
                    value={form.categoryId}
                    onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                    required
                  >
                    <option value="">Choisir une categorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Enregistrement...
                      </>
                    ) : editId ? (
                      'Mettre a jour'
                    ) : (
                      'Publier'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
