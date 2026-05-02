import API from './axiosConfig';

export const getActiveServices = () => API.get('/public/services');
export const searchServices = (params) => API.get('/public/services/search', { params });
export const getRecommendedServices = (params) => API.get('/public/recommendations', { params });
export const getFreelancerProfile = (userId) => API.get(`/public/freelancers/${userId}`);
export const getCategories = () => API.get('/public/categories');
