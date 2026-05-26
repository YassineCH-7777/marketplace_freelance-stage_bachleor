import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const NOTIFICATION_EVENT = 'marketplace:notify';
const DEFAULT_DURATION = 5200;

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const titles = {
  success: 'Operation reussie',
  error: 'Action requise',
  info: 'Information',
};

function normalizeMessage(message) {
  if (message instanceof Error) {
    return message.message;
  }
  if (typeof message === 'string') {
    return message;
  }
  if (message == null) {
    return 'Une information est disponible.';
  }
  return String(message);
}

function inferType(message) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();

  if (
    /erreur|impossible|incorrect|invalide|refus|obligatoire|maximum|non autorise|acces refuse|format|echou/.test(
      normalizedMessage,
    )
  ) {
    return 'error';
  }

  if (
    /succes|reuss|envoy|enregistre|mis a jour|mise a jour|validee|valide|bloque|demarre|ouvert|publie|ajoute|retire|supprime|archive/.test(
      normalizedMessage,
    )
  ) {
    return 'success';
  }

  return 'info';
}

function buildNotification(input) {
  const message = normalizeMessage(input?.message ?? input);
  const type = input?.type || inferType(message);

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title: input?.title || titles[type] || titles.info,
    message,
    duration: input?.duration ?? DEFAULT_DURATION,
  };
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const removeNotification = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const pushNotification = useCallback(
    (input) => {
      const notification = buildNotification(input);
      setNotifications((current) => [notification, ...current].slice(0, 4));

      if (notification.duration > 0) {
        const timer = window.setTimeout(() => removeNotification(notification.id), notification.duration);
        timersRef.current.set(notification.id, timer);
      }
    },
    [removeNotification],
  );

  useEffect(() => {
    const handleNotification = (event) => pushNotification(event.detail);
    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
  }, [pushNotification]);

  useEffect(() => {
    const previousAlert = window.alert;
    window.alert = (message) => {
      pushNotification({ message: normalizeMessage(message) });
    };

    return () => {
      window.alert = previousAlert;
    };
  }, [pushNotification]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  return (
    <div className="notification-stack" role="status" aria-live="polite" aria-relevant="additions text">
      {notifications.map((notification) => {
        const Icon = icons[notification.type] || icons.info;

        return (
          <div className={`site-notification is-${notification.type}`} key={notification.id}>
            <span className="site-notification-icon">
              <Icon size={18} />
            </span>
            <span className="site-notification-copy">
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
            </span>
            <button
              type="button"
              className="site-notification-close"
              onClick={() => removeNotification(notification.id)}
              aria-label="Fermer la notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
