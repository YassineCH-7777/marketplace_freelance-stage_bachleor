import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const SESSION_EXPIRED_MESSAGE = 'Votre session a expire. Veuillez vous reconnecter.';

const API = axios.create({
  baseURL: apiBaseURL,
});

function getResponseMessage(error) {
  const data = error.response?.data;

  if (typeof data === 'string') {
    return data.trim();
  }

  return data?.message || data?.details || '';
}

function setResponseMessage(error, message) {
  if (!error.response) {
    return;
  }

  if (typeof error.response.data === 'object' && error.response.data !== null) {
    error.response.data = {
      ...error.response.data,
      message,
    };
    return;
  }

  error.response.data = { message };
}

function clearStoredAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Interceptor: attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: handle 401 responses globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/');
    const status = error.response?.status;
    const responseMessage = getResponseMessage(error);
    const shouldRefreshSession =
      !isAuthRequest && (status === 401 || (status === 403 && !responseMessage));

    if (shouldRefreshSession) {
      clearStoredAuth();
      setResponseMessage(error, SESSION_EXPIRED_MESSAGE);
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default API;
