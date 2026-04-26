import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { getClientProfile, updateClientProfile } from '../api/userApi';
import { BadgeCheck, Loader2, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from 'lucide-react';
import './Dashboard.css';

const emptyProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
};

const readProfileValue = (profile, camelKey, snakeKey, fallback = '') =>
  profile?.[camelKey] ?? profile?.[snakeKey] ?? fallback ?? '';

export default function ClientProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getClientProfile()
      .then((response) => {
        if (!isMounted) return;

        const nextProfile = response.data;
        setProfile(nextProfile);
        setForm({
          firstName: readProfileValue(nextProfile, 'firstName', 'first_name', user?.firstName),
          lastName: readProfileValue(nextProfile, 'lastName', 'last_name', user?.lastName),
          phone: readProfileValue(nextProfile, 'phone', 'phone', user?.phone),
          city: readProfileValue(nextProfile, 'city', 'city', user?.city),
        });
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
          setForm({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
            city: user?.city || '',
          });
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
  }, [user]);

  const completion = useMemo(() => {
    const fields = [form.firstName, form.lastName, form.phone, form.city];
    return Math.round((fields.filter((value) => value.trim()).length / fields.length) * 100);
  }, [form]);

  const fullName = `${form.firstName || user?.firstName || ''} ${form.lastName || user?.lastName || ''}`.trim();
  const displayName = fullName || user?.email?.split('@')[0] || 'Client';

  const updateField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const response = await updateClientProfile(form);
      setProfile(response.data);
      updateUser(response.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la mise a jour du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">Mon Profil Client</h1>
          <p className="dashboard-subtitle">Gerez vos informations personnelles et vos coordonnees.</p>
        </div>

        <div className="client-profile-layout animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <aside className="client-profile-summary">
            <div className="client-profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <h2>{displayName}</h2>
            <p>{profile?.email || user?.email}</p>
            <span className="badge badge-primary">
              <ShieldCheck size={12} />
              CLIENT
            </span>

            <div className="client-profile-progress">
              <div className="client-profile-progress-head">
                <span>Profil complete</span>
                <strong>{completion}%</strong>
              </div>
              <div className="client-profile-progress-track">
                <div style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="client-profile-facts">
              <div>
                <Mail size={16} />
                <span>{profile?.email || user?.email}</span>
              </div>
              <div>
                <Phone size={16} />
                <span>{form.phone || 'Telephone non renseigne'}</span>
              </div>
              <div>
                <MapPin size={16} />
                <span>{form.city || 'Ville non renseignee'}</span>
              </div>
            </div>
          </aside>

          <section className="profile-card client-profile-editor">
            <div className="client-profile-editor-head">
              <div>
                <span className="client-profile-kicker">
                  <BadgeCheck size={14} />
                  Identite client
                </span>
                <h2>Informations du compte</h2>
              </div>
              {saved && <span className="client-profile-saved">Profil mis a jour</span>}
            </div>

            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  <UserRound size={14} style={{ display: 'inline' }} /> Prenom
                </label>
                <input
                  className="form-input"
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  placeholder="Ex: Ilyas"
                  required
                  minLength={2}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <UserRound size={14} style={{ display: 'inline' }} /> Nom
                </label>
                <input
                  className="form-input"
                  value={form.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  placeholder="Ex: Benali"
                  required
                  minLength={2}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} style={{ display: 'inline' }} /> Telephone
                </label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Ex: 0612345678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <MapPin size={14} style={{ display: 'inline' }} /> Ville
                </label>
                <input
                  className="form-input"
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  placeholder="Ex: Casablanca"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <Mail size={14} style={{ display: 'inline' }} /> Email
                </label>
                <input className="form-input" value={profile?.email || user?.email || ''} disabled />
              </div>

              <div className="client-profile-actions full-width">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
