import API from './axiosConfig';

export const getAdminStats = () => API.get('/admin/stats');
export const getAdminUsers = () => API.get('/admin/users');
export const suspendAdminUser = (id) => API.put(`/admin/users/${id}/suspend`);
export const getAdminCategories = () => API.get('/admin/categories');
export const getAdminReports = () => API.get('/admin/reports');
export const resolveAdminReport = (id, notes) =>
  API.put(`/admin/reports/${id}/resolve`, null, {
    params: { notes },
  });
