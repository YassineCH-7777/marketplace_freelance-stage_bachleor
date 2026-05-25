import API from './axiosConfig';

export const getClientFavorites = () => API.get('/client/favorites');
export const addServiceFavorite = (serviceId) => API.post(`/client/favorites/services/${serviceId}`);
export const removeServiceFavorite = (serviceId) => API.delete(`/client/favorites/services/${serviceId}`);
export const addFreelancerFavorite = (freelancerId) => API.post(`/client/favorites/freelancers/${freelancerId}`);
export const removeFreelancerFavorite = (freelancerId) => API.delete(`/client/favorites/freelancers/${freelancerId}`);
