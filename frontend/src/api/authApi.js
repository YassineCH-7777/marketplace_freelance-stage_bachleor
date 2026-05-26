import API from './axiosConfig';

export const loginUser = (data) => API.post('/auth/login', data);
export const registerUser = (data) => API.post('/auth/register', data);
export const registerFirebaseUser = (data) => API.post('/auth/firebase/register', data);
export const loginFirebaseUser = (data) => API.post('/auth/firebase', data);
export const loginGoogleUser = (data) => API.post('/auth/google', data);
