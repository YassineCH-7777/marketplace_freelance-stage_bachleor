import API from './axiosConfig';

export const leaveReview = (data) => API.post('/client/reviews', data);
export const getFreelancerReviews = (freelancerId) => API.get(`/public/freelancers/${freelancerId}/reviews`);
