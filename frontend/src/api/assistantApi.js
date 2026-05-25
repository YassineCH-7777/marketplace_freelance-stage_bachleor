const GLOBAL_ASSISTANT_URL = import.meta.env.VITE_N8N_GLOBAL_CHAT_URL || import.meta.env.VITE_N8N_CHAT_URL;

const ASSISTANT_URLS = {
  general: GLOBAL_ASSISTANT_URL,
  client: import.meta.env.VITE_N8N_CLIENT_CHAT_URL || GLOBAL_ASSISTANT_URL,
  freelance: import.meta.env.VITE_N8N_FREELANCE_CHAT_URL || GLOBAL_ASSISTANT_URL,
};

export function getAssistantWebhookUrl(type) {
  return ASSISTANT_URLS[type] || GLOBAL_ASSISTANT_URL || '';
}

function normalizeAssistantResponse(data) {
  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    const firstItem = data[0];
    return normalizeAssistantResponse(firstItem?.json || firstItem);
  }

  if (data?.output || data?.structured) {
    return JSON.stringify({
      output: data.output || data.structured?.assistantMessage || '',
      structured: data.structured || null,
    });
  }

  const value = data?.text || data?.message || data?.response || data;

  return typeof value === 'string' ? value : JSON.stringify(value);
}

function buildChatRequestUrl(webhookUrl) {
  const requestUrl = new URL(webhookUrl);

  if (!requestUrl.searchParams.has('action')) {
    requestUrl.searchParams.set('action', 'sendMessage');
  }

  return requestUrl.toString();
}

export async function sendAssistantMessage({ type, message, sessionId, metadata }) {
  const webhookUrl = getAssistantWebhookUrl(type);

  if (!webhookUrl) {
    throw new Error('Assistant indisponible pour le moment.');
  }

  const response = await fetch(buildChatRequestUrl(webhookUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatInput: message,
      sessionId,
      metadata: {
        ...metadata,
        sessionId,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("L'assistant ne repond pas pour le moment.");
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return normalizeAssistantResponse(await response.json());
  }

  return normalizeAssistantResponse(await response.text());
}
