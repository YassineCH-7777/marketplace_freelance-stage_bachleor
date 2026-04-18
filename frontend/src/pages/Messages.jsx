import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, sendMessage } from '../api/messageApi';
import { MessageSquare, Send, Loader2, Inbox, ArrowLeft } from 'lucide-react';
import './Dashboard.css';
import './Messages.css';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getConversations()
      .then(r => setConversations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openConversation = (convo) => {
    setActiveConvo(convo);
    setMsgsLoading(true);
    getMessages(convo.id)
      .then(r => setMessages(r.data))
      .catch(() => setMessages([]))
      .finally(() => setMsgsLoading(false));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await sendMessage(activeConvo.id, newMsg);
      setMessages([...messages, res.data]);
      setNewMsg('');
    } catch { alert('Erreur'); }
    finally { setSending(false); }
  };

  const getOtherName = (convo) => {
    if (convo.clientId === user?.id) return convo.freelancerEmail;
    return convo.clientEmail;
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title"><MessageSquare size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Messagerie</h1>
          <p className="dashboard-subtitle">Communiquez avec vos clients et freelances.</p>
        </div>

        <div className="chat-layout animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Conversation List */}
          <div className={`chat-sidebar ${activeConvo ? 'hide-mobile' : ''}`}>
            {loading ? (
              <div className="empty-state" style={{ padding: '2rem' }}><Loader2 size={24} className="spinner" /></div>
            ) : conversations.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Inbox size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Aucune conversation</p>
              </div>
            ) : (
              conversations.map(c => (
                <div
                  key={c.id}
                  className={`chat-convo-item ${activeConvo?.id === c.id ? 'active' : ''}`}
                  onClick={() => openConversation(c)}
                >
                  <div className="chat-convo-avatar">{getOtherName(c)?.[0]?.toUpperCase()}</div>
                  <div className="chat-convo-info">
                    <span className="chat-convo-name">{getOtherName(c)}</span>
                    <span className="chat-convo-time">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('fr-FR') : ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Window */}
          <div className={`chat-window ${!activeConvo ? 'hide-mobile' : ''}`}>
            {!activeConvo ? (
              <div className="chat-placeholder">
                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Sélectionnez une conversation</p>
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
                    <div className="empty-state" style={{ padding: '2rem' }}><Loader2 size={24} className="spinner" /></div>
                  ) : messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: 'var(--text-sm)' }}>Aucun message. Commencez la conversation !</p>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`chat-bubble ${m.senderId === user?.id ? 'mine' : 'theirs'}`}>
                        <p className="chat-bubble-text">{m.content}</p>
                        <span className="chat-bubble-time">{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>

                <form className="chat-input-bar" onSubmit={handleSend}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Écrire un message..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !newMsg.trim()}>
                    {sending ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
