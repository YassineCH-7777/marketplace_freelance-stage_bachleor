import API from './axiosConfig';

// Public
export const getOpenRequests = (params) => API.get('/public/requests', { params });
export const searchRequests = (params) => API.get('/public/requests/search', { params });
export const getRequestDetail = (id) => API.get(`/public/requests/${id}`);

// Client
export const createServiceRequest = (data) => API.post('/client/service-requests', data);
export const getMyServiceRequests = () => API.get('/client/service-requests');
export const getServiceRequestDetail = (id) => API.get(`/client/service-requests/${id}`);
export const updateServiceRequest = (id, data) => API.put(`/client/service-requests/${id}`, data);
export const cancelServiceRequest = (id) => API.delete(`/client/service-requests/${id}`);
export const closeServiceRequest = (id) => API.put(`/client/service-requests/${id}/close`);
export const acceptProposal = (requestId, proposalId) => API.put(`/client/service-requests/${requestId}/proposals/${proposalId}/accept`);
export const rejectProposal = (requestId, proposalId) => API.put(`/client/service-requests/${requestId}/proposals/${proposalId}/reject`);

// Freelancer
export const submitProposal = (data) => API.post('/freelancer/proposals', data);
export const getMyProposals = () => API.get('/freelancer/proposals');
export const withdrawProposal = (id) => API.delete(`/freelancer/proposals/${id}`);
