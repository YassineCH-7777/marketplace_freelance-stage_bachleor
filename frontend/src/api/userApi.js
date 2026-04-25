import API from './axiosConfig';

// Profile
export const updateFreelancerProfile = (data) => API.put('/freelancer/profile', data);

// Services
export const createFreelancerService = (data) => API.post('/freelancer/services', data);
export const updateFreelancerService = (id, data) => API.put(`/freelancer/services/${id}`, data);
export const deleteFreelancerService = (id) => API.delete(`/freelancer/services/${id}`);

// Requests
export const getIncomingRequests = () => API.get('/freelancer/requests');
export const acceptRequest = (id) => API.put(`/freelancer/requests/${id}/accept`);
export const refuseRequest = (id) => API.put(`/freelancer/requests/${id}/refuse`);

// Orders
export const getFreelancerOrders = () => API.get('/freelancer/orders');
export const updateFreelancerOrderExecution = (id, data) => API.put(`/freelancer/orders/${id}`, data);
