import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createServiceRequest } from '@/api/requestApi';
import { getCategories } from '@/api/serviceApi';
import { uploadServiceRequestAttachments } from '@/api/attachmentApi';
import AttachmentPicker from '@/components/common/AttachmentPicker';
import CustomSelect from '@/components/common/CustomSelect';
import ServiceAreaMap from '@/components/common/ServiceAreaMap';
import { getLocationCoordinates } from '@/utils/localSearch';
import { reverseGeocodeLocation } from '@/utils/reverseGeocoding';
import { Plus, Send, Paperclip, MapPin } from 'lucide-react';
import '@/styles/requests.css';

const MODE_OPTIONS = [
  { value: 'ON_SITE', label: 'Sur place' },
  { value: 'HYBRID', label: 'Hybride' },
  { value: 'REMOTE', label: 'A distance' },
];

function isLocalExecutionMode(mode) {
  return mode === 'ON_SITE' || mode === 'HYBRID';
}

function normalizeRequestRadius(value) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) {
    return 5;
  }

  return Math.min(50, Math.max(1, Math.round(radius)));
}

function getKnownCityCoordinates(city) {
  const coordinates = getLocationCoordinates(city);
  return coordinates ? { latitude: coordinates.lat, longitude: coordinates.lng } : {};
}

export default function CreateServiceRequest() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locatingCity, setLocatingCity] = useState(false);
  const locationRequestRef = useRef(0);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', budgetMin: '', budgetMax: '',
    deadline: '', city: '', executionMode: 'ON_SITE', latitude: null, longitude: null,
    requestRadiusKm: 5, remote: false, urgent: false, requiredSkills: '',
  });

  useEffect(() => { getCategories().then(r => setCategories(r.data)).catch(() => {}); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'city') {
      locationRequestRef.current += 1;
      setLocatingCity(false);
    }
    setForm(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };

      if (name === 'city' && isLocalExecutionMode(prev.executionMode) && (!prev.latitude || !prev.longitude)) {
        Object.assign(next, getKnownCityCoordinates(value));
      }

      return next;
    });
  };

  const handleCategoryChange = (categoryId) => {
    setForm(prev => ({ ...prev, categoryId }));
    setError('');
  };

  const handleExecutionModeChange = (executionMode) => {
    locationRequestRef.current += 1;
    setLocatingCity(false);
    setForm(prev => {
      if (executionMode === 'REMOTE') {
        return {
          ...prev,
          executionMode,
          city: 'Remote',
          remote: true,
          latitude: null,
          longitude: null,
        };
      }

      const city = prev.city === 'Remote' ? '' : prev.city;
      const coordinates = !prev.latitude || !prev.longitude ? getKnownCityCoordinates(city) : {};
      return {
        ...prev,
        executionMode,
        city,
        remote: executionMode !== 'ON_SITE',
        ...coordinates,
      };
    });
  };

  const handleLocationChange = async ({ latitude, longitude }) => {
    const requestId = locationRequestRef.current + 1;
    locationRequestRef.current = requestId;
    setError('');
    setLocatingCity(true);
    setForm(prev => ({ ...prev, latitude, longitude, city: '' }));

    try {
      const city = await reverseGeocodeLocation(latitude, longitude);
      if (locationRequestRef.current === requestId) {
        setForm(prev => ({ ...prev, city: city || '' }));
      }
    } catch {
      if (locationRequestRef.current === requestId) {
        setError('Ville non detectee automatiquement. Saisissez-la manuellement.');
      }
    } finally {
      if (locationRequestRef.current === requestId) {
        setLocatingCity(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      setError('Sélectionnez une catégorie.');
      return;
    }

    const localMission = isLocalExecutionMode(form.executionMode);
    const radiusKm = normalizeRequestRadius(form.requestRadiusKm);

    if (localMission && !form.city.trim()) {
      setError('Indiquez la ville ou le quartier de la mission.');
      return;
    }

    if (localMission && (!Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude)))) {
      setError('Choisissez un point valide sur la carte.');
      return;
    }

    setError(''); setLoading(true);
    try {
      const skills = form.requiredSkills ? form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];
      const response = await createServiceRequest({
        title: form.title, description: form.description, categoryId: Number(form.categoryId),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null, budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
        deadline: form.deadline || null,
        city: form.executionMode === 'REMOTE' ? 'Remote' : form.city,
        executionMode: form.executionMode,
        remote: form.executionMode !== 'ON_SITE',
        latitude: localMission ? Number(form.latitude) : null,
        longitude: localMission ? Number(form.longitude) : null,
        requestRadiusKm: localMission ? radiusKm : 5,
        urgent: form.urgent,
        requiredSkills: skills,
      });
      if (attachments.length > 0) {
        try {
          await uploadServiceRequestAttachments(response.data.id, attachments, 'BRIEF');
        } catch (uploadError) {
          setError(uploadError.response?.data?.message || "Demande publiée, mais les fichiers n'ont pas pu être ajoutés.");
          setLoading(false);
          return;
        }
      }
      navigate('/client/requests');
    } catch (err) { setError(err.response?.data?.message || 'Erreur lors de la création.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="requests-page"><div className="container">
      <div className="create-request-header animate-fade-in-up">
        <h1><Plus size={22} /> Publier une demande</h1>
        <p>Décrivez votre besoin et les freelances pourront vous proposer leurs services.</p>
      </div>
      <form className="create-request-form animate-fade-in-up" onSubmit={handleSubmit} style={{ animationDelay: '0.15s' }}>
        {error && <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius-md)' }}>{error}</div>}
        <div className="form-group"><label className="form-label">Titre du projet *</label><input className="form-input" name="title" value={form.title} onChange={handleChange} placeholder="Ex: Développement d'un site de réservation" required /></div>
        <div className="form-group"><label className="form-label">Description détaillée *</label><textarea className="form-input" name="description" rows={5} value={form.description} onChange={handleChange} placeholder="Décrivez votre projet..." required /></div>
        <div className="request-attachment-box">
          <div>
            <label className="form-label"><Paperclip size={14} /> Brief et fichiers utiles</label>
            <p>Images, PDF, brief ou document de référence. 5 fichiers max, 10 Mo chacun.</p>
          </div>
          <AttachmentPicker files={attachments} onChange={setAttachments} disabled={loading} />
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Catégorie *</label><CustomSelect id="request-category" label="Catégorie" className="form-custom-select" options={[{ value: '', label: 'Sélectionnez...' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]} value={form.categoryId} onChange={handleCategoryChange} /></div>
          <div className="form-group">
            <label className="form-label">Ville ou quartier</label>
            <input
              className="form-input"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder={locatingCity ? 'Detection depuis la carte...' : 'Choisissez un point sur la carte'}
              disabled={form.executionMode === 'REMOTE'}
              aria-busy={locatingCity}
            />
            {isLocalExecutionMode(form.executionMode) && (
              <small className="request-location-helper">
                {locatingCity ? 'Recherche de la ville...' : 'La ville est remplie automatiquement depuis le point choisi.'}
              </small>
            )}
          </div>
        </div>
        <div className="request-location-panel">
          <label className="form-label"><MapPin size={14} /> Mode et zone de mission</label>
          <div className="request-mode-grid" role="group" aria-label="Mode de mission">
            {MODE_OPTIONS.map(option => (
              <button
                type="button"
                key={option.value}
                className={form.executionMode === option.value ? 'active' : ''}
                onClick={() => handleExecutionModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {isLocalExecutionMode(form.executionMode) && (
            <div className="request-map-fields">
              <ServiceAreaMap
                city={form.city}
                latitude={form.latitude}
                longitude={form.longitude}
                radiusKm={form.requestRadiusKm}
                onLocationChange={handleLocationChange}
              />
              <div className="request-radius-control">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={normalizeRequestRadius(form.requestRadiusKm)}
                  onChange={(event) => setForm(prev => ({ ...prev, requestRadiusKm: Number(event.target.value) }))}
                  aria-label="Rayon acceptable"
                />
                <strong>{normalizeRequestRadius(form.requestRadiusKm)} km</strong>
              </div>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group"><label className="form-label">Budget minimum (MAD)</label><input type="number" className="form-input" name="budgetMin" value={form.budgetMin} onChange={handleChange} placeholder="3000" min="0" /></div>
          <div className="form-group"><label className="form-label">Budget maximum (MAD)</label><input type="number" className="form-input" name="budgetMax" value={form.budgetMax} onChange={handleChange} placeholder="8000" min="0" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date limite</label><input type="date" className="form-input" name="deadline" value={form.deadline} onChange={handleChange} /></div>
          <div className="form-group"><label className="form-label">Compétences requises</label><input className="form-input" name="requiredSkills" value={form.requiredSkills} onChange={handleChange} placeholder="React, Spring Boot (virgules)" /></div>
        </div>
        <div className="form-checkboxes">
          <label className="form-checkbox"><input type="checkbox" name="remote" checked={form.remote} onChange={handleChange} /> Travail à distance</label>
          <label className="form-checkbox"><input type="checkbox" name="urgent" checked={form.urgent} onChange={handleChange} /> Besoin urgent</label>
        </div>
        <div className="form-actions"><button type="submit" className="btn btn-primary btn-lg" disabled={loading || locatingCity}><Send size={16} /> {loading ? 'Publication...' : locatingCity ? 'Localisation...' : 'Publier la demande'}</button></div>
      </form>
    </div></div>
  );
}
