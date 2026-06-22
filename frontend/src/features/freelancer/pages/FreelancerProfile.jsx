import { useEffect, useMemo, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { getFreelancerOwnProfile, updateFreelancerProfile } from '@/api/userApi';
import AiAssistantPanel from '@/components/ai/AiAssistantPanel';
import ServiceAreaMap from '@/components/common/ServiceAreaMap';
import {
  formatRadiusLabel,
  getLocationCoordinates,
  getRadiusOptionIndex,
  SEARCH_RADIUS_OPTIONS,
} from '@/utils/localSearch';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Code,
  FileText,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import '@/styles/dashboard.css';

const emptyProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  searchCity: '',
  searchPlaceId: '',
  searchLatitude: null,
  searchLongitude: null,
  searchRadiusKm: 10,
  headline: '',
  portfolioUrl: '',
  skills: '',
  bio: '',
};

const readProfileValue = (profile, camelKey, snakeKey, fallback = '') =>
  profile?.[camelKey] ?? profile?.[snakeKey] ?? fallback ?? '';

export default function FreelancerProfileEdit() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getFreelancerOwnProfile()
      .then((response) => {
        if (!isMounted) return;

        const nextProfile = response.data;
        setProfile(nextProfile);
        setForm({
          firstName: readProfileValue(nextProfile, 'firstName', 'first_name', user?.firstName),
          lastName: readProfileValue(nextProfile, 'lastName', 'last_name', user?.lastName),
          phone: readProfileValue(nextProfile, 'phone', 'phone', user?.phone),
          city: readProfileValue(nextProfile, 'city', 'city', user?.city),
          searchCity: readProfileValue(nextProfile, 'searchCity', 'search_city', user?.searchCity),
          searchPlaceId: readProfileValue(nextProfile, 'searchPlaceId', 'search_place_id', user?.searchPlaceId),
          searchLatitude: nextProfile?.searchLatitude ?? nextProfile?.search_latitude ?? user?.searchLatitude ?? null,
          searchLongitude: nextProfile?.searchLongitude ?? nextProfile?.search_longitude ?? user?.searchLongitude ?? null,
          searchRadiusKm: Number(
            readProfileValue(nextProfile, 'searchRadiusKm', 'search_radius_km', user?.searchRadiusKm || 10),
          ),
          headline: readProfileValue(nextProfile, 'headline', 'headline'),
          portfolioUrl: readProfileValue(nextProfile, 'portfolioUrl', 'portfolio_url'),
          skills: readProfileValue(nextProfile, 'skills', 'skills'),
          bio: readProfileValue(nextProfile, 'bio', 'bio'),
        });
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
          setForm({
            ...emptyProfile,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
            city: user?.city || '',
            searchCity: user?.searchCity || '',
            searchPlaceId: user?.searchPlaceId || '',
            searchLatitude: user?.searchLatitude ?? null,
            searchLongitude: user?.searchLongitude ?? null,
            searchRadiusKm: Number(user?.searchRadiusKm || 10),
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

  const skillList = useMemo(
    () =>
      form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    [form.skills],
  );

  const completion = useMemo(() => {
    const fields = [
      form.firstName,
      form.lastName,
      form.phone,
      form.city,
      form.headline,
      form.portfolioUrl,
      form.skills,
      form.bio,
    ];
    return Math.round((fields.filter((value) => value.trim()).length / fields.length) * 100);
  }, [form]);

  const fullName = `${form.firstName || user?.firstName || ''} ${form.lastName || user?.lastName || ''}`.trim();
  const displayName = fullName || user?.email?.split('@')[0] || 'Freelance';

  const updateField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateSearchCity = (value) => {
    setForm((currentForm) => {
      const coordinates = !currentForm.searchLatitude || !currentForm.searchLongitude
        ? getLocationCoordinates(value)
        : null;

      return {
        ...currentForm,
        searchCity: value,
        searchPlaceId: '',
        ...(coordinates ? { searchLatitude: coordinates.lat, searchLongitude: coordinates.lng } : {}),
      };
    });
  };

  const updateSearchLocation = ({ latitude, longitude }) => {
    setForm((currentForm) => ({
      ...currentForm,
      searchLatitude: latitude,
      searchLongitude: longitude,
    }));
  };

  const updateSearchRadius = (event) => {
    updateField('searchRadiusKm', SEARCH_RADIUS_OPTIONS[Number(event.target.value)]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError('');

    try {
      const response = await updateFreelancerProfile(form);
      setProfile(response.data);
      updateUser({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        phone: response.data.phone,
        city: response.data.city,
        searchCity: response.data.searchCity,
        searchPlaceId: response.data.searchPlaceId,
        searchLatitude: response.data.searchLatitude,
        searchLongitude: response.data.searchLongitude,
        searchRadiusKm: response.data.searchRadiusKm,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Erreur lors de la mise a jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleFreelanceAssistantResult = (draftProfile) => {
    setForm((currentForm) => ({
      ...currentForm,
      city: draftProfile.city || currentForm.city,
      headline: draftProfile.headline || draftProfile.title || currentForm.headline,
      portfolioUrl: draftProfile.portfolioUrl || draftProfile.portfolio_url || currentForm.portfolioUrl,
      skills: Array.isArray(draftProfile.skills)
        ? draftProfile.skills.join(', ')
        : draftProfile.skills || currentForm.skills,
      bio: draftProfile.professional_bio || draftProfile.professionalBio || draftProfile.bio || currentForm.bio,
    }));
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
          <h1 className="dashboard-title">Mon Profil Freelance</h1>
          <p className="dashboard-subtitle">
            Mettez a jour vos informations personnelles et votre vitrine professionnelle.
          </p>
        </div>

        <AiAssistantPanel
          type="freelance"
          title="Assistant IA profil"
          subtitle="Construisez un headline, une bio et des competences propres, puis appliquez-les au formulaire."
          placeholder="Ex: Je suis developpeur React et Spring Boot, je travaille avec des commerces locaux a Marrakech."
          metadata={{
            currentProfileCompletion: completion,
            currentProfile: form,
          }}
          onStructuredResult={handleFreelanceAssistantResult}
          applyLabel="Pre-remplir le profil"
        />

        <div className="client-profile-layout freelancer-profile-layout animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <aside className="client-profile-summary freelancer-profile-summary">
            <div className="client-profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <h2>{displayName}</h2>
            <p>{profile?.email || user?.email}</p>
            <span className="badge badge-primary">
              <ShieldCheck size={12} />
              FREELANCER
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
                <BriefcaseBusiness size={16} />
                <span>{form.headline || 'Titre professionnel non renseigne'}</span>
              </div>
              <div>
                <Phone size={16} />
                <span>{form.phone || 'Telephone non renseigne'}</span>
              </div>
              <div>
                <MapPin size={16} />
                <span>{form.city || 'Ville non renseignee'}</span>
              </div>
              <div>
                <LinkIcon size={16} />
                <span>{form.portfolioUrl || 'Portfolio non renseigne'}</span>
              </div>
            </div>

            {skillList.length > 0 && (
              <div className="freelancer-profile-skills">
                {skillList.slice(0, 8).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            )}
          </aside>

          <section className="profile-card client-profile-editor freelancer-profile-editor">
            <div className="client-profile-editor-head">
              <div>
                <span className="client-profile-kicker">
                  <BadgeCheck size={14} />
                  Profil public freelance
                </span>
                <h2>Informations a afficher aux clients</h2>
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
                  placeholder="Ex: Yassine"
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
                  placeholder="Ex: Alaoui"
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
                  <BriefcaseBusiness size={14} style={{ display: 'inline' }} /> Titre professionnel
                </label>
                <input
                  className="form-input"
                  value={form.headline}
                  onChange={(event) => updateField('headline', event.target.value)}
                  placeholder="Ex: Developpeur fullstack Java / React"
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <LinkIcon size={14} style={{ display: 'inline' }} /> Portfolio URL
                </label>
                <input
                  className="form-input"
                  value={form.portfolioUrl}
                  onChange={(event) => updateField('portfolioUrl', event.target.value)}
                  placeholder="https://monportfolio.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Code size={14} style={{ display: 'inline' }} /> Competences
                </label>
                <input
                  className="form-input"
                  value={form.skills}
                  onChange={(event) => updateField('skills', event.target.value)}
                  placeholder="React, Java, Design, Marketing"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <FileText size={14} style={{ display: 'inline' }} /> Bio professionnelle
                </label>
                <textarea
                  className="form-textarea"
                  value={form.bio}
                  onChange={(event) => updateField('bio', event.target.value)}
                  placeholder="Expliquez votre experience, vos specialites et votre methode de travail."
                  rows={5}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <MapPin size={14} style={{ display: 'inline' }} /> Zone d'intervention
                </label>
                <input
                  className="form-input"
                  value={form.searchCity}
                  onChange={(event) => updateSearchCity(event.target.value)}
                  placeholder="Ex: Fes centre, Rabat Agdal"
                />
                <div className="profile-location-map">
                  <ServiceAreaMap
                    city={form.searchCity || form.city}
                    latitude={form.searchLatitude}
                    longitude={form.searchLongitude}
                    radiusKm={form.searchRadiusKm}
                    onLocationChange={updateSearchLocation}
                  />
                  <div className="wizard-radius-control">
                    <input
                      type="range"
                      min="0"
                      max={SEARCH_RADIUS_OPTIONS.length - 1}
                      step="1"
                      value={getRadiusOptionIndex(form.searchRadiusKm)}
                      onChange={updateSearchRadius}
                      aria-label="Rayon d'intervention"
                    />
                    <strong>{formatRadiusLabel(form.searchRadiusKm)}</strong>
                  </div>
                </div>
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
              {saveError && <p className="form-error full-width">{saveError}</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
