import API from './axiosConfig';

export const getAdminStats = () => API.get('/admin/stats');
export const getAdminUsers = () => API.get('/admin/users');
export const suspendAdminUser = (id) => API.put(`/admin/users/${id}/suspend`);
export const activateAdminUser = (id) => API.put(`/admin/users/${id}/activate`);
export const getAdminCategories = () => API.get('/admin/categories');
export const createAdminCategory = (category) => API.post('/admin/categories', category);
export const updateAdminCategory = (id, category) => API.put(`/admin/categories/${id}`, category);
export const getAdminServices = () => API.get('/admin/services');
export const moderateAdminService = (id, status) =>
  API.put(`/admin/services/${id}/moderate`, null, {
    params: { status },
  });
export const getAdminOrders = () => API.get('/admin/orders');
export const resolveAdminOrderDispute = (id, payload) => API.put(`/admin/orders/${id}/dispute`, payload);
export const getAdminReports = () => API.get('/admin/reports');
export const resolveAdminReport = (id, notes) =>
  API.put(`/admin/reports/${id}/resolve`, null, {
    params: { notes },
  });
export const sendAdminSystemNotification = (payload) => API.post('/admin/notifications/system', payload);
