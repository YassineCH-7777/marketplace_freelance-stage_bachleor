import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  Inbox,
  Loader2,
  MessageSquareMore,
  Package,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { getNotifications } from '../api/notificationApi';
import './Dashboard.css';

function NotificationTypeIcon({ type }) {
  switch (type) {
    case 'NEW_MESSAGE':
      return <MessageSquareMore size={20} />;
    case 'NEW_REQUEST':
      return <ClipboardList size={20} />;
    case 'REQUEST_ACCEPTED':
    case 'REQUEST_REJECTED':
    case 'ORDER_UPDATED':
      return <Package size={20} />;
    case 'NEW_REVIEW':
      return <Star size={20} />;
    case 'SYSTEM':
      return <ShieldAlert size={20} />;
    default:
      return <Bell size={20} />;
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getNotifications()
      .then((response) => {
        if (isMounted) {
          setNotifications(response.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotifications([]);
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
  }, []);

  const openConversation = (notification) => {
    const options = notification.relatedEntityId
      ? { state: { conversationId: notification.relatedEntityId } }
      : undefined;
    navigate('/messages', options);
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Bell size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Notifications
          </h1>
          <p className="dashboard-subtitle">
            {notifications.length} alerte{notifications.length > 1 ? 's' : ''} importante{notifications.length > 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Inbox size={48} />
            </div>
            <h3 className="empty-state-title">Aucune notification</h3>
            <p className="empty-state-desc">Vous serez alerte des nouvelles activites ici.</p>
          </div>
        ) : (
          <div
            className="stagger"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
          >
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="animate-fade-in-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-xl)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: 'var(--primary-400)' }}>
                  <NotificationTypeIcon type={notification.type} />
                </span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {notification.content}
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {new Date(notification.createdAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
                {notification.type === 'NEW_MESSAGE' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => openConversation(notification)}
                  >
                    <MessageSquareMore size={14} /> Conversation
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
