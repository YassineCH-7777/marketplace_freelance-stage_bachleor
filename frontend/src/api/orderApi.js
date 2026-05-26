import API from './axiosConfig';

// Client
export const createOrderRequest = (data) => API.post('/client/requests', data);
export const getClientOrders = () => API.get('/client/orders');
export const confirmEscrowPayment = (id) => API.put(`/client/orders/${id}/confirm-payment`);
export const acceptOrderDelivery = (id, data = {}) => API.put(`/client/orders/${id}/accept-delivery`, data);
export const requestOrderRevision = (id, data) => API.put(`/client/orders/${id}/request-revision`, data);
export const openClientOrderDispute = (id, data) => API.put(`/client/orders/${id}/dispute`, data);
export const getMissionReportPdf = (id) => API.get(`/orders/${id}/report`, { responseType: 'blob' });
