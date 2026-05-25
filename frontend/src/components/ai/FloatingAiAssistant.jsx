import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, CheckCircle, FileText, Loader2, MessageSquare, Search, Send, Sparkles, UserPlus, X } from 'lucide-react';
import { getAssistantWebhookUrl, sendAssistantMessage } from '@/api/assistantApi';
import { getRecommendedServices, matchClientNeed } from '@/api/serviceApi';
import useAuth from '@/hooks/useAuth';
import '@/styles/ai-assistant.css';

const STORAGE_PREFIX = 'proxiskills-floating-assistant-v2';

const ASSISTANT_CONFIG = {
  general: {
    title: 'Assistant marketplace',
    badge: '',
    intro:
      'Bonjour, ecrivez ce que vous voulez faire sur la plateforme. Je comprends le message et je vous guide directement.',
    placeholder: 'Ecrivez votre message...',
    confirmPrompt: '',
    quickActions: [],
  },
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
      {
        label: 'Offre service',
        prompt:
          'Genere une meilleure offre de service avec titre, description, prix conseille, mots-cles, delai et livrables.',
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

function normalizeAssistantText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isFreelanceIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return [
    'devenir freelance',
    'freelance',
    'prestataire',
    'proposer mes services',
    'vendre mes services',
    'profil',
    'competences',
  ].some((signal) => normalizedMessage.includes(signal));
}

function isPlatformHelpIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return ['comment ca marche', 'plateforme', 'inscription', 'compte', 'login', 'connexion', 'aide'].some((signal) =>
    normalizedMessage.includes(signal),
  );
}

function isAccountIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return [
    'creer un compte',
    'creer compte',
    'cree un compte',
    'cree compte',
    'nouveau compte',
    'ouvrir un compte',
    'm inscrire',
    "m'inscrire",
    'inscription',
    'inscrire',
    'register',
    'signup',
    'sign up',
    'compte dans ce site',
    'compte sur ce site',
  ].some((signal) => normalizedMessage.includes(signal));
}

function isLoginIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return ['connexion', 'connecter', 'se connecter', 'login', 'sign in', 'mot de passe'].some((signal) =>
    normalizedMessage.includes(signal),
  );
}

function isMessagesIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return ['message', 'messages', 'messagerie', 'conversation', 'chat', 'discuter'].some((signal) =>
    normalizedMessage.includes(signal),
  );
}

function isNotificationsIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return ['notification', 'notifications', 'alerte', 'alertes'].some((signal) => normalizedMessage.includes(signal));
}

function isMissionTrackingIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return [
    'mes missions',
    'mes commandes',
    'mission en cours',
    'commande en cours',
    'livraison',
    'livraisons',
    'suivi',
    'suivre',
    'statut',
    'revision',
    'litige',
  ].some((signal) => normalizedMessage.includes(signal));
}

function isCreateRequestIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return [
    'publier une demande',
    'creer une demande',
    'cree une demande',
    'nouvelle demande',
    'deposer une demande',
    'poster une demande',
    'demande publique',
  ].some((signal) => normalizedMessage.includes(signal));
}

function isBrowseRequestsIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return [
    'voir les demandes',
    'parcourir les demandes',
    'trouver des demandes',
    'postuler a une demande',
    'candidater a une demande',
  ].some((signal) => normalizedMessage.includes(signal));
}

function isGreetingOnly(message) {
  const normalizedMessage = normalizeAssistantText(message)
    .replace(/[^\w\s]/g, ' ')
    .trim();

  if (!normalizedMessage) {
    return true;
  }

  const tokens = normalizedMessage.split(/\s+/).filter(Boolean);
  const greetingWords = ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'salam', 'slm', 'coucou', 'merci', 'ok'];

  return tokens.length <= 3 && tokens.every((token) => greetingWords.includes(token));
}

function hasServiceRecommendationIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);

  if (isGreetingOnly(message) || isAccountIntent(message) || isLoginIntent(message)) {
    return false;
  }

  const tokens = normalizedMessage.split(/\s+/).filter((token) => token.length > 2);
  const actionSignals = [
    'cherche',
    'besoin',
    'trouver',
    'recommande',
    'recommend',
    'freelance',
    'service',
    'prestataire',
    'mission',
    'projet',
    'creer',
    'creation',
    'realiser',
    'faire',
    'developper',
    'construire',
  ];
  const serviceSignals = [
    'site',
    'web',
    'logo',
    'application',
    'app',
    'mobile',
    'design',
    'seo',
    'wordpress',
    'ecommerce',
    'boutique',
    'restaurant',
    'landing',
    'developpement',
    'marketing',
    'video',
    'photo',
    'montage',
    'redaction',
    'traduction',
    'reseau',
    'instagram',
  ];
  const hasActionSignal = actionSignals.some((signal) => normalizedMessage.includes(signal));
  const hasServiceSignal = serviceSignals.some((signal) => normalizedMessage.includes(signal));

  return hasActionSignal && (hasServiceSignal || tokens.length >= 5);
}

function isServiceDraftIntent(message) {
  const normalizedMessage = normalizeAssistantText(message);
  return [
    'ameliorer mon service',
    'ameliorer mon offre',
    'description de service',
    'titre de service',
    'prix conseille',
    'mots-cles',
    'mots cles',
    'offre service',
    'creer une offre',
  ].some((signal) => normalizedMessage.includes(signal));
}

function buildLocalServiceDraft(message) {
  const normalizedMessage = normalizeAssistantText(message);
  const keywordCandidates = [
    'react',
    'spring boot',
    'java',
    'design',
    'figma',
    'wordpress',
    'seo',
    'logo',
    'video',
    'photo',
    'reseau',
    'instagram',
  ].filter((keyword) => normalizedMessage.includes(keyword));
  const keywords = keywordCandidates.length ? keywordCandidates : ['service professionnel', 'freelance', 'livraison'];
  const mainKeyword = keywords[0].replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    title: `${mainKeyword} sur mesure pour votre projet`,
    description:
      message && message.length > 30
        ? `Je vous accompagne de maniere claire et structuree sur ce besoin : ${message}. L'offre inclut un cadrage, une execution soignee, des retours intermediaires et une livraison prete a utiliser.`
        : 'Je propose un service clair, rapide et adapte aux besoins du client, avec cadrage, execution, corrections et livraison finale.',
    suggestedPrice: 800,
    keywords,
    deliveryDays: 5,
    deliverables: ['Cadrage du besoin', 'Livraison finale', 'Corrections incluses'],
  };
}

function buildLocalServiceDraftMessage(draft) {
  return [
    'Voici une version amelioree de votre offre service.',
    `Titre : ${draft.title}`,
    `Description : ${draft.description}`,
    `Prix conseille : ${draft.suggestedPrice} MAD`,
    `Mots-cles : ${draft.keywords.join(', ')}`,
    `Delai conseille : ${draft.deliveryDays} jours`,
    `Livrables : ${draft.deliverables.join(', ')}`,
  ].join('\n');
}

function buildLowIntentMessage(message) {
  if (isGreetingOnly(message)) {
    return 'Bonjour. Dites-moi ce que vous voulez faire sur la plateforme, et je vous guiderai directement.';
  }

  return 'Je peux vous aider, mais j ai besoin d un peu plus de contexte. Indiquez ce que vous voulez faire : creer un compte, vous connecter, publier une offre, chercher un service ou suivre une mission.';
}

function buildAccountGuide(user) {
  if (user?.id) {
    return {
      content:
        'Vous etes deja connecte. Je peux vous orienter vers votre espace selon ce que vous voulez faire maintenant.',
      generalResult: {
        kind: 'accountGuide',
        title: 'Compte deja connecte',
        description: 'Accedez a votre profil, vos messages ou vos notifications depuis votre espace.',
        actions: [
          { label: 'Mon espace', path: getRoleHomePath(user) },
          { label: 'Messages', path: '/messages' },
        ],
      },
    };
  }

  return {
    content:
      'Pour creer un compte, ouvrez la page d inscription, choisissez votre role puis completez les informations demandees.',
    generalResult: {
      kind: 'accountGuide',
      title: 'Creer un compte',
      description: 'Inscrivez-vous comme client pour commander, ou comme freelance pour publier vos services.',
      actions: [
        { label: 'Creer un compte', path: '/register' },
        { label: 'Se connecter', path: '/login' },
      ],
    },
  };
}

function buildLoginGuide() {
  return {
    content:
      'Pour acceder a votre compte, ouvrez la page de connexion puis saisissez votre email et votre mot de passe.',
    generalResult: {
      kind: 'accountGuide',
      title: 'Connexion',
      description: 'Connectez-vous pour retrouver vos messages, commandes, demandes et notifications.',
      actions: [
        { label: 'Se connecter', path: '/login' },
        { label: 'Creer un compte', path: '/register' },
      ],
    },
  };
}

function getRoleHomePath(user) {
  if (user?.role === 'FREELANCER') {
    return '/freelancer/dashboard';
  }

  if (user?.role === 'ADMIN') {
    return '/admin/dashboard';
  }

  return '/client/dashboard';
}

function getOrdersPath(user) {
  return user?.role === 'FREELANCER' ? '/freelancer/orders' : '/client/orders';
}

function buildGuestAccessGuide(featureLabel) {
  return {
    content: `Connectez-vous pour acceder a ${featureLabel}. Si vous n'avez pas encore de compte, creez-en un en choisissant votre role.`,
    generalResult: {
      kind: 'accountGuide',
      title: 'Acces au compte',
      description: `Cette partie est liee a votre espace personnel : ${featureLabel}.`,
      actions: [
        { label: 'Se connecter', path: '/login' },
        { label: 'Creer un compte', path: '/register' },
      ],
    },
  };
}

function buildMessagesGuide(user) {
  if (!user?.id) {
    return buildGuestAccessGuide('vos messages');
  }

  return {
    content: 'Ouvrez la messagerie pour reprendre une discussion avec un client ou un freelance.',
    generalResult: {
      kind: 'messagesGuide',
      title: 'Messages',
      description: 'Retrouvez vos conversations et continuez les echanges autour des services ou missions.',
      actions: [
        { label: 'Ouvrir les messages', path: '/messages' },
        { label: 'Notifications', path: '/notifications' },
      ],
    },
  };
}

function buildNotificationsGuide(user) {
  if (!user?.id) {
    return buildGuestAccessGuide('vos notifications');
  }

  return {
    content: 'Ouvrez vos notifications pour voir les nouvelles activites, demandes, messages ou missions a traiter.',
    generalResult: {
      kind: 'notificationsGuide',
      title: 'Notifications',
      description: 'Suivez les alertes importantes liees a votre compte marketplace.',
      actions: [
        { label: 'Voir les notifications', path: '/notifications' },
        { label: 'Messages', path: '/messages' },
      ],
    },
  };
}

function buildMissionGuide(user) {
  if (!user?.id) {
    return buildGuestAccessGuide('vos missions et commandes');
  }

  return {
    content: 'Ouvrez votre suivi de missions pour verifier les commandes, livraisons, revisions et prochaines actions.',
    generalResult: {
      kind: 'missionGuide',
      title: 'Missions et commandes',
      description: 'Consultez les missions en cours, les livraisons et les actions attendues.',
      actions: [
        { label: 'Voir les missions', path: getOrdersPath(user) },
        { label: 'Messages', path: '/messages' },
      ],
    },
  };
}

function buildRequestGuide(user) {
  if (!user?.id) {
    return {
      content:
        'Pour publier une demande, creez un compte client ou connectez-vous. Les demandes publiques permettent de recevoir des propositions de freelances.',
      generalResult: {
        kind: 'requestGuide',
        title: 'Publier une demande',
        description: 'Un compte client est necessaire pour publier et suivre une demande.',
        actions: [
          { label: 'Creer un compte', path: '/register' },
          { label: 'Voir les demandes', path: '/requests' },
        ],
      },
    };
  }

  if (user.role === 'FREELANCER') {
    return {
      content: 'Vous pouvez parcourir les demandes publiques et postuler aux missions adaptees a vos services.',
      generalResult: {
        kind: 'requestGuide',
        title: 'Demandes publiques',
        description: 'Consultez les besoins publies par les clients et envoyez vos propositions.',
        actions: [
          { label: 'Voir les demandes', path: '/requests' },
          { label: 'Mes candidatures', path: '/freelancer/proposals' },
        ],
      },
    };
  }

  return {
    content: 'Ouvrez votre espace client pour publier une nouvelle demande ou suivre les demandes deja creees.',
    generalResult: {
      kind: 'requestGuide',
      title: 'Demandes client',
      description: 'Publiez un besoin clair, comparez les propositions et suivez les echanges.',
      actions: [
        { label: 'Nouvelle demande', path: '/client/requests/new' },
        { label: 'Mes demandes', path: '/client/requests' },
      ],
    },
  };
}

function buildBrowseRequestsGuide() {
  return {
    content: 'Les demandes publiques sont accessibles depuis la page des demandes. Vous pouvez les parcourir et ouvrir le detail d une mission.',
    generalResult: {
      kind: 'requestGuide',
      title: 'Demandes publiques',
      description: 'Parcourez les besoins clients disponibles sur la marketplace.',
      actions: [
        { label: 'Voir les demandes', path: '/requests' },
        { label: 'Explorer les services', path: '/services' },
      ],
    },
  };
}

function buildFreelanceGuide(user) {
  if (user?.role === 'FREELANCER') {
    return {
      content:
        'Vous pouvez gerer votre activite freelance depuis votre profil, vos services, les demandes recues et vos missions.',
      generalResult: {
        kind: 'freelanceGuide',
        title: 'Espace freelance',
        description: 'Completez votre profil, publiez vos services et suivez vos demandes.',
        actions: [
          { label: 'Mon profil', path: '/freelancer/profile' },
          { label: 'Mes services', path: '/freelancer/services' },
          { label: 'Demandes recues', path: '/freelancer/requests' },
        ],
      },
    };
  }

  return {
    content:
      'Pour proposer vos services, commencez par creer un compte freelance, puis completez votre profil, vos competences, votre ville et vos premiers services.',
    generalResult: {
      kind: 'freelanceGuide',
      title: 'Demarrer comme freelance',
      description: 'Creez un compte freelance, completez votre profil, ajoutez vos services, puis suivez les demandes.',
      actions: [
        { label: 'Creer un compte freelance', path: '/register' },
        { label: 'Voir les services', path: '/services' },
      ],
    },
  };
}

function buildPlatformGuide(message, user) {
  if (isLoginIntent(message)) {
    return buildLoginGuide();
  }

  if (isAccountIntent(message)) {
    return buildAccountGuide(user);
  }

  return {
    content:
      'Je peux vous orienter pour creer un compte, chercher un service, publier une offre, suivre une mission, ouvrir les messages ou consulter les notifications.',
    generalResult: {
      kind: 'platformGuide',
      title: 'Utiliser la marketplace',
      description: 'Choisissez l action qui correspond a votre objectif actuel.',
      actions: user?.id
        ? [
            { label: 'Mon espace', path: getRoleHomePath(user) },
            { label: 'Messages', path: '/messages' },
            { label: 'Notifications', path: '/notifications' },
          ]
        : [
            { label: 'Creer un compte', path: '/register' },
            { label: 'Se connecter', path: '/login' },
            { label: 'Explorer les services', path: '/services' },
          ],
    },
  };
}

function buildDeterministicGlobalGuide(message, user) {
  if (isServiceDraftIntent(message)) {
    return null;
  }

  if (isLoginIntent(message)) {
    return buildLoginGuide();
  }

  if (isAccountIntent(message)) {
    return buildAccountGuide(user);
  }

  if (isMessagesIntent(message)) {
    return buildMessagesGuide(user);
  }

  if (isNotificationsIntent(message)) {
    return buildNotificationsGuide(user);
  }

  if (isMissionTrackingIntent(message)) {
    return buildMissionGuide(user);
  }

  if (isCreateRequestIntent(message)) {
    return buildRequestGuide(user);
  }

  if (isBrowseRequestsIntent(message)) {
    return buildBrowseRequestsGuide();
  }

  if (isPlatformHelpIntent(message)) {
    return buildPlatformGuide(message, user);
  }

  return null;
}

function buildBriefFromMatch(message, interpretedRequest = {}, extractedKeywords = []) {
  return {
    category: interpretedRequest.categoryName || null,
    city: interpretedRequest.city || null,
    mode: interpretedRequest.mode || null,
    budget: normalizeEditableNumber(interpretedRequest.maxBudget),
    deadline_days: normalizeEditableNumber(interpretedRequest.maxDeliveryDays),
    objective: message || interpretedRequest.keyword || null,
    deliverables: extractedKeywords?.length ? extractedKeywords.slice(0, 5) : [],
  };
}

function getMissingClientFields(brief) {
  return [
    !brief.category && 'category',
    !brief.city && 'city',
    !brief.budget && 'budget',
    !brief.deadline_days && 'deadline_days',
    !brief.objective && 'objective',
  ].filter(Boolean);
}

function buildClientMatchMessage(matchResponse, includeRecommendationList = true) {
  const recommendations = matchResponse?.recommendations || [];
  const lines = [matchResponse?.summary || 'Voici les recommandations les plus proches du besoin.'];

  if (includeRecommendationList && recommendations.length > 0) {
    lines.push(
      recommendations
        .slice(0, 3)
        .map((recommendation, index) => {
          const service = recommendation.service;
          const score = Math.round(Number(recommendation.score || 0) * 100);
          const reasons = (recommendation.reasons || []).join(', ');
          return `${index + 1}. ${service.title} (${score}% match) - ${reasons}`;
        })
        .join('\n'),
    );
  }

  return lines.filter(Boolean).join('\n\n');
}

function getGeneralMessageContent(payload, fallback, result) {
  if (!result) {
    return fallback;
  }

  const structuredPayload = unwrapStructuredPayload(payload);
  const assistantMessage =
    structuredPayload?.assistantMessage ||
    structuredPayload?.assistant_message ||
    result.data?.summary ||
    result.description ||
    fallback;

  return assistantMessage || fallback;
}

function navigationToActions(navigation) {
  if (!navigation || typeof navigation !== 'object') {
    return [];
  }

  return [
    navigation.primary_path && {
      label: navigation.primary_label || 'Ouvrir',
      path: navigation.primary_path,
    },
    navigation.secondary_path && {
      label: navigation.secondary_label || 'Voir aussi',
      path: navigation.secondary_path,
    },
  ].filter(Boolean);
}

function buildGeneralResultFromPayload(payload, message, user) {
  const structuredPayload = unwrapStructuredPayload(payload);

  if (!structuredPayload || typeof structuredPayload !== 'object') {
    return null;
  }

  const assistantMessage =
    structuredPayload.assistantMessage ||
    structuredPayload.assistant_message ||
    payload?.output ||
    'Voici la meilleure suite proposee.';
  const navigationActions = navigationToActions(structuredPayload.navigation);
  const deterministicGuide = buildDeterministicGlobalGuide(message, user);

  if (deterministicGuide && deterministicGuide.generalResult?.kind !== 'platformGuide') {
    return deterministicGuide.generalResult;
  }

  const recommendations = normalizeList(structuredPayload.recommendations)
    .map((recommendation) => {
      const service = recommendation.service || {};
      const serviceId = service.id ?? recommendation.service_id ?? recommendation.serviceId ?? recommendation.id;

      if (!serviceId) {
        return null;
      }

      return {
        score: Number(recommendation.score || 0),
        reasons: normalizeList(recommendation.reasons),
        service: {
          id: serviceId,
          title: service.title || recommendation.title || 'Service recommande',
          price: service.price ?? recommendation.price,
          city: service.city || recommendation.city,
        },
      };
    })
    .filter(Boolean);

  if (recommendations.length > 0) {
    return {
      kind: 'matches',
      data: {
        summary: assistantMessage,
        recommendations,
      },
    };
  }

  const intent = structuredPayload.intent || structuredPayload.nextAction || structuredPayload.next_action || '';

  if (intent === 'account_help' || intent === 'login_help') {
    const guide = intent === 'login_help' ? buildLoginGuide().generalResult : buildAccountGuide(user).generalResult;

    return {
      ...guide,
      description: assistantMessage || guide.description,
    };
  }

  if (structuredPayload.serviceDraft || structuredPayload.service_draft || intent === 'service_optimizer') {
    return {
      kind: 'platformGuide',
      title: 'Offre service amelioree',
      description: assistantMessage,
      actions: navigationActions.length
        ? navigationActions
        : [
            { label: 'Publier un service', path: '/freelancer/services' },
            { label: 'Mon profil', path: '/freelancer/profile' },
          ],
    };
  }

  if (structuredPayload.profile || String(intent).includes('freelance')) {
    const guide = buildFreelanceGuide(user).generalResult;

    return {
      ...guide,
      description: assistantMessage || guide.description,
    };
  }

  if (intent === 'unknown' || structuredPayload.status === 'need_more_info') {
    const guide = buildPlatformGuide('', user).generalResult;

    return {
      ...guide,
      description: assistantMessage || guide.description,
    };
  }

  if (intent === 'platform_help') {
    const guide = buildPlatformGuide(message, user).generalResult;

    return {
      ...guide,
      description: assistantMessage || guide.description,
    };
  }

  if (deterministicGuide) {
    return deterministicGuide.generalResult;
  }

  if (structuredPayload.navigation) {
    return {
      kind: 'platformGuide',
      title: 'Continuer',
      description: assistantMessage,
      actions: navigationActions.length
        ? navigationActions
        : buildPlatformGuide('', user).generalResult.actions,
    };
  }

  return null;
}

function buildLocalFreelanceProfile(message, user) {
  const normalizedMessage = normalizeAssistantText(message);
  const knownSkills = [
    'react',
    'spring boot',
    'java',
    'design',
    'figma',
    'photoshop',
    'photo',
    'video',
    'seo',
    'wordpress',
    'wifi',
    'reseau',
    'redaction',
    'instagram',
  ];
  const skills = knownSkills
    .filter((skill) => normalizedMessage.includes(skill))
    .map((skill) => skill.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const uniqueSkills = [...new Set(skills)];
  const mainSkill = uniqueSkills[0] || 'Service freelance';
  const city = user?.city || null;

  return {
    headline: `${mainSkill} pour missions locales et a distance`,
    professional_bio:
      message && message.length > 20
        ? `Profil a partir de votre description : ${message}`
        : 'Freelance disponible pour des missions locales, avec un profil a completer avant publication.',
    skills: uniqueSkills,
    city,
    availability: 'AVAILABLE',
    hourly_rate: null,
    portfolio_url: null,
    primary_categories: uniqueSkills.length ? uniqueSkills.slice(0, 3) : [],
    remote_mode: 'hybride',
    profile_completion_score: uniqueSkills.length >= 3 ? 70 : 45,
  };
}

function buildLocalFreelanceMessage(profile) {
  return [
    'Je peux vous aider a demarrer comme freelance. Voici un brouillon de profil a corriger ou completer.',
    `Headline : ${profile.headline}`,
    `Competences : ${profile.skills.length ? profile.skills.join(', ') : 'a confirmer'}`,
    `Ville : ${profile.city || 'a confirmer'}`,
    'Vous pouvez creer un compte freelance puis affiner le profil dans votre espace.',
  ].join('\n');
}

async function buildLocalAssistantResponse({ type, message, user }) {
  if (isServiceDraftIntent(message)) {
    const serviceDraft = buildLocalServiceDraft(message);
    return {
      content: buildLocalServiceDraftMessage(serviceDraft),
      generalResult:
        type === 'general'
          ? {
              kind: 'platformGuide',
              title: 'Offre service amelioree',
              description: 'Utilisez cette base pour publier ou mettre a jour votre service freelance.',
              actions: [
                { label: 'Publier un service', path: '/freelancer/services' },
                { label: 'Mon profil', path: '/freelancer/profile' },
              ],
            }
          : null,
    };
  }

  if (type === 'general') {
    const deterministicGuide = buildDeterministicGlobalGuide(message, user);
    const shouldUseDeterministicGuide =
      deterministicGuide?.generalResult?.kind !== 'platformGuide' || !hasServiceRecommendationIntent(message);

    if (deterministicGuide && shouldUseDeterministicGuide) {
      return deterministicGuide;
    }
  }

  if (type === 'freelance') {
    const profile = buildLocalFreelanceProfile(message, user);
    return {
      content: buildLocalFreelanceMessage(profile),
      structured: {
        status: 'ready',
        assistantMessage: 'Brouillon de profil propose.',
        profile,
        missingFields: ['hourly_rate', 'portfolio_url'].filter((field) => !profile[field]),
        nextAction: 'review_suggested_profile',
      },
    };
  }

  if (type === 'general' && isFreelanceIntent(message) && !normalizeAssistantText(message).includes('chercher')) {
    return buildFreelanceGuide(user);
  }

  if (!hasServiceRecommendationIntent(message)) {
    return {
      content: buildLowIntentMessage(message),
      generalResult: null,
    };
  }

  const matchResponse = await matchClientNeed({
    need: message,
    city: user?.city || undefined,
    limit: 3,
  }).then((response) => response.data);
  const brief = buildBriefFromMatch(message, matchResponse.interpretedRequest, matchResponse.extractedKeywords);

  return {
    content: buildClientMatchMessage(matchResponse, type !== 'general'),
    structured:
      type === 'client'
        ? {
            status: 'ready',
            assistantMessage: matchResponse.summary,
            brief,
            missingFields: getMissingClientFields(brief),
            nextAction: 'review_suggested_brief',
          }
        : null,
    generalResult: type === 'general' ? { kind: 'matches', data: matchResponse } : null,
  };
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

function getFreelanceRows(data) {
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

  const rows = type === 'client' ? getClientRows(snapshot.data) : getFreelanceRows(snapshot.data);

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

function GeneralAssistantResult({ result, onActionClick }) {
  if (!result) {
    return null;
  }

  if (result.kind === 'matches') {
    const matchResponse = result.data || {};
    const recommendations = matchResponse.recommendations || [];

    return (
      <aside className="floating-ai-general-result">
        <div className="floating-ai-general-head">
          <Search size={15} />
          <strong>Choisissez une recommandation</strong>
        </div>

        {recommendations.length > 0 ? (
          <div className="floating-ai-general-list">
            {recommendations.slice(0, 3).map((recommendation) => {
              const service = recommendation.service;
              const score = Math.round(Number(recommendation.score || 0) * 100);

              return (
                <Link
                  className="floating-ai-general-card"
                  key={service.id}
                  to={`/services/${service.id}`}
                  onClick={onActionClick}
                >
                  <span>{score}%</span>
                  <div>
                    <strong>{service.title}</strong>
                    <p>{(recommendation.reasons || []).slice(0, 2).join(' - ') || 'Profil pertinent'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p>Aucun service prioritaire pour ce besoin.</p>
        )}

        <Link className="btn btn-primary btn-sm" to="/services#matching-assistant" onClick={onActionClick}>
          Ouvrir le matching complet
        </Link>
      </aside>
    );
  }

  const isFreelanceGuide = result.kind === 'freelanceGuide';
  const isAccountGuide = result.kind === 'accountGuide';
  const actions =
    result.actions ||
    (isFreelanceGuide
      ? [
          { label: 'Creer un compte freelance', path: '/register' },
          { label: 'Voir les services', path: '/services' },
        ]
      : [
          { label: 'Creer un compte', path: '/register' },
          { label: 'Se connecter', path: '/login' },
        ]);

  return (
    <aside className="floating-ai-general-result">
      <div className="floating-ai-general-head">
        {isFreelanceGuide || isAccountGuide ? <UserPlus size={15} /> : <Sparkles size={15} />}
        <strong>{result.title}</strong>
      </div>
      <p>{result.description}</p>
      <div className="floating-ai-general-actions">
        {actions.slice(0, 3).map((action, index) => (
          <Link
            className={`btn ${index === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            to={action.path}
            onClick={onActionClick}
            key={`${action.path}-${action.label}`}
          >
            {action.label}
          </Link>
        ))}
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
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [structuredResult, setStructuredResult] = useState(null);
  const [confirmedResult, setConfirmedResult] = useState(null);
  const [generalResult, setGeneralResult] = useState(null);
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(null);

  const type = 'general';
  const config = ASSISTANT_CONFIG[type] || ASSISTANT_CONFIG.client;
  const userKey = getUserKey(user);
  const webhookUrl = getAssistantWebhookUrl(type);
  const messagesStorageKey = getStorageKey(type, userKey, 'messages');

  const [messages, setMessages] = useState(() => readStoredMessages(type, userKey));

  const canUseAssistant = true;
  const shouldUseLocalAssistant = !webhookUrl;

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
    setGeneralResult(null);
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
  }, [isOpen, messages, sending, structuredResult, generalResult]);

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

    if (!nextMessage || sending) {
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
      setGeneralResult(null);
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
      const finalConfirmedSnapshot = options.confirmSnapshot ? buildFinalSnapshot(type, options.confirmSnapshot) : null;

      if (finalConfirmedSnapshot) {
        setStructuredResult(null);
        setConfirmedResult(finalConfirmedSnapshot);
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: createId(),
            role: 'assistant',
            content:
              type === 'client'
                ? 'Brief confirme. Voici les prochaines actions recommandees.'
                : 'Profil confirme. Voici la prochaine action.',
          },
        ]);
        return;
      }

      if (type === 'general') {
        const deterministicGuide = buildDeterministicGlobalGuide(nextMessage, user);
        const shouldUseDeterministicGuide =
          deterministicGuide?.generalResult?.kind !== 'platformGuide' || !hasServiceRecommendationIntent(nextMessage);

        if (deterministicGuide && shouldUseDeterministicGuide) {
          setStructuredResult(null);
          setGeneralResult(deterministicGuide.generalResult || null);
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              id: createId(),
              role: 'assistant',
              content: deterministicGuide.content,
              generalResult: deterministicGuide.generalResult || null,
            },
          ]);
          return;
        }
      }

      if (shouldUseLocalAssistant) {
        const localResponse = await buildLocalAssistantResponse({ type, message: nextMessage, user });

        if (localResponse.structured) {
          setStructuredResult(localResponse.structured);
        } else {
          setStructuredResult(null);
        }
        if (localResponse.generalResult) {
          setGeneralResult(localResponse.generalResult);
        } else {
          setGeneralResult(null);
        }

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: createId(),
            role: 'assistant',
            content: getGeneralMessageContent(
              { structured: { assistantMessage: localResponse.content } },
              localResponse.content,
              localResponse.generalResult,
            ),
            generalResult: localResponse.generalResult || null,
          },
        ]);
        return;
      }

      const responseText = await sendAssistantMessage({
        type,
        message: nextMessage,
        sessionId: sessionIdRef.current,
        metadata: assistantMetadata,
      });
      const rawPayload = tryParseJson(responseText);
      const displayText = getAssistantDisplayText(responseText, rawPayload);
      const nextSnapshot = buildStructuredSnapshot(type, rawPayload);
      const nextGeneralResult = type === 'general' ? buildGeneralResultFromPayload(rawPayload, nextMessage, user) : null;
      const canShowRecommendations =
        nextGeneralResult?.kind !== 'matches' || hasServiceRecommendationIntent(nextMessage);
      const visibleGeneralResult = canShowRecommendations ? nextGeneralResult : null;
      const nextMessageContent = canShowRecommendations
        ? getGeneralMessageContent(rawPayload, displayText, visibleGeneralResult)
        : buildLowIntentMessage(nextMessage);

      if (nextSnapshot) {
        setStructuredResult(nextSnapshot);
      }
      setGeneralResult(visibleGeneralResult);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createId(),
          role: 'assistant',
          content: nextMessageContent,
          generalResult: visibleGeneralResult,
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
    setGeneralResult(null);
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
                {config.badge && <p>{config.badge}</p>}
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
              <article
                className={`floating-ai-message is-${message.role} ${message.generalResult ? 'has-result' : ''}`}
                key={message.id}
              >
                {message.content && <span className="floating-ai-message-text">{message.content}</span>}
                {message.generalResult && (
                  <GeneralAssistantResult result={message.generalResult} onActionClick={() => setIsOpen(false)} />
                )}
              </article>
            ))}
            {sending && (
              <article className="floating-ai-message is-assistant is-loading">
                <Loader2 size={14} className="spinner" /> Generation...
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>

          {type !== 'general' && (
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
              disabled={sending}
            />
          )}

          {type !== 'general' && (
            <PostConfirmationActions
              type={type}
              snapshot={confirmedResult}
              services={suggestedServices}
              loading={suggestionsLoading}
              error={suggestionsError}
              onServiceClick={() => setIsOpen(false)}
            />
          )}

          {error && <p className="floating-ai-error">{error}</p>}

          <form className="floating-ai-composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={config.placeholder}
              rows={2}
              disabled={sending}
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
              {sending ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
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
      </button>
    </div>
  );
}
