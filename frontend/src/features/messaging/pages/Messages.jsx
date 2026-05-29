import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { deleteConversation, getConversations, getMessages, sendMessage, updateMessageImportant } from '@/api/messageApi';
import { uploadMessageAttachments } from '@/api/attachmentApi';
import AttachmentList from '@/components/common/AttachmentList';
import AttachmentPicker from '@/components/common/AttachmentPicker';
import { formatFileSize } from '@/utils/attachments';
import { requestNotificationsRefresh } from '@/utils/notificationEvents';
import { ArrowLeft, Check, CheckCheck, Inbox, Loader2, MessageSquare, Send, Star, Trash2, X } from 'lucide-react';
import '@/styles/dashboard.css';
import '@/styles/messages.css';

const getConversationTime = (conversation) => {
  const value = conversation.lastMessageAt || conversation.updatedAt;
  return value ? new Date(value).getTime() : 0;
};

const normalizeMessage = (message) => ({
  ...message,
  isRead: Boolean(message.isRead ?? message.read),
  isImportant: Boolean(message.isImportant ?? message.important),
  attachments: message.attachments || [],
});

const normalizeMessages = (items) => items.map(normalizeMessage);

const sortConversations = (items) =>
  [...items].sort((a, b) => getConversationTime(b) - getConversationTime(a));

const haveMessagesChanged = (currentMessages, nextMessages) => {
  if (currentMessages.length !== nextMessages.length) {
    return true;
  }

  return currentMessages.some((message, index) => {
    const nextMessage = nextMessages[index];
    return (
      message.id !== nextMessage.id ||
      message.content !== nextMessage.content ||
      message.isRead !== nextMessage.isRead ||
      message.isImportant !== nextMessage.isImportant ||
      message.createdAt !== nextMessage.createdAt ||
      getAttachmentSignature(message) !== getAttachmentSignature(nextMessage)
    );
  });
};

const getAttachmentSignature = (message) =>
  (message.attachments || []).map((attachment) => `${attachment.id}:${attachment.fileUrl}`).join('|');

const formatConversationDate = (conversation) => {
  const value = conversation.lastMessageAt || conversation.updatedAt;
  return value ? new Date(value).toLocaleDateString('fr-FR') : '';
};

function MessageDeliveryStatus({ isRead }) {
  const label = isRead ? 'Lu' : 'Arrive';

  return (
    <span className={`chat-message-status ${isRead ? 'is-read' : 'is-arrived'}`} aria-label={label}>
      {isRead ? <CheckCheck size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
    </span>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const requestedConversationId = location.state?.conversationId;
  const messagesEndRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [chatError, setChatError] = useState('');

  const markConversationReadLocally = useCallback((conversationId) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  }, []);

  const openConversation = useCallback(
    async (convo) => {
      setActiveConvo(convo);
      setSelectedFiles([]);
      setMsgsLoading(true);
      try {
        const response = await getMessages(convo.id);
        setMessages(normalizeMessages(response.data));
        markConversationReadLocally(convo.id);
        setChatError('');
      } catch (error) {
        setMessages([]);
        setChatError(error.response?.data?.message || 'Impossible de charger cette conversation.');
      } finally {
        setMsgsLoading(false);
      }
    },
    [markConversationReadLocally],
  );

  useEffect(() => {
    let isMounted = true;

    getConversations()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const loadedConversations = sortConversations(response.data);
        setConversations(loadedConversations);

        if (requestedConversationId) {
          const requestedConversation = loadedConversations.find(
            (conversation) => String(conversation.id) === String(requestedConversationId),
          );
          if (requestedConversation) {
            openConversation(requestedConversation);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setConversations([]);
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
  }, [openConversation, requestedConversationId]);

  useEffect(() => {
    if (!activeConvo?.id) {
      return undefined;
    }

    let isCancelled = false;

    const refreshActiveMessages = async () => {
      try {
        const response = await getMessages(activeConvo.id);
        if (isCancelled) {
          return;
        }

        const nextMessages = normalizeMessages(response.data);
        setMessages((currentMessages) =>
          haveMessagesChanged(currentMessages, nextMessages) ? nextMessages : currentMessages,
        );
        markConversationReadLocally(activeConvo.id);
      } catch {
        // Keep the current conversation visible if a background refresh fails.
      }
    };

    const refreshInterval = window.setInterval(refreshActiveMessages, 3000);
    window.addEventListener('focus', refreshActiveMessages);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshActiveMessages);
    };
  }, [activeConvo?.id, markConversationReadLocally]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConvo]);

  const handleSend = async (event) => {
    event.preventDefault();
    const content = newMsg.trim();
    if ((!content && selectedFiles.length === 0) || !activeConvo) return;

    setChatError('');
    setSending(true);
    try {
      const response = await sendMessage(activeConvo.id, content || 'Piece jointe');
      let sentMessage = normalizeMessage(response.data);

      if (selectedFiles.length > 0) {
        try {
          const attachmentsResponse = await uploadMessageAttachments(sentMessage.id, selectedFiles);
          sentMessage = {
            ...sentMessage,
            attachments: attachmentsResponse.data,
          };
        } catch (uploadError) {
          setChatError(uploadError.response?.data?.message || 'Message envoye, mais les fichiers n ont pas pu etre ajoutes.');
        }
      }

      setMessages((current) => [...current, sentMessage]);
      setNewMsg('');
      setSelectedFiles([]);
      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation.id === activeConvo.id
              ? {
                  ...conversation,
                  lastMessageAt: sentMessage.createdAt,
                  lastMessageContent: sentMessage.content,
                  unreadCount: 0,
                }
              : conversation,
          ),
        ),
      );
    } catch (error) {
      setChatError(error.response?.data?.message || "Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleToggleImportant = async (message) => {
    const nextImportant = !message.isImportant;

    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, isImportant: nextImportant } : item)),
    );

    try {
      const response = await updateMessageImportant(message.id, nextImportant);
      const updatedMessage = normalizeMessage(response.data);
      setMessages((current) =>
        current.map((item) => (item.id === updatedMessage.id ? updatedMessage : item)),
      );
      setChatError('');
    } catch (error) {
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, isImportant: message.isImportant } : item)),
      );
      setChatError(error.response?.data?.message || "Impossible de modifier l'importance du message.");
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) {
      return;
    }

    const conversationId = conversationToDelete.id;
    setDeletingConversationId(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations((current) => current.filter((item) => item.id !== conversationId));
      if (activeConvo?.id === conversationId) {
        setActiveConvo(null);
        setMessages([]);
        setSelectedFiles([]);
      }
      requestNotificationsRefresh();
      setConversationToDelete(null);
      setChatError('');
    } catch (error) {
      setChatError(error.response?.data?.message || 'Erreur lors de la suppression de la conversation');
    } finally {
      setDeletingConversationId(null);
    }
  };

  const getOtherName = (convo) => {
    if (convo.clientId === user?.id) return convo.freelancerEmail;
    return convo.clientEmail;
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <MessageSquare size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Messagerie
          </h1>
          <p className="dashboard-subtitle">Communiquez avec vos clients et freelances.</p>
        </div>

        {chatError && !activeConvo && <p className="form-error">{chatError}</p>}

        <div className="chat-layout animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className={`chat-sidebar ${activeConvo ? 'hide-mobile' : ''}`}>
            {loading ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Loader2 size={24} className="spinner" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Inbox size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Aucune conversation</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`chat-convo-item ${activeConvo?.id === conversation.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="chat-convo-open"
                    onClick={() => openConversation(conversation)}
                  >
                    <div className="chat-convo-avatar">{getOtherName(conversation)?.[0]?.toUpperCase()}</div>
                    <div className="chat-convo-info">
                      <div className="chat-convo-main">
                        <span className="chat-convo-name">{getOtherName(conversation)}</span>
                        <span className="chat-convo-time">{formatConversationDate(conversation)}</span>
                      </div>
                      <div className="chat-convo-meta">
                        <span className="chat-convo-preview">
                          {conversation.lastMessageContent || 'Conversation ouverte'}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="chat-unread-badge">{conversation.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="chat-convo-delete"
                    onClick={() => setConversationToDelete(conversation)}
                    disabled={deletingConversationId === conversation.id}
                    title="Supprimer la conversation"
                    aria-label="Supprimer la conversation"
                  >
                    {deletingConversationId === conversation.id ? (
                      <Loader2 size={15} className="spinner" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={`chat-window ${!activeConvo ? 'hide-mobile' : ''}`}>
            {!activeConvo ? (
              <div className="chat-placeholder">
                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Selectionnez une conversation</p>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <button className="btn btn-sm btn-secondary chat-back-btn" onClick={() => setActiveConvo(null)}>
                    <ArrowLeft size={16} />
                  </button>
                  <div className="chat-convo-avatar" style={{ width: 36, height: 36, fontSize: 'var(--text-sm)' }}>
                    {getOtherName(activeConvo)?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>{getOtherName(activeConvo)}</span>
                </div>

                <div className="chat-messages">
                  {msgsLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <Loader2 size={24} className="spinner" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        padding: '2rem',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      Aucun message. Commencez la conversation !
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isMine = message.senderId === user?.id;

                      return (
                        <div key={message.id} className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          {message.content && <p className="chat-bubble-text">{message.content}</p>}
                          <AttachmentList attachments={message.attachments} compact />
                          <span className="chat-bubble-meta">
                            <button
                              type="button"
                              className={`chat-important-btn ${message.isImportant ? 'is-active' : ''}`}
                              onClick={() => void handleToggleImportant(message)}
                              title={message.isImportant ? 'Retirer des messages importants' : 'Marquer important'}
                              aria-label={message.isImportant ? 'Retirer des messages importants' : 'Marquer important'}
                            >
                              <Star size={13} fill={message.isImportant ? 'currentColor' : 'none'} />
                            </button>
                            <span className="chat-bubble-time">
                              {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && <MessageDeliveryStatus isRead={message.isRead} />}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className="chat-composer" onSubmit={handleSend}>
                  {chatError && <p className="form-error">{chatError}</p>}
                  {selectedFiles.length > 0 && (
                    <div className="attachment-selected-list chat-selected-files">
                      {selectedFiles.map((file, index) => (
                        <span className="attachment-selected-item" key={`${file.name}-${file.size}-${index}`}>
                          <span>{file.name}</span>
                          <small>{formatFileSize(file.size)}</small>
                          <button
                            type="button"
                            onClick={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))}
                            disabled={sending}
                            aria-label="Retirer"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="chat-input-bar">
                    <input
                      type="text"
                      className="chat-input"
                      placeholder="Ecrire un message..."
                      value={newMsg}
                      onChange={(event) => setNewMsg(event.target.value)}
                      disabled={sending}
                      maxLength={2000}
                    />
                    <AttachmentPicker
                      files={selectedFiles}
                      onChange={setSelectedFiles}
                      buttonLabel="Joindre un fichier"
                      compact
                      iconOnly
                      showSelectedList={false}
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm chat-send-btn"
                      disabled={sending || (!newMsg.trim() && selectedFiles.length === 0)}
                    >
                      {sending ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {conversationToDelete && (
          <div className="modal-overlay" onClick={() => setConversationToDelete(null)}>
            <div className="modal-content chat-delete-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Supprimer la conversation</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setConversationToDelete(null)}
                  aria-label="Fermer"
                  disabled={deletingConversationId === conversationToDelete.id}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="chat-delete-copy">
                La conversation avec {getOtherName(conversationToDelete)} et ses messages seront supprimes.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConversationToDelete(null)}
                  disabled={deletingConversationId === conversationToDelete.id}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-refuse"
                  onClick={handleDeleteConversation}
                  disabled={deletingConversationId === conversationToDelete.id}
                >
                  {deletingConversationId === conversationToDelete.id ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} /> Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
