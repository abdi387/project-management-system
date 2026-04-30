import axios from 'axios';

// Base URL for API
// In development, use Vite proxy (/api) to avoid CORS issues
// In production, set VITE_API_URL environment variable
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

const normalizeSectionNames = (data) => {
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    data.forEach(normalizeSectionNames);
    return;
  }

  if (data.Section && typeof data.Section.name === 'string') {
    data.section = data.Section.name;
  }

  Object.values(data).forEach(normalizeSectionNames);
};

// Request interceptor to add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fypToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    normalizeSectionNames(response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Only log errors that aren't 404 or 403 (expected errors)
    if (status !== 404 && status !== 403) {
      if (error.code === 'ECONNABORTED') {
        console.error('⏱️ Request timeout - server might be down');
        console.error('👉 Make sure your backend server is running on 5001');
      } else if (error.message === 'Network Error') {
        console.error(`🌐 Network Error - Unable to connect to ${BASE_URL}`);
        console.error('👉 Check if MySQL is running and Backend is started on port 5001');
      } else {
        console.error('API Error:', status, data);
        // Log the specific server error message for easier debugging
        if (data?.error) {
          console.error('Server Error Message:', data.error);
        }
      }
    }

    // Handle session expiration (both token expiry and session timeout)
    // Only redirect if the user was actually authenticated (had a token)
    if (status === 401) {
      const token = localStorage.getItem('fypToken');
      const isSessionExpired = data?.sessionExpired || data?.tokenExpired;

      if (isSessionExpired || token) {
        // Only clear storage and redirect if user had a token
        if (token) {
          if (isSessionExpired) {
            // Show session expired message before redirecting
            const toastMessage = data.error || 'Your session has expired. Please login again.';

            // Store the message to show after redirect
            sessionStorage.setItem('loginMessage', JSON.stringify({
              type: 'warning',
              message: toastMessage
            }));
          }

          console.log('🔒 Session expired - redirecting to login');
          localStorage.removeItem('fypToken');
          localStorage.removeItem('fypUser');

          // Redirect to login
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
