import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveServices } from '../api/serviceApi';
import { createFreelancerService, updateFreelancerService, deleteFreelancerService } from '../api/userApi';
import { Plus, Edit3, Trash2, X, Loader2, Package, Briefcase } from 'lucide-react';
import './Dashboard.css';

export default function MyServices() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', categoryId: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = () => {
    setLoading(true);
    getActiveServices()
      .then(res => {
        const mine = res.data.filter(s => s.freelancerId === user?.id);
        setServices(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', description: '', price: '', categoryId: '' });
    setShowModal(true);
  };

  const openEdit = (service) => {
    setEditId(service.id);
    setForm({ title: service.title, description: service.description, price: service.price, categoryId: service.categoryId });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), categoryId: parseInt(form.categoryId) };
      if (editId) {
        await updateFreelancerService(editId, payload);
      } else {
        await createFreelancerService(payload);
      }
      setShowModal(false);
      fetchServices();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archiver ce service ? Il ne sera plus visible publiquement.')) return;
    try {
      await deleteFreelancerService(id);
      fetchServices();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="dashboard-title">Mes Services</h1>
              <p className="dashboard-subtitle">Gérez vos offres publiées sur la plateforme.</p>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} /> Nouveau service
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : services.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Briefcase size={48} /></div>
            <h3 className="empty-state-title">Aucun service publié</h3>
            <p className="empty-state-desc">Créez votre premier service pour commencer à recevoir des demandes de clients.</p>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Publier un service</button>
          </div>
        ) : (
          <div className="dash-table-wrapper animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td className="td-title">{s.title}</td>
                    <td><span className="badge badge-primary">{s.categoryName || `Cat. ${s.categoryId}`}</span></td>
                    <td><span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>{s.price} MAD</span></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-edit" onClick={() => openEdit(s)}><Edit3 size={14} /> Modifier</button>
                        <button className="btn btn-sm btn-delete" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editId ? 'Modifier le service' : 'Nouveau service'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Titre</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Ex: Création de site web" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required placeholder="Décrivez votre service en détail..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Prix (MAD)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required placeholder="500" />
                </div>
                <div className="form-group">
                  <label className="form-label">ID Catégorie</label>
                  <input className="form-input" type="number" min="1" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required placeholder="1" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><Loader2 size={16} className="spinner" /> Enregistrement...</> : editId ? 'Mettre à jour' : 'Publier'}
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
