import API from './axiosConfig';

export const getNotifications = () => API.get('/notifications');
