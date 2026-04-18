import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axiosConfig';
import { Bell, Check, Loader2, Inbox } from 'lucide-react';
import './Dashboard.css';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    setLoading(true);
    API.get('/notifications')
      .then(r => setNotifications(r.data))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'MESSAGE_RECEIVED': return '💬';
      case 'ORDER_UPDATE': return '📦';
      case 'SYSTEM_ALERT': return '⚡';
      default: return '🔔';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title"><Bell size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Notifications</h1>
          <p className="dashboard-subtitle">
            {notifications.filter(n => !n.isRead).length} non lue{notifications.filter(n => !n.isRead).length > 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Inbox size={48} /></div>
            <h3 className="empty-state-title">Aucune notification</h3>
            <p className="empty-state-desc">Vous serez alerté des nouvelles activités ici.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} className="stagger">
            {notifications.map(n => (
              <div
                key={n.id}
                className="animate-fade-in-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4) var(--space-5)',
                  background: n.isRead ? 'var(--bg-card)' : 'rgba(99, 102, 241, 0.06)',
                  border: `1px solid ${n.isRead ? 'var(--surface-border)' : 'rgba(99, 102, 241, 0.2)'}`,
                  borderRadius: 'var(--radius-xl)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{typeIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: n.isRead ? 400 : 600 }}>
                    {n.content}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {new Date(n.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.isRead && (
                  <button className="btn btn-sm btn-accept" onClick={() => markAsRead(n.id)}>
                    <Check size={14} /> Lu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
