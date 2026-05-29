export const NOTIFICATIONS_REFRESH_EVENT = 'marketplace:notifications-refresh';

export function requestNotificationsRefresh() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}
