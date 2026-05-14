import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, CheckCircle, FileText, Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { getAssistantWebhookUrl, sendAssistantMessage } from '@/api/assistantApi';
import { getRecommendedServices } from '@/api/serviceApi';
import useAuth from '@/hooks/useAuth';
import '@/styles/ai-assistant.css';

const STORAGE_PREFIX = 'proxiskills-floating-assistant';

const ASSISTANT_CONFIG = {
  client: {
    title: 'Assistant client',
    badge: 'Brief demande',
    intro: 'Bonjour, je peux vous aider a transformer une idee en brief clair et validable.',
    placeholder: 'Ex: Je veux un site web pour mon restaurant a Agadir',
    confirmPrompt: 'oui, confirme et sauvegarde ce brouillon de demande',
    quickActions: [
      {
        label: 'Site restaurant',
        prompt:
          'Je veux un site web pour mon restaurant. Propose un brouillon complet avec categorie, budget, delai, mode et livrables a confirmer.',
      },
      {
        label: 'Logo commerce',
        prompt:
          'Je veux un logo pour mon commerce. Propose un brouillon avec categorie, budget, delai et livrables a confirmer.',
      },
      {
        label: 'App mobile',
        prompt:
          'Je veux une application mobile pour mon projet. Propose un brouillon de demande avec les champs manquants a confirmer.',
      },
    ],
  },
  freelance: {
    title: 'Assistant freelance',
    badge: 'Profil pro',
    intro: 'Bonjour, je peux vous aider a construire un profil freelance plus complet et credible.',
    placeholder: 'Ex: Je suis developpeur React Spring Boot a Marrakech',
    confirmPrompt: 'oui, confirme et sauvegarde ce brouillon de profil',
    quickActions: [
      {
        label: 'Bio pro',
        prompt:
          'Aide-moi a ameliorer ma bio freelance et propose un headline professionnel avec les champs a confirmer.',
      },
      {
        label: 'Competences',
        prompt:
          'Normalise mes competences freelance et propose les categories marketplace les plus adaptees.',
      },
      {
        label: 'Profil complet',
        prompt:
          'Aide-moi a completer mon profil avec headline, bio, competences, tarif, ville et disponibilite.',
      },
    ],
  },
};

function createId(prefix = 'msg') {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function getUserKey(user) {
  return user?.id || user?.email || user?.username || 'guest';
}

function getStorageKey(type, userKey, suffix) {
  return `${STORAGE_PREFIX}-${suffix}-${type}-${userKey}`;
}

function safeReadStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing; the chat still works in memory.
  }
}

function createSessionId(type, userKey) {
  return `${type}_${userKey}_${createId('session')}`;
}

function readSessionId(type, userKey) {
  const storageKey = getStorageKey(type, userKey, 'session');
  const storedSessionId = safeReadStorage(storageKey);

  if (storedSessionId) {
    return storedSessionId;
  }

  const nextSessionId = createSessionId(type, userKey);
  safeWriteStorage(storageKey, nextSessionId);
  return nextSessionId;
}

function persistSessionId(type, userKey, sessionId) {
  safeWriteStorage(getStorageKey(type, userKey, 'session'), sessionId);
}

function buildInitialMessages(type) {
  return [
    {
      id: createId(),
      role: 'assistant',
      content: ASSISTANT_CONFIG[type]?.intro || ASSISTANT_CONFIG.client.intro,
    },
  ];
}

function readStoredMessages(type, userKey) {
  const storageKey = getStorageKey(type, userKey, 'messages');
  const storedValue = safeReadStorage(storageKey);

  if (!storedValue) {
    return buildInitialMessages(type);
  }

  try {
    const parsedMessages = JSON.parse(storedValue);
    return Array.isArray(parsedMessages) && parsedMessages.length > 0
      ? parsedMessages
      : buildInitialMessages(type);
  } catch {
    return buildInitialMessages(type);
  }
}

function tryParseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  const trimmedValue = String(value).trim();

  try {
    return JSON.parse(trimmedValue);
  } catch {
    const fencedMatch = trimmedValue.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const objectMatch = trimmedValue.match(/\{[\s\S]*\}/);
    const candidate = fencedMatch?.[1] || objectMatch?.[0];

    if (!candidate) {
      return null;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

function unwrapStructuredPayload(payload) {
  return payload?.structured || payload;
}

function getAssistantDisplayText(responseText, payload) {
  const structuredPayload = unwrapStructuredPayload(payload);

  return (
    payload?.output ||
    structuredPayload?.output ||
    structuredPayload?.assistantMessage ||
    structuredPayload?.assistant_message ||
    payload?.assistantMessage ||
    payload?.assistant_message ||
    responseText
  );
}

function getRelevantPayload(type, payload) {
  if (!payload) {
    return null;
  }

  const structuredPayload = unwrapStructuredPayload(payload);

  if (type === 'client') {
    return structuredPayload?.brief || structuredPayload?.request || structuredPayload?.demande || null;
  }

  return structuredPayload?.profile || structuredPayload?.freelancer_profile || structuredPayload?.profil || null;
}

function hasStructuredFields(type, payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const clientFields = ['category', 'city', 'mode', 'budget', 'deadline_days', 'objective', 'deliverables'];
  const freelanceFields = [
    'headline',
    'professional_bio',
    'bio',
    'skills',
    'city',
    'availability',
    'hourly_rate',
    'primary_categories',
    'remote_mode',
  ];
  const expectedFields = type === 'client' ? clientFields : freelanceFields;

  return expectedFields.some((field) => Object.prototype.hasOwnProperty.call(payload, field));
}

function normalizeList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [value].filter(Boolean);
}

function buildStructuredSnapshot(type, payload) {
  const structuredPayload = unwrapStructuredPayload(payload);
  const relevantPayload = getRelevantPayload(type, payload);

  if (!hasStructuredFields(type, relevantPayload)) {
    return null;
  }

  const data =
    type === 'freelance'
      ? {
          ...relevantPayload,
          profile_completion_score:
            structuredPayload?.profile_completion_score ??
            structuredPayload?.profileCompletionScore ??
            relevantPayload?.profile_completion_score,
        }
      : relevantPayload;

  return {
    status: structuredPayload?.status || null,
    nextAction: structuredPayload?.nextAction || structuredPayload?.next_action || null,
    missingFields: normalizeList(structuredPayload?.missingFields || structuredPayload?.missing_fields),
    data,
  };
}

function renderValue(value, fallback = 'A confirmer') {
  if (value === null || value === undefined || value === '' || value === 0) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : fallback;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function toEditableValue(value) {
  if (value === null || value === undefined || value === 0) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join('\n');
  }

  return String(value);
}

function normalizeEditableList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEditableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function buildFinalSnapshotData(type, snapshot) {
  const data = snapshot?.data || {};

  if (type === 'client') {
    return {
      category: data.category || null,
      city: data.city || null,
      mode: data.mode || null,
      budget: normalizeEditableNumber(data.budget),
      deadline_days: normalizeEditableNumber(data.deadline_days),
      objective: data.objective || null,
      deliverables: normalizeEditableList(data.deliverables),
    };
  }

  return {
    headline: data.headline || null,
    professional_bio: data.professional_bio || data.bio || null,
    skills: normalizeEditableList(data.skills),
    city: data.city || null,
    availability: data.availability || null,
    hourly_rate: normalizeEditableNumber(data.hourly_rate),
    portfolio_url: data.portfolio_url || null,
    primary_categories: normalizeEditableList(data.primary_categories),
    remote_mode: data.remote_mode || null,
    profile_completion_score: normalizeEditableNumber(data.profile_completion_score),
  };
}

function buildFinalSnapshot(type, snapshot) {
  if (!snapshot?.data) {
    return null;
  }

  return {
    ...snapshot,
    status: 'confirmed',
    missingFields: [],
    data: buildFinalSnapshotData(type, snapshot),
  };
}

function buildConfirmationPrompt(type, snapshot, basePrompt) {
  const finalSnapshot = buildFinalSnapshot(type, snapshot);
  const finalData = finalSnapshot?.data || {};
  const payloadKey = type === 'client' ? 'brief' : 'profile';

  return [
    basePrompt,
    'Utilise exactement ces informations finales validees par l utilisateur :',
    JSON.stringify({ [payloadKey]: finalData }, null, 2),
  ].join('\n\n');
}

function buildRecommendationPath(brief) {
  const params = new URLSearchParams();
  const recommendationParams = buildRecommendationParams(brief);

  Object.entries(recommendationParams).forEach(([key, value]) => {
    if (!value || key === 'limit' || key === 'maxBudget') {
      return;
    }

    params.set(key, String(value));
  });

  if (recommendationParams.maxBudget) {
    params.set('maxPrice', String(recommendationParams.maxBudget));
  }

  params.set('sort', 'recommended');

  return `/services?${params.toString()}#services-results`;
}

function buildRecommendationParams(brief, limit = 3) {
  const keyword = brief?.objective || brief?.category || normalizeEditableList(brief?.deliverables)[0] || '';

  return {
    keyword: keyword || undefined,
    categoryName: brief?.category || undefined,
    city: brief?.city || undefined,
    maxBudget: brief?.budget || undefined,
    limit,
  };
}

function extractRecommendedServices(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => item?.service || item)
    .filter((service) => service?.id)
    .slice(0, 3);
}

function formatServicePrice(value) {
  if (!value || Number(value) <= 0) {
    return 'Prix a confirmer';
  }

  return `${Number(value).toLocaleString('fr-MA')} MAD`;
}

function formatBudget(value) {
  if (!value || Number(value) <= 0) {
    return 'A confirmer';
  }

  return `${value} MAD`;
}

function formatDeadline(value) {
  if (!value || Number(value) <= 0) {
    return 'A confirmer';
  }

  return `${value} jours`;
}

function getClientRows(data) {
  return [
    ['Categorie', data.category],
    ['Ville', data.city],
    ['Mode', data.mode],
    ['Budget', formatBudget(data.budget)],
    ['Delai', formatDeadline(data.deadline_days)],
    ['Objectif', data.objective],
    ['Livrables', data.deliverables],
  ];
}

function getFreelanceRows(data, snapshot) {
  return [
    ['Headline', data.headline],
    ['Bio', data.professional_bio || data.bio],
    ['Competences', data.skills],
    ['Ville', data.city],
    ['Disponibilite', data.availability],
    ['Tarif', data.hourly_rate ? `${data.hourly_rate} MAD / h` : null],
    ['Categories', data.primary_categories],
    ['Mode', data.remote_mode],
  ];
}

function snapshotToText(type, snapshot) {
  if (!snapshot?.data) {
    return '';
  }

  const rows = type === 'client' ? getClientRows(snapshot.data) : getFreelanceRows(snapshot.data, snapshot);

  return rows.map(([label, value]) => `${label}: ${renderValue(value)}`).join('\n');
}

const EDITABLE_FIELDS = {
  client: [
    { key: 'category', label: 'Categorie', control: 'input' },
    { key: 'city', label: 'Ville', control: 'input' },
    {
      key: 'mode',
      label: 'Mode',
      control: 'select',
      options: [
        ['', 'A confirmer'],
        ['local', 'Local'],
        ['remote', 'Remote'],
        ['hybride', 'Hybride'],
      ],
    },
    { key: 'budget', label: 'Budget', control: 'number', suffix: 'MAD' },
    { key: 'deadline_days', label: 'Delai', control: 'number', suffix: 'jours' },
    { key: 'objective', label: 'Objectif', control: 'textarea' },
    { key: 'deliverables', label: 'Livrables', control: 'list' },
  ],
  freelance: [
    { key: 'headline', label: 'Headline', control: 'input' },
    { key: 'professional_bio', label: 'Bio', control: 'textarea' },
    { key: 'skills', label: 'Competences', control: 'list' },
    { key: 'city', label: 'Ville', control: 'input' },
    {
      key: 'availability',
      label: 'Disponibilite',
      control: 'select',
      options: [
        ['', 'A confirmer'],
        ['AVAILABLE', 'Disponible'],
        ['BUSY', 'Occupe'],
        ['UNAVAILABLE', 'Indisponible'],
      ],
    },
    { key: 'hourly_rate', label: 'Tarif', control: 'number', suffix: 'MAD / h' },
    { key: 'portfolio_url', label: 'Portfolio', control: 'input' },
    { key: 'primary_categories', label: 'Categories', control: 'list' },
    {
      key: 'remote_mode',
      label: 'Mode',
      control: 'select',
      options: [
        ['', 'A confirmer'],
        ['local', 'Local'],
        ['remote', 'Remote'],
        ['hybride', 'Hybride'],
      ],
    },
  ],
};

function EditablePreviewField({ field, value, onChange }) {
  const inputId = `floating-ai-${field.key}`;
  const editableValue =
    field.control === 'number' ? String(normalizeEditableNumber(value) ?? '') : toEditableValue(value);
  const selectOptions = field.options || [];
  const hasCurrentSelectValue = selectOptions.some(([optionValue]) => optionValue === editableValue);

  const handleChange = (event) => {
    onChange(field.key, event.target.value);
  };

  return (
    <label className="floating-ai-preview-field" htmlFor={inputId}>
      <span>{field.label}</span>
      <div className="floating-ai-preview-control">
        {field.control === 'select' ? (
          <select id={inputId} value={editableValue} onChange={handleChange}>
            {!hasCurrentSelectValue && editableValue && <option value={editableValue}>{editableValue}</option>}
            {selectOptions.map(([optionValue, optionLabel]) => (
              <option value={optionValue} key={optionValue || optionLabel}>
                {optionLabel}
              </option>
            ))}
          </select>
        ) : field.control === 'textarea' || field.control === 'list' ? (
          <textarea
            id={inputId}
            value={editableValue}
            onChange={handleChange}
            rows={field.control === 'list' ? 3 : 2}
            placeholder="A confirmer"
          />
        ) : (
          <input
            id={inputId}
            type={field.control === 'number' ? 'number' : 'text'}
            min={field.control === 'number' ? '0' : undefined}
            value={editableValue}
            onChange={handleChange}
            placeholder="A confirmer"
          />
        )}
        {field.suffix && <em>{field.suffix}</em>}
      </div>
    </label>
  );
}

function StructuredPreview({ type, snapshot, onFieldChange, onConfirm, onCopy, copied, disabled }) {
  if (!snapshot?.data) {
    return null;
  }

  const fields = EDITABLE_FIELDS[type] || EDITABLE_FIELDS.client;
  const title = type === 'client' ? 'Brouillon de brief' : 'Brouillon de profil';
  const missingFields = snapshot.missingFields || [];

  return (
    <aside className="floating-ai-preview">
      <div className="floating-ai-preview-head">
        <span>
          <FileText size={15} />
          {title}
        </span>
        {snapshot.status && <strong>{snapshot.status === 'ready' ? 'Pret' : 'A confirmer'}</strong>}
      </div>

      <div className="floating-ai-preview-grid">
        {fields.map((field) => (
          <EditablePreviewField
            field={field}
            value={snapshot.data[field.key]}
            onChange={onFieldChange}
            key={field.key}
          />
        ))}
      </div>

      {missingFields.length > 0 && (
        <p className="floating-ai-missing">
          A confirmer : <strong>{missingFields.join(', ')}</strong>
        </p>
      )}

      <div className="floating-ai-preview-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}>
          <FileText size={14} /> {copied ? 'Copie' : 'Copier'}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={disabled}>
          <CheckCircle size={14} /> Confirmer
        </button>
      </div>
    </aside>
  );
}

function PostConfirmationActions({
  type,
  snapshot,
  services,
  loading,
  error,
  onServiceClick,
}) {
  if (!snapshot?.data) {
    return null;
  }

  if (type !== 'client') {
    return (
      <aside className="floating-ai-next-actions">
        <div>
          <strong>Profil brouillon sauvegarde</strong>
          <p>Vous pouvez continuer la verification dans votre espace profil.</p>
        </div>
        <Link className="btn btn-primary btn-sm" to="/freelancer/profile">
          Voir mon profil
        </Link>
      </aside>
    );
  }

  const brief = snapshot.data;

  return (
    <aside className="floating-ai-next-actions">
      <div>
        <strong>Suggestions de services</strong>
        <p>
          {renderValue(brief.category, 'Service')} {brief.city ? `a ${brief.city}` : ''} selon votre budget.
        </p>
      </div>

      {loading ? (
        <div className="floating-ai-service-loading">
          <Loader2 size={14} className="spinner" />
          Recherche des services existants...
        </div>
      ) : services.length > 0 ? (
        <div className="floating-ai-service-list">
          {services.map((service) => (
            <Link
              className="floating-ai-service-link"
              key={service.id}
              to={`/services/${service.id}`}
              onClick={onServiceClick}
            >
              <strong>{service.title || service.categoryName || 'Service recommande'}</strong>
              <span>
                {service.categoryName || 'Service'} · {formatServicePrice(service.price)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="floating-ai-service-empty">
          {error || 'Aucun service exact trouve pour ce brief. Lancez la recherche complete.'}
        </p>
      )}

      <Link className="btn btn-primary btn-sm" to={buildRecommendationPath(brief)} onClick={onServiceClick}>
        Lancer les recommandations
      </Link>
    </aside>
  );
}

export default function FloatingAiAssistant() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [structuredResult, setStructuredResult] = useState(null);
  const [confirmedResult, setConfirmedResult] = useState(null);
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(null);

  const type = user?.role === 'FREELANCER' ? 'freelance' : 'client';
  const config = ASSISTANT_CONFIG[type] || ASSISTANT_CONFIG.client;
  const userKey = getUserKey(user);
  const webhookUrl = getAssistantWebhookUrl(type);
  const messagesStorageKey = getStorageKey(type, userKey, 'messages');

  const [messages, setMessages] = useState(() => readStoredMessages(type, userKey));

  const canUseAssistant = isAuthenticated && (user?.role === 'CLIENT' || user?.role === 'FREELANCER');

  const assistantMetadata = useMemo(
    () => ({
      role: user?.role || null,
      userId: user?.id || null,
      email: user?.email || null,
      city: user?.city || null,
      pathname: location.pathname,
      source: 'floating_chatbot',
    }),
    [location.pathname, user],
  );

  useEffect(() => {
    if (!canUseAssistant) {
      return;
    }

    sessionIdRef.current = readSessionId(type, userKey);
    setMessages(readStoredMessages(type, userKey));
    setStructuredResult(null);
    setConfirmedResult(null);
    setSuggestedServices([]);
    setSuggestionsError('');
    setError('');
  }, [canUseAssistant, type, userKey]);

  useEffect(() => {
    if (!canUseAssistant) {
      return;
    }

    safeWriteStorage(messagesStorageKey, JSON.stringify(messages.slice(-30)));
  }, [canUseAssistant, messages, messagesStorageKey]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [isOpen, messages, sending, structuredResult]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  useEffect(() => {
    if (type !== 'client' || !confirmedResult?.data) {
      setSuggestedServices([]);
      setSuggestionsLoading(false);
      setSuggestionsError('');
      return undefined;
    }

    let isMounted = true;

    setSuggestionsLoading(true);
    setSuggestionsError('');

    getRecommendedServices(buildRecommendationParams(confirmedResult.data, 3))
      .then((response) => {
        if (isMounted) {
          setSuggestedServices(extractRecommendedServices(response.data));
        }
      })
      .catch(() => {
        if (isMounted) {
          setSuggestedServices([]);
          setSuggestionsError('Impossible de charger les services recommandes.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setSuggestionsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [confirmedResult, type]);

  if (!canUseAssistant) {
    return null;
  }

  const sendMessage = async (messageOverride, visibleMessageOverride, options = {}) => {
    const nextMessage = (messageOverride || input).trim();
    const visibleMessage = (visibleMessageOverride || nextMessage).trim();

    if (!nextMessage || sending || !webhookUrl) {
      if (!webhookUrl) {
        setError('Assistant indisponible pour le moment.');
      }
      return;
    }

    if (!sessionIdRef.current) {
      sessionIdRef.current = readSessionId(type, userKey);
    }

    setInput('');
    setError('');
    setCopied(false);
    if (!options.confirmSnapshot) {
      setConfirmedResult(null);
      setSuggestedServices([]);
      setSuggestionsError('');
    }
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createId(),
        role: 'user',
        content: visibleMessage,
      },
    ]);
    setSending(true);

    try {
      const responseText = await sendAssistantMessage({
        type,
        message: nextMessage,
        sessionId: sessionIdRef.current,
        metadata: assistantMetadata,
      });
      const rawPayload = tryParseJson(responseText);
      const displayText = getAssistantDisplayText(responseText, rawPayload);
      const nextSnapshot = buildStructuredSnapshot(type, rawPayload);
      const finalConfirmedSnapshot = options.confirmSnapshot ? buildFinalSnapshot(type, options.confirmSnapshot) : null;

      if (finalConfirmedSnapshot) {
        setStructuredResult(null);
        setConfirmedResult(finalConfirmedSnapshot);
      } else if (nextSnapshot) {
        setStructuredResult(nextSnapshot);
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createId(),
          role: 'assistant',
          content: finalConfirmedSnapshot
            ? type === 'client'
              ? 'Brief confirme. Voici les prochaines actions recommandees.'
              : 'Profil confirme. Voici la prochaine action.'
            : displayText,
        },
      ]);
    } catch (requestError) {
      setError(requestError.message || "Impossible de joindre l'assistant");
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createId(),
          role: 'assistant',
          content: "Je n'arrive pas a joindre l'assistant pour le moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleReset = () => {
    const nextSessionId = createSessionId(type, userKey);
    sessionIdRef.current = nextSessionId;
    persistSessionId(type, userKey, nextSessionId);
    const initialMessages = buildInitialMessages(type);
    setMessages(initialMessages);
    setStructuredResult(null);
    setConfirmedResult(null);
    setSuggestedServices([]);
    setSuggestionsError('');
    setInput('');
    setError('');
  };

  const handleCopy = async () => {
    const textToCopy = snapshotToText(type, structuredResult);

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
    } catch {
      setError('Copie indisponible dans ce navigateur');
    }
  };

  return (
    <div className={`floating-ai-assistant ${isOpen ? 'is-open' : ''}`}>
      {isOpen && (
        <section className="floating-ai-dock" aria-label="Assistant IA">
          <header className="floating-ai-header">
            <div className="floating-ai-title">
              <span className="floating-ai-avatar">
                <Bot size={20} />
              </span>
              <div>
                <p>{config.badge}</p>
                <h2>{config.title}</h2>
              </div>
            </div>
            <div className="floating-ai-header-actions">
              <button type="button" className="floating-ai-icon-button" onClick={handleReset} title="Nouvelle session">
                <Sparkles size={16} />
              </button>
              <button type="button" className="floating-ai-icon-button" onClick={() => setIsOpen(false)} title="Fermer">
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="floating-ai-messages" aria-live="polite">
            {messages.map((message) => (
              <article className={`floating-ai-message is-${message.role}`} key={message.id}>
                {message.content}
              </article>
            ))}
            {sending && (
              <article className="floating-ai-message is-assistant is-loading">
                <Loader2 size={14} className="spinner" /> Generation...
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>

          <StructuredPreview
            type={type}
            snapshot={structuredResult}
            onFieldChange={(field, value) => {
              setStructuredResult((currentSnapshot) => {
                if (!currentSnapshot?.data) {
                  return currentSnapshot;
                }

                const hasValue = String(value || '').trim().length > 0;
                const nextMissingFields = (currentSnapshot.missingFields || []).filter((missingField) => {
                  if (missingField === field) {
                    return !hasValue;
                  }

                  return true;
                });

                if (!hasValue && !nextMissingFields.includes(field)) {
                  nextMissingFields.push(field);
                }

                return {
                  ...currentSnapshot,
                  missingFields: nextMissingFields,
                  data: {
                    ...currentSnapshot.data,
                    [field]: value,
                  },
                };
              });
            }}
            onConfirm={() =>
              void sendMessage(
                buildConfirmationPrompt(type, structuredResult, config.confirmPrompt),
                type === 'client'
                  ? 'Je confirme ce brouillon avec mes modifications.'
                  : 'Je confirme ce profil avec mes modifications.',
                { confirmSnapshot: structuredResult },
              )
            }
            onCopy={handleCopy}
            copied={copied}
            disabled={sending || !webhookUrl}
          />

          <PostConfirmationActions
            type={type}
            snapshot={confirmedResult}
            services={suggestedServices}
            loading={suggestionsLoading}
            error={suggestionsError}
            onServiceClick={() => setIsOpen(false)}
          />

          {error && <p className="floating-ai-error">{error}</p>}

          <div className="floating-ai-quick-actions">
            {config.quickActions.map((action) => (
              <button
                type="button"
                key={action.label}
                onClick={() => void sendMessage(action.prompt)}
                disabled={sending || !webhookUrl}
              >
                {action.label}
              </button>
            ))}
          </div>

          <form className="floating-ai-composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={config.placeholder}
              rows={2}
              disabled={sending || !webhookUrl}
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending || !webhookUrl}>
              {sending ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
              Envoyer
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="floating-ai-launcher"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={isOpen ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
      >
        {isOpen ? <X size={23} /> : <MessageSquare size={23} />}
        <span>Assistant IA</span>
      </button>
    </div>
  );
}
