const READ_NOTIFICATIONS_PREFIX = 'proxiskills-read-notifications';
const MAX_STORED_READ_IDS = 500;

function getReadStorageKey(user) {
  return `${READ_NOTIFICATIONS_PREFIX}-${user?.id || user?.email || 'guest'}`;
}

function readStoredNotificationIds(user) {
  try {
    const storedValue = localStorage.getItem(getReadStorageKey(user));
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return new Set(Array.isArray(parsedValue) ? parsedValue.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeStoredNotificationIds(user, ids) {
  try {
    localStorage.setItem(getReadStorageKey(user), JSON.stringify([...ids].slice(-MAX_STORED_READ_IDS)));
  } catch {
    // If storage is unavailable, backend persistence still handles the normal case.
  }
}

export function applyStoredNotificationReadState(user, notifications) {
  const readIds = readStoredNotificationIds(user);

  return (notifications || []).map((notification) => {
    if (!notification?.id || !readIds.has(String(notification.id))) {
      return notification;
    }

    return { ...notification, isRead: true, read: true };
  });
}

export function rememberReadNotifications(user, notifications) {
  const readIds = readStoredNotificationIds(user);

  (notifications || []).forEach((notification) => {
    if (notification?.id) {
      readIds.add(String(notification.id));
    }
  });

  writeStoredNotificationIds(user, readIds);
}
