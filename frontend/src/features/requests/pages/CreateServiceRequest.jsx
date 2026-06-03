import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createServiceRequest } from '@/api/requestApi';
import { getCategories } from '@/api/serviceApi';
import { uploadServiceRequestAttachments } from '@/api/attachmentApi';
import AttachmentPicker from '@/components/common/AttachmentPicker';
import CustomSelect from '@/components/common/CustomSelect';
import { Plus, Send, ArrowLeft, Paperclip } from 'lucide-react';
import '@/styles/requests.css';

export default function CreateServiceRequest() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', budgetMin: '', budgetMax: '',
    deadline: '', city: '', remote: false, urgent: false, requiredSkills: '',
  });

  useEffect(() => { getCategories().then(r => setCategories(r.data)).catch(() => {}); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCategoryChange = (categoryId) => {
    setForm(prev => ({ ...prev, categoryId }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      setError('Selectionnez une categorie.');
      return;
    }

    setError(''); setLoading(true);
    try {
      const skills = form.requiredSkills ? form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];
      const response = await createServiceRequest({
        title: form.title, description: form.description, categoryId: Number(form.categoryId),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null, budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
        deadline: form.deadline || null, city: form.city || null, remote: form.remote, urgent: form.urgent, requiredSkills: skills,
      });
      if (attachments.length > 0) {
        try {
          await uploadServiceRequestAttachments(response.data.id, attachments, 'BRIEF');
        } catch (uploadError) {
          setError(uploadError.response?.data?.message || 'Demande publiee, mais les fichiers n ont pas pu etre ajoutes.');
          setLoading(false);
          return;
        }
      }
      navigate('/client/requests');
    } catch (err) { setError(err.response?.data?.message || 'Erreur lors de la creation.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="requests-page"><div className="container">
      <div className="create-request-header animate-fade-in-up">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Retour</button>
        <h1><Plus size={22} /> Publier une demande</h1>
        <p>Decrivez votre besoin et les freelances pourront vous proposer leurs services.</p>
      </div>
      <form className="create-request-form animate-fade-in-up" onSubmit={handleSubmit} style={{ animationDelay: '0.15s' }}>
        {error && <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius-md)' }}>{error}</div>}
        <div className="form-group"><label className="form-label">Titre du projet *</label><input className="form-input" name="title" value={form.title} onChange={handleChange} placeholder="Ex: Developpement d'un site de reservation" required /></div>
        <div className="form-group"><label className="form-label">Description detaillee *</label><textarea className="form-input" name="description" rows={5} value={form.description} onChange={handleChange} placeholder="Decrivez votre projet..." required /></div>
        <div className="request-attachment-box">
          <div>
            <label className="form-label"><Paperclip size={14} /> Brief et fichiers utiles</label>
            <p>Images, PDF, brief ou document de reference. 5 fichiers max, 10 Mo chacun.</p>
          </div>
          <AttachmentPicker files={attachments} onChange={setAttachments} disabled={loading} />
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Categorie *</label><CustomSelect id="request-category" label="Categorie" className="form-custom-select" options={[{ value: '', label: 'Selectionnez...' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]} value={form.categoryId} onChange={handleCategoryChange} /></div>
          <div className="form-group"><label className="form-label">Ville</label><input className="form-input" name="city" value={form.city} onChange={handleChange} placeholder="Ex: Casablanca" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Budget minimum (MAD)</label><input type="number" className="form-input" name="budgetMin" value={form.budgetMin} onChange={handleChange} placeholder="3000" min="0" /></div>
          <div className="form-group"><label className="form-label">Budget maximum (MAD)</label><input type="number" className="form-input" name="budgetMax" value={form.budgetMax} onChange={handleChange} placeholder="8000" min="0" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date limite</label><input type="date" className="form-input" name="deadline" value={form.deadline} onChange={handleChange} /></div>
          <div className="form-group"><label className="form-label">Competences requises</label><input className="form-input" name="requiredSkills" value={form.requiredSkills} onChange={handleChange} placeholder="React, Spring Boot (virgules)" /></div>
        </div>
        <div className="form-checkboxes">
          <label className="form-checkbox"><input type="checkbox" name="remote" checked={form.remote} onChange={handleChange} /> Travail a distance</label>
          <label className="form-checkbox"><input type="checkbox" name="urgent" checked={form.urgent} onChange={handleChange} /> Besoin urgent</label>
        </div>
        <div className="form-actions"><button type="submit" className="btn btn-primary btn-lg" disabled={loading}><Send size={16} /> {loading ? 'Publication...' : 'Publier la demande'}</button></div>
      </form>
    </div></div>
  );
}
