import { useMemo, useRef, useState } from 'react';
import { Bot, CheckCircle, Loader2, Send } from 'lucide-react';
import { getAssistantWebhookUrl, sendAssistantMessage } from '@/api/assistantApi';
import useAuth from '@/hooks/useAuth';
import '@/styles/ai-assistant.css';

const INTRO_MESSAGES = {
  client: "Bonjour, je peux vous aider a transformer votre besoin en brief clair.",
  freelance: "Bonjour, je peux vous aider a completer votre profil freelance.",
};

const STORAGE_PREFIX = 'proxiskills-assistant-session';

function createSessionId(type, user) {
  const userKey = user?.id || user?.email || 'guest';
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${type}_${userKey}_${randomPart}`;
}

function readSessionId(type, user) {
  const userKey = user?.id || user?.email || 'guest';
  const storageKey = `${STORAGE_PREFIX}-${type}-${userKey}`;
  const storedSessionId = localStorage.getItem(storageKey);

  if (storedSessionId) {
    return storedSessionId;
  }

  const nextSessionId = createSessionId(type, user);
  localStorage.setItem(storageKey, nextSessionId);
  return nextSessionId;
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

function getRelevantPayload(type, payload) {
  if (!payload) {
    return null;
  }

  const structuredPayload = payload.structured || payload;

  if (type === 'client') {
    return structuredPayload.brief || structuredPayload.request || structuredPayload.demande || structuredPayload;
  }

  return structuredPayload.profile || structuredPayload.freelancer_profile || structuredPayload.profil || structuredPayload;
}

function getAssistantDisplayText(responseText, payload) {
  if (payload?.output) {
    return payload.output;
  }

  if (payload?.structured?.assistantMessage) {
    return payload.structured.assistantMessage;
  }

  if (payload?.assistantMessage) {
    return payload.assistantMessage;
  }

  if (payload?.assistant_message) {
    return payload.assistant_message;
  }

  return responseText;
}

function hasStructuredFields(type, payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const clientFields = [
    'need_summary',
    'summary',
    'category',
    'city',
    'budget',
    'deadline_days',
    'mode',
    'objective',
    'deliverables',
  ];
  const freelanceFields = [
    'headline',
    'bio',
    'professional_bio',
    'skills',
    'city',
    'availability',
    'profile_completion_score',
    'hourly_rate',
  ];
  const expectedFields = type === 'client' ? clientFields : freelanceFields;

  return expectedFields.some((field) => Object.prototype.hasOwnProperty.call(payload, field));
}

function renderStructuredSummary(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 7)
    .map(([key, value]) => (
      <div className="ai-assistant-result-row" key={key}>
        <span>{key.replaceAll('_', ' ')}</span>
        <strong>{Array.isArray(value) ? value.join(', ') : String(value)}</strong>
      </div>
    ));
}

export default function AiAssistantPanel({
  type,
  title,
  subtitle,
  placeholder,
  metadata = {},
  onStructuredResult,
  applyLabel = 'Appliquer',
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: INTRO_MESSAGES[type] || INTRO_MESSAGES.client },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [structuredResult, setStructuredResult] = useState(null);
  const sessionIdRef = useRef(null);
  const webhookUrl = getAssistantWebhookUrl(type);

  const assistantMetadata = useMemo(
    () => ({
      ...metadata,
      role: type === 'freelance' ? 'FREELANCER' : 'CLIENT',
      userId: user?.id || null,
      email: user?.email || null,
      city: user?.city || metadata.city || null,
    }),
    [metadata, type, user],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextMessage = input.trim();
    if (!nextMessage || sending || !webhookUrl) {
      return;
    }

    if (!sessionIdRef.current) {
      sessionIdRef.current = readSessionId(type, user);
    }

    setInput('');
    setError('');
    setStructuredResult(null);
    setMessages((currentMessages) => [...currentMessages, { role: 'user', content: nextMessage }]);
    setSending(true);

    try {
      const responseText = await sendAssistantMessage({
        type,
        message: nextMessage,
        sessionId: sessionIdRef.current,
        metadata: assistantMetadata,
      });
      const rawPayload = tryParseJson(responseText);
      const parsedPayload = getRelevantPayload(type, rawPayload);
      const displayText = getAssistantDisplayText(responseText, rawPayload);

      setMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: displayText }]);

      if (hasStructuredFields(type, parsedPayload)) {
        setStructuredResult(parsedPayload);
      }
    } catch (requestError) {
      setError(requestError.message || "Impossible de joindre l'assistant");
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', content: "Je n'arrive pas a joindre l'assistant pour le moment." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleApply = () => {
    if (structuredResult && onStructuredResult) {
      onStructuredResult(structuredResult);
    }
  };

  return (
    <section className="ai-assistant-panel">
      <div className="ai-assistant-head">
        <span className="ai-assistant-icon">
          <Bot size={18} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="ai-assistant-messages" aria-live="polite">
        {messages.slice(-5).map((message, index) => (
          <div className={`ai-assistant-message is-${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        {sending && (
          <div className="ai-assistant-message is-assistant">
            <Loader2 size={14} className="spinner" /> Generation...
          </div>
        )}
      </div>

      {structuredResult && (
        <div className="ai-assistant-result">
          <div className="ai-assistant-result-head">
            <CheckCircle size={15} />
            <strong>Proposition prete</strong>
          </div>
          <div className="ai-assistant-result-grid">{renderStructuredSummary(structuredResult)}</div>
          {onStructuredResult && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleApply}>
              <CheckCircle size={14} /> {applyLabel}
            </button>
          )}
        </div>
      )}

      {error && <p className="ai-assistant-error">{error}</p>}
      {!webhookUrl && (
        <p className="ai-assistant-error">
          Assistant indisponible pour le moment.
        </p>
      )}

      <form className="ai-assistant-form" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          rows={3}
          disabled={!webhookUrl || sending}
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || !webhookUrl || sending}>
          {sending ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        </button>
      </form>
    </section>
  );
}
