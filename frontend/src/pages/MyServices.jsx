import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Edit3,
  Eye,
  FileText,
  Image,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getActiveServices, getCategories } from '../api/serviceApi';
import {
  createFreelancerService,
  updateFreelancerService,
  deleteFreelancerService,
  uploadServiceImage,
} from '../api/userApi';
import {
  getServiceCoverImageUrl,
  getServiceGalleryImageUrls,
  stripServiceMediaSection,
} from '../utils/serviceDescription';
import './Dashboard.css';

const SERVICE_DRAFT_KEY = 'marketplace-service-wizard-draft';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const WIZARD_STEPS = [
  { title: 'Informations', label: 'Base', icon: Briefcase },
  { title: 'Description', label: 'Offre', icon: FileText },
  { title: 'Tarification', label: 'Prix', icon: DollarSign },
  { title: 'Delais', label: 'Planning', icon: CalendarDays },
  { title: 'Medias', label: 'Portfolio', icon: Image },
  { title: 'Conditions', label: 'Cadre', icon: ShieldCheck },
  { title: 'Apercu', label: 'Publier', icon: Eye },
];

const MODE_OPTIONS = [
  { value: 'REMOTE', label: 'A distance' },
  { value: 'ON_SITE', label: 'Sur place' },
  { value: 'HYBRID', label: 'Hybride' },
];

const PRICING_OPTIONS = [
  { value: 'FIXED', label: 'Prix fixe' },
  { value: 'HOURLY', label: 'Horaire' },
];

const AVAILABILITY_OPTIONS = ['Disponible', 'Occupe', 'A confirmer'];
const COMMUNICATION_OPTIONS = ['Messagerie plateforme', 'Appel', 'Visio', 'Email'];

function buildEmptyForm(defaultCity = '') {
  return {
    title: '',
    categoryId: '',
    subCategory: '',
    serviceCity: defaultCity || '',
    executionMode: 'REMOTE',
    shortDescription: '',
    detailedDescription: '',
    included: '',
    excluded: '',
    pricingType: 'FIXED',
    price: '',
    minimumBudget: '',
    extraOptions: '',
    deliveryTimeDays: '7',
    availability: 'Disponible',
    workDays: '',
    urgentDelivery: false,
    urgentDetails: '',
    coverImageUrl: '',
    galleryUrls: '',
    portfolioUrl: '',
    previousProjectUrl: '',
    documentsUrl: '',
    revisions: '2',
    communicationMode: 'Messagerie plateforme',
    cancellationTerms: '',
    clientRequirements: '',
  };
}

function normalizeLines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function fieldLine(label, value, suffix = '') {
  const normalized = String(value || '').trim();
  return normalized ? `- ${label}: ${normalized}${suffix}` : null;
}

function bulletLines(value) {
  return normalizeLines(value).map((line) => `- ${line}`);
}

function section(title, rows) {
  const cleanRows = rows.flat().filter(Boolean);
  return cleanRows.length ? `${title}\n${cleanRows.join('\n')}` : null;
}

function getPricingLabel(value) {
  return PRICING_OPTIONS.find((option) => option.value === value)?.label || 'Prix fixe';
}

function getModeLabel(value) {
  return MODE_OPTIONS.find((option) => option.value === value)?.label || 'A distance';
}

function buildPublishedDescription(form) {
  const blocks = [
    form.shortDescription.trim(),
    form.detailedDescription.trim(),
    section('Ce qui est inclus', bulletLines(form.included)),
    section("Ce qui n'est pas inclus", bulletLines(form.excluded)),
    section('Tarification', [
      fieldLine('Type de prix', getPricingLabel(form.pricingType)),
      fieldLine('Budget minimum', form.minimumBudget, ' MAD'),
      ...bulletLines(form.extraOptions),
    ]),
    section('Disponibilite et delais', [
      fieldLine('Disponibilite actuelle', form.availability),
      fieldLine('Jours de travail', form.workDays),
      form.urgentDelivery
        ? fieldLine('Livraison urgente', form.urgentDetails || 'Oui')
        : fieldLine('Livraison urgente', 'Non'),
    ]),
    section('Conditions du service', [
      fieldLine('Revisions incluses', form.revisions),
      fieldLine('Mode de communication', form.communicationMode),
      fieldLine("Conditions d'annulation", form.cancellationTerms),
      fieldLine('Pieces demandees au client', form.clientRequirements),
    ]),
    form.subCategory.trim() ? `Sous-categorie\n- ${form.subCategory.trim()}` : null,
  ];

  return blocks.filter(Boolean).join('\n\n').trim();
}

function readDraft(defaultCity) {
  try {
    const savedDraft = localStorage.getItem(SERVICE_DRAFT_KEY);
    return savedDraft ? { ...buildEmptyForm(defaultCity), ...JSON.parse(savedDraft) } : null;
  } catch {
    return null;
  }
}

function resolveExecutionMode(service) {
  if (service.executionMode) {
    return service.executionMode;
  }

  if (!service.remote) {
    return 'ON_SITE';
  }

  const city = service.serviceCity || '';
  return city && city.toLowerCase() !== 'remote' ? 'HYBRID' : 'REMOTE';
}

function resolvePayloadCity(form) {
  return form.executionMode === 'REMOTE' ? 'Remote' : form.serviceCity.trim();
}

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

function normalizePublicCategories(categories) {
  return (categories || []).filter((category) => category.isActive !== false && category.active !== false);
}

export default function MyServices() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(buildEmptyForm(user?.city));
  const [currentStep, setCurrentStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getActiveServices(), getCategories()])
      .then(([servicesResult, categoriesResult]) => {
        if (!isMounted) {
          return;
        }

        const allServices = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
        const publicCategories =
          categoriesResult.status === 'fulfilled' ? normalizePublicCategories(categoriesResult.value.data) : [];

        setServices(allServices.filter((service) => service.freelancerId === user?.id));
        setCategories(publicCategories.length ? publicCategories : extractCategories(allServices));
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

    Promise.allSettled([getActiveServices(), getCategories()])
      .then(([servicesResult, categoriesResult]) => {
        const allServices = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
        const publicCategories =
          categoriesResult.status === 'fulfilled' ? normalizePublicCategories(categoriesResult.value.data) : [];

        setServices(allServices.filter((service) => service.freelancerId === user?.id));
        setCategories(publicCategories.length ? publicCategories : extractCategories(allServices));
      })
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(readDraft(user?.city) || buildEmptyForm(user?.city));
    setCurrentStep(0);
    setValidationError('');
    setDraftMessage('');
    setShowModal(true);
  };

  const openEdit = (service) => {
    setEditId(service.id);
    setForm({
      ...buildEmptyForm(service.serviceCity || user?.city),
      title: service.title || '',
      detailedDescription: stripServiceMediaSection(service.description || ''),
      price: String(service.price || ''),
      categoryId: String(service.categoryId),
      serviceCity: service.serviceCity && service.serviceCity !== 'Remote' ? service.serviceCity : user?.city || '',
      executionMode: resolveExecutionMode(service),
      deliveryTimeDays: String(service.deliveryTimeDays ?? 7),
      coverImageUrl: getServiceCoverImageUrl(service) || '',
      galleryUrls: getServiceGalleryImageUrls(service).join('\n'),
    });
    setCurrentStep(0);
    setValidationError('');
    setDraftMessage('');
    setShowModal(true);
  };

  const updateForm = (changes) => {
    setForm((currentForm) => ({ ...currentForm, ...changes }));
    setValidationError('');
    setDraftMessage('');
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!form.title.trim()) {
        setValidationError('Ajoutez un titre pour le service.');
        return false;
      }

      if (!form.categoryId) {
        setValidationError('Choisissez une categorie.');
        return false;
      }

      if (form.executionMode !== 'REMOTE' && !form.serviceCity.trim()) {
        setValidationError('Indiquez la ville pour un service sur place ou hybride.');
        return false;
      }
    }

    const hasDescriptionContent = [
      form.shortDescription,
      form.detailedDescription,
      form.included,
      form.excluded,
    ].some((value) => String(value || '').trim().length >= 10);

    if (stepIndex === 1 && !hasDescriptionContent) {
      setValidationError('Ajoutez une description plus complete.');
      return false;
    }

    if (stepIndex === 2) {
      const price = parseFloat(form.price);
      if (Number.isNaN(price) || price < 0) {
        setValidationError('Indiquez un prix valide.');
        return false;
      }
    }

    if (stepIndex === 3) {
      const days = parseInt(form.deliveryTimeDays, 10);
      if (Number.isNaN(days) || days < 0) {
        setValidationError('Indiquez un delai valide.');
        return false;
      }
    }

    setValidationError('');
    return true;
  };

  const validateAllSteps = () => {
    for (let stepIndex = 0; stepIndex <= 3; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        setCurrentStep(stepIndex);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, WIZARD_STEPS.length - 1));
  };

  const handleSaveDraft = () => {
    localStorage.setItem(SERVICE_DRAFT_KEY, JSON.stringify(form));
    setDraftMessage('Brouillon enregistre');
  };

  const uploadImageFile = async (file) => {
    if (!file) {
      return null;
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Choisissez un fichier image.');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Choisissez une image de 5 MB maximum.');
    }

    const response = await uploadServiceImage(file);
    return response.data.url;
  };

  const handleCoverImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingCover(true);
    try {
      const imageUrl = await uploadImageFile(file);
      updateForm({ coverImageUrl: imageUrl });
    } catch (error) {
      alert(error.response?.data?.message || error.message || "Erreur lors de l'upload de l'image");
    } finally {
      setUploadingCover(false);
      event.target.value = '';
    }
  };

  const handleGalleryImagesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploadingGallery(true);
    try {
      const imageUrls = await Promise.all(files.map((file) => uploadImageFile(file)));
      const previousUrls = normalizeLines(form.galleryUrls);
      updateForm({ galleryUrls: [...previousUrls, ...imageUrls.filter(Boolean)].join('\n') });
    } catch (error) {
      alert(error.response?.data?.message || error.message || "Erreur lors de l'upload des images");
    } finally {
      setUploadingGallery(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (currentStep < WIZARD_STEPS.length - 1) {
      handleNext();
      return;
    }

    if (!validateAllSteps()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: buildPublishedDescription(form),
        price: parseFloat(form.price),
        categoryId: parseInt(form.categoryId, 10),
        deliveryTimeDays: parseInt(form.deliveryTimeDays, 10),
        serviceCity: resolvePayloadCity(form),
        remote: form.executionMode !== 'ON_SITE',
        coverImageUrl: form.coverImageUrl || null,
        galleryImageUrls: normalizeLines(form.galleryUrls),
      };

      if (editId) {
        await updateFreelancerService(editId, payload);
      } else {
        await createFreelancerService(payload);
      }

      localStorage.removeItem(SERVICE_DRAFT_KEY);
      setShowModal(false);
      refreshServices();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find((category) => String(category.id) === String(form.categoryId));
  const previewDescription = buildPublishedDescription(form);
  const activeStep = WIZARD_STEPS[currentStep];
  const ActiveStepIcon = activeStep.icon;

  const renderSegmentedOptions = (options, value, field) => (
    <div className="wizard-segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'active' : ''}
          onClick={() => updateForm({ [field]: option.value })}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const renderStepFields = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="wizard-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Titre du service</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(event) => updateForm({ title: event.target.value })}
                required
                placeholder="Ex: Creation de site vitrine professionnel"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categorie</label>
              <select
                className="form-input"
                value={form.categoryId}
                onChange={(event) => updateForm({ categoryId: event.target.value })}
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
            <div className="form-group">
              <label className="form-label">Sous-categorie</label>
              <input
                className="form-input"
                value={form.subCategory}
                onChange={(event) => updateForm({ subCategory: event.target.value })}
                placeholder="Ex: Site vitrine"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <input
                className="form-input"
                value={form.executionMode === 'REMOTE' ? 'Remote' : form.serviceCity}
                onChange={(event) => updateForm({ serviceCity: event.target.value })}
                disabled={form.executionMode === 'REMOTE'}
                required={form.executionMode !== 'REMOTE'}
                placeholder="Ex: Fes"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mode de service</label>
              {renderSegmentedOptions(MODE_OPTIONS, form.executionMode, 'executionMode')}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="wizard-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Description courte</label>
              <textarea
                className="form-textarea"
                value={form.shortDescription}
                onChange={(event) => updateForm({ shortDescription: event.target.value })}
                placeholder="Une phrase claire qui resume votre offre."
                rows={3}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Description detaillee</label>
              <textarea
                className="form-textarea"
                value={form.detailedDescription}
                onChange={(event) => updateForm({ detailedDescription: event.target.value })}
                required
                placeholder="Expliquez votre methode, votre livrable et ce que le client peut attendre."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ce qui est inclus</label>
              <textarea
                className="form-textarea"
                value={form.included}
                onChange={(event) => updateForm({ included: event.target.value })}
                placeholder="Design responsive&#10;Page accueil&#10;Formulaire contact"
                rows={5}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ce qui n'est pas inclus</label>
              <textarea
                className="form-textarea"
                value={form.excluded}
                onChange={(event) => updateForm({ excluded: event.target.value })}
                placeholder="Hebergement&#10;Nom de domaine"
                rows={5}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="wizard-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Type de prix</label>
              {renderSegmentedOptions(PRICING_OPTIONS, form.pricingType, 'pricingType')}
            </div>
            <div className="form-group">
              <label className="form-label">Prix (MAD)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => updateForm({ price: event.target.value })}
                required
                placeholder="1500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Budget minimum (MAD)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.minimumBudget}
                onChange={(event) => updateForm({ minimumBudget: event.target.value })}
                placeholder="1000"
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Options supplementaires</label>
              <textarea
                className="form-textarea"
                value={form.extraOptions}
                onChange={(event) => updateForm({ extraOptions: event.target.value })}
                placeholder="Ajout blog +300 DH&#10;Page supplementaire +150 DH"
                rows={4}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="wizard-form-grid">
            <div className="form-group">
              <label className="form-label">Delai de livraison (jours)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.deliveryTimeDays}
                onChange={(event) => updateForm({ deliveryTimeDays: event.target.value })}
                required
                placeholder="7"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Disponibilite actuelle</label>
              <select
                className="form-input"
                value={form.availability}
                onChange={(event) => updateForm({ availability: event.target.value })}
              >
                {AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label className="form-label">Jours de travail</label>
              <input
                className="form-input"
                value={form.workDays}
                onChange={(event) => updateForm({ workDays: event.target.value })}
                placeholder="Ex: Lundi a vendredi"
              />
            </div>
            <label className="wizard-check full-width">
              <input
                type="checkbox"
                checked={form.urgentDelivery}
                onChange={(event) => updateForm({ urgentDelivery: event.target.checked })}
              />
              <span>Livraison urgente possible</span>
            </label>
            {form.urgentDelivery && (
              <div className="form-group full-width">
                <label className="form-label">Condition urgence</label>
                <input
                  className="form-input"
                  value={form.urgentDetails}
                  onChange={(event) => updateForm({ urgentDetails: event.target.value })}
                  placeholder="Ex: Oui avec supplement"
                />
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="wizard-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Image de couverture</label>
              <div className="wizard-upload-box">
                <input
                  id="service-cover-upload"
                  className="wizard-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  disabled={uploadingCover}
                />
                {form.coverImageUrl ? (
                  <img src={form.coverImageUrl} alt="Apercu de couverture" className="wizard-upload-preview" />
                ) : (
                  <div className="wizard-upload-empty">
                    <Image size={24} />
                    <span>Aucune image selectionnee</span>
                  </div>
                )}
                <div className="wizard-upload-actions">
                  <label htmlFor="service-cover-upload" className="btn btn-secondary btn-sm">
                    <Image size={15} /> {uploadingCover ? 'Upload...' : 'Choisir depuis appareil'}
                  </label>
                  {form.coverImageUrl && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => updateForm({ coverImageUrl: '' })}
                      disabled={uploadingCover}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group full-width">
              <label className="form-label">Images du service</label>
              <input
                id="service-gallery-upload"
                className="wizard-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryImagesChange}
                disabled={uploadingGallery}
              />
              <label htmlFor="service-gallery-upload" className="btn btn-secondary btn-sm wizard-gallery-trigger">
                <Image size={15} /> {uploadingGallery ? 'Upload...' : 'Uploader des images'}
              </label>
              <textarea
                className="form-textarea"
                value={form.galleryUrls}
                onChange={(event) => updateForm({ galleryUrls: event.target.value })}
                placeholder="Les liens des images uploadees apparaissent ici, un lien par ligne"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Portfolio</label>
              <input
                className="form-input"
                value={form.portfolioUrl}
                onChange={(event) => updateForm({ portfolioUrl: event.target.value })}
                placeholder="https://behance.net/..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Lien projet precedent</label>
              <input
                className="form-input"
                value={form.previousProjectUrl}
                onChange={(event) => updateForm({ previousProjectUrl: event.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Documents ou exemples</label>
              <input
                className="form-input"
                value={form.documentsUrl}
                onChange={(event) => updateForm({ documentsUrl: event.target.value })}
                placeholder="Lien Drive, PDF, maquette..."
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="wizard-form-grid">
            <div className="form-group">
              <label className="form-label">Nombre de revisions</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.revisions}
                onChange={(event) => updateForm({ revisions: event.target.value })}
                placeholder="2"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mode de communication</label>
              <select
                className="form-input"
                value={form.communicationMode}
                onChange={(event) => updateForm({ communicationMode: event.target.value })}
              >
                {COMMUNICATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label className="form-label">Conditions d'annulation</label>
              <textarea
                className="form-textarea"
                value={form.cancellationTerms}
                onChange={(event) => updateForm({ cancellationTerms: event.target.value })}
                placeholder="Ex: Annulation possible avant le demarrage de la mission."
                rows={4}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Pieces demandees au client</label>
              <textarea
                className="form-textarea"
                value={form.clientRequirements}
                onChange={(event) => updateForm({ clientRequirements: event.target.value })}
                placeholder="Logo, textes, charte graphique, acces..."
                rows={4}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="wizard-preview">
            <div className="wizard-preview-main">
              {form.coverImageUrl && (
                <img src={form.coverImageUrl} alt="Apercu du service" className="wizard-preview-cover" />
              )}
              {normalizeLines(form.galleryUrls).length > 0 && (
                <div className="wizard-preview-gallery">
                  {normalizeLines(form.galleryUrls).map((imageUrl) => (
                    <img src={imageUrl} alt="" key={imageUrl} />
                  ))}
                </div>
              )}
              <div className="service-detail-badge-row">
                <span className="badge badge-primary">{selectedCategory?.name || 'Categorie'}</span>
                <span className="service-chip">{getModeLabel(form.executionMode)}</span>
                <span className="service-chip">Sous {form.deliveryTimeDays || 0} jours</span>
              </div>
              <h3>{form.title || 'Titre du service'}</h3>
              <strong>{form.price || 0} MAD</strong>
              <p>{previewDescription || 'La description apparaitra ici avant publication.'}</p>
            </div>
            <div className="wizard-preview-meta">
              <span>
                <MapPin size={15} /> {form.executionMode === 'REMOTE' ? 'Remote' : form.serviceCity || 'Ville'}
              </span>
              <span>{getPricingLabel(form.pricingType)}</span>
              <span>{form.revisions || 0} revisions</span>
              <span>{form.availability}</span>
            </div>
            <div className="wizard-edit-grid">
              {WIZARD_STEPS.slice(0, 6).map((step, index) => (
                <button key={step.title} type="button" onClick={() => setCurrentStep(index)}>
                  <Edit3 size={14} /> Modifier {step.label}
                </button>
              ))}
            </div>
          </div>
        );
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
            <div className="modal-content service-wizard-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">{editId ? 'Modifier le service' : 'Nouveau service'}</h2>
                  <span className="wizard-step-count">
                    Etape {currentStep + 1} sur {WIZARD_STEPS.length}
                  </span>
                </div>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="wizard-steps" aria-label="Progression du formulaire">
                {WIZARD_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  return (
                    <button
                      key={step.title}
                      type="button"
                      className={`${index === currentStep ? 'active' : ''} ${index < currentStep ? 'done' : ''}`}
                      onClick={() => setCurrentStep(index)}
                      disabled={submitting}
                    >
                      <span className="wizard-step-icon">
                        {index < currentStep ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                      </span>
                      <span>{step.label}</span>
                    </button>
                  );
                })}
              </div>

              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="wizard-step-panel">
                  <div className="wizard-step-heading">
                    <span>
                      <ActiveStepIcon size={20} />
                    </span>
                    <h3>{activeStep.title}</h3>
                  </div>
                  {renderStepFields()}
                </div>

                {validationError && <p className="form-error">{validationError}</p>}
                {draftMessage && <p className="wizard-draft-message">{draftMessage}</p>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
                    disabled={currentStep === 0 || submitting}
                  >
                    <ArrowLeft size={16} /> Precedent
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveDraft} disabled={submitting}>
                    <Save size={16} /> Enregistrer brouillon
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Enregistrement...
                      </>
                    ) : currentStep < WIZARD_STEPS.length - 1 ? (
                      <>
                        Suivant <ArrowRight size={16} />
                      </>
                    ) : (
                      editId ? 'Mettre a jour' : 'Publier'
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
