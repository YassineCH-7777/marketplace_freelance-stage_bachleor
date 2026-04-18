import API from './axiosConfig';

// Client
export const createOrderRequest = (data) => API.post('/client/requests', data);
export const getClientOrders = () => API.get('/client/orders');
