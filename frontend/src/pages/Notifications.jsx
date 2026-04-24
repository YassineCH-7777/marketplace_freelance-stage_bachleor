import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Inbox,
  Loader2,
  MessageSquareMore,
  Package,
  ShieldAlert,
} from 'lucide-react';
import API from '../api/axiosConfig';
import './Dashboard.css';

function NotificationTypeIcon({ type }) {
  switch (type) {
    case 'MESSAGE_RECEIVED':
      return <MessageSquareMore size={20} />;
    case 'ORDER_UPDATE':
      return <Package size={20} />;
    case 'SYSTEM_ALERT':
      return <ShieldAlert size={20} />;
    default:
      return <Bell size={20} />;
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    API.get('/notifications')
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

  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      );
    } catch {
      alert('Impossible de mettre a jour cette notification pour le moment.');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Bell size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Notifications
          </h1>
          <p className="dashboard-subtitle">
            {unreadNotifications} non lue{unreadNotifications > 1 ? 's' : ''}
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
                  background: notification.isRead ? 'var(--bg-card)' : 'rgba(99, 102, 241, 0.06)',
                  border: `1px solid ${
                    notification.isRead ? 'var(--surface-border)' : 'rgba(99, 102, 241, 0.2)'
                  }`,
                  borderRadius: 'var(--radius-xl)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: notification.isRead ? 'var(--text-muted)' : 'var(--primary-400)' }}>
                  <NotificationTypeIcon type={notification.type} />
                </span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: notification.isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: notification.isRead ? 400 : 600,
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
                {!notification.isRead && (
                  <button className="btn btn-sm btn-accept" onClick={() => markAsRead(notification.id)}>
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
