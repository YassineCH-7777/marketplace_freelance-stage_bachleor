import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  Bell,
  Briefcase,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquareMore,
  Package,
  ShieldAlert,
  Star,
  User,
  X,
} from 'lucide-react';
import { getNotifications } from '../../api/notificationApi';
import './Navbar.css';

function NotificationIcon({ type }) {
  switch (type) {
    case 'NEW_MESSAGE':
      return <MessageSquareMore size={16} />;
    case 'NEW_REQUEST':
      return <ClipboardList size={16} />;
    case 'REQUEST_ACCEPTED':
    case 'REQUEST_REJECTED':
    case 'ORDER_UPDATED':
      return <Package size={16} />;
    case 'NEW_REVIEW':
      return <Star size={16} />;
    case 'SYSTEM':
      return <ShieldAlert size={16} />;
    default:
      return <Bell size={16} />;
  }
}

function formatNotificationDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);

  const recentNotifications = useMemo(() => notifications.slice(0, 5), [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(false);
    try {
      const response = await getNotifications();
      setNotifications(response.data);
    } catch {
      setNotifications([]);
      setNotificationsError(true);
    } finally {
      setNotificationsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, user?.id]);

  useEffect(() => {
    if (!notificationOpen) return undefined;

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationOpen]);

  const handleLogout = () => {
    logout();
    setNotificationOpen(false);
    navigate('/');
    setMobileOpen(false);
  };

  const handleHomeSectionClick = (sectionId) => {
    setMobileOpen(false);
    setNotificationOpen(false);

    if (window.location.pathname === '/' && window.location.hash === `#${sectionId}`) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'ADMIN': return '/admin';
      case 'FREELANCER': return '/freelancer/dashboard';
      case 'CLIENT': return '/client/dashboard';
      default: return '/';
    }
  };

  const closeMenus = () => {
    setMobileOpen(false);
    setNotificationOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationOpen((current) => !current);
    if (!notificationOpen) {
      loadNotifications();
    }
  };

  const handleViewAllNotifications = () => {
    closeMenus();
    navigate('/notifications');
  };

  const handleNotificationClick = (notification) => {
    closeMenus();
    if (notification.type === 'NEW_MESSAGE') {
      const options = notification.relatedEntityId
        ? { state: { conversationId: notification.relatedEntityId } }
        : undefined;
      navigate('/messages', options);
      return;
    }
    navigate('/notifications');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand" onClick={closeMenus}>
          <span className="brand-mark">
            <Briefcase size={20} className="brand-icon" strokeWidth={2.5} />
          </span>
          <span className="brand-text">Proxi<span className="brand-highlight">Skills</span></span>
        </Link>

        <div className={`navbar-links ${mobileOpen ? 'active' : ''}`}>
          <Link to="/services" className="nav-link" onClick={closeMenus}>Services</Link>
          <Link to="/#categories" className="nav-link" onClick={() => handleHomeSectionClick('categories')}>Categories</Link>
          <Link to="/#comment-ca-marche" className="nav-link" onClick={() => handleHomeSectionClick('comment-ca-marche')}>Comment ca marche</Link>
          <Link to="/#freelances" className="nav-link" onClick={() => handleHomeSectionClick('freelances')}>Freelances</Link>

          {isAuthenticated ? (
            <>
              <Link to={getDashboardLink()} className="nav-link" onClick={closeMenus}>
                <LayoutDashboard size={16} />
                Dashboard
              </Link>

              <div className="notification-menu" ref={notificationRef}>
                <button
                  type="button"
                  className={`nav-link nav-icon-link notification-trigger ${notificationOpen ? 'active' : ''}`}
                  onClick={toggleNotifications}
                  aria-expanded={notificationOpen}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {notifications.length > 0 && (
                    <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="notification-popover">
                    <div className="notification-popover-header">
                      <div>
                        <strong>Notifications</strong>
                        <span>{notifications.length} alerte{notifications.length > 1 ? 's' : ''} recente{notifications.length > 1 ? 's' : ''}</span>
                      </div>
                      <button type="button" className="notification-refresh" onClick={loadNotifications}>
                        {notificationsLoading ? <Loader2 size={14} className="spinner" /> : 'Actualiser'}
                      </button>
                    </div>

                    <div className="notification-popover-list">
                      {notificationsLoading && recentNotifications.length === 0 ? (
                        <div className="notification-empty">
                          <Loader2 size={18} className="spinner" />
                          Chargement...
                        </div>
                      ) : notificationsError ? (
                        <div className="notification-empty">
                          <ShieldAlert size={18} />
                          Notifications indisponibles
                        </div>
                      ) : recentNotifications.length === 0 ? (
                        <div className="notification-empty">
                          <Inbox size={18} />
                          Aucune notification
                        </div>
                      ) : (
                        recentNotifications.map((notification) => (
                          <button
                            type="button"
                            className="notification-item"
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <span className="notification-item-icon">
                              <NotificationIcon type={notification.type} />
                            </span>
                            <div className="notification-item-body">
                              <p>{notification.content}</p>
                              <time>{formatNotificationDate(notification.createdAt)}</time>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      className="notification-view-all"
                      onClick={handleViewAllNotifications}
                    >
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </div>

              <div className="nav-user-section">
                <div className="nav-user-badge">
                  <User size={14} />
                  <span>{user?.email?.split('@')[0]}</span>
                  <span className="nav-role-tag">{user?.role}</span>
                </div>
                <button className="btn btn-sm btn-secondary nav-logout-btn" onClick={handleLogout}>
                  <LogOut size={14} />
                  Deconnexion
                </button>
              </div>
            </>
          ) : (
            <div className="nav-auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm" onClick={closeMenus}>Connexion</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenus}>Inscription</Link>
            </div>
          )}
        </div>

        <button className="navbar-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
