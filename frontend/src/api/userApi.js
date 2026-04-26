import API from './axiosConfig';

// Profile
export const getClientProfile = () => API.get('/client/profile');
export const updateClientProfile = (data) => API.put('/client/profile', data);
export const getFreelancerOwnProfile = () => API.get('/freelancer/profile');
export const updateFreelancerProfile = (data) => API.put('/freelancer/profile', data);

// Services
export const createFreelancerService = (data) => API.post('/freelancer/services', data);
export const updateFreelancerService = (id, data) => API.put(`/freelancer/services/${id}`, data);
export const deleteFreelancerService = (id) => API.delete(`/freelancer/services/${id}`);
export const uploadServiceImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return API.post('/freelancer/uploads/image', formData);
};

// Requests
export const getIncomingRequests = () => API.get('/freelancer/requests');
export const acceptRequest = (id) => API.put(`/freelancer/requests/${id}/accept`);
export const refuseRequest = (id) => API.put(`/freelancer/requests/${id}/refuse`);

// Orders
export const getFreelancerOrders = () => API.get('/freelancer/orders');
export const updateFreelancerOrderExecution = (id, data) => API.put(`/freelancer/orders/${id}`, data);
