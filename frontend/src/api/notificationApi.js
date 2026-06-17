import API from './axiosConfig';

export const getNotifications = () => API.get('/notifications');

export const markNotificationAsRead = (notificationId) => API.patch(`/notifications/${notificationId}/read`);

export const markAllNotificationsAsRead = () => API.patch('/notifications/read-all');
