import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { updateFreelancerProfile } from '../api/userApi';
import { getFreelancerProfile } from '../api/serviceApi';
import { User, Save, Loader2, MapPin, Link as LinkIcon, Code, FileText } from 'lucide-react';
import './Dashboard.css';

export default function FreelancerProfileEdit() {
  const { user } = useAuth();
  const [form, setForm] = useState({ bio: '', city: '', portfolioUrl: '', skills: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getFreelancerProfile(user.id)
        .then(res => {
          const p = res.data;
          setForm({ bio: p.bio || '', city: p.city || '', portfolioUrl: p.portfolioUrl || '', skills: p.skills || '' });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateFreelancerProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Erreur lors de la mise à jour'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="dashboard-page"><div className="container"><div className="empty-state"><Loader2 size={32} className="spinner" /></div></div></div>;

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">Mon Profil Freelance</h1>
          <p className="dashboard-subtitle">Complétez votre profil pour attirer plus de clients.</p>
        </div>

        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.email?.[0]?.toUpperCase() || 'F'}
            </div>
            <div className="profile-info">
              <h2>{user?.email}</h2>
              <p><span className="badge badge-primary">FREELANCER</span></p>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label"><MapPin size={14} style={{ display: 'inline' }} /> Ville</label>
              <input className="form-input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Ex: Casablanca" />
            </div>

            <div className="form-group">
              <label className="form-label"><LinkIcon size={14} style={{ display: 'inline' }} /> Portfolio URL</label>
              <input className="form-input" value={form.portfolioUrl} onChange={e => setForm({...form, portfolioUrl: e.target.value})} placeholder="https://monportfolio.com" />
            </div>

            <div className="form-group">
              <label className="form-label"><Code size={14} style={{ display: 'inline' }} /> Compétences</label>
              <input className="form-input" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="React, Java, Design, Marketing..." />
            </div>

            <div className="form-group full-width">
              <label className="form-label"><FileText size={14} style={{ display: 'inline' }} /> Bio</label>
              <textarea className="form-textarea" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Parlez de vous, de votre expérience, de vos spécialités..." rows={4} />
            </div>

            <div className="full-width" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><Loader2 size={16} className="spinner" /> Enregistrement...</> : <><Save size={16} /> Enregistrer</>}
              </button>
              {saved && <span style={{ color: 'var(--accent-400)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>✓ Profil mis à jour avec succès !</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
