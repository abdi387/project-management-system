import api from './apiConfig';

const authService = {
  // Register new student
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Store token and user in localStorage
      if (response.data.token) {
        localStorage.setItem('fypToken', response.data.token);
        localStorage.setItem('fypUser', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      // Call backend to record session end time
      await api.post('/auth/logout');
    } catch (error) {
      // Still clear local storage even if backend call fails
      console.error('Logout backend call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('fypToken');
      localStorage.removeItem('fypUser');
    }
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      
      // Update stored user data
      if (response.data.user) {
        localStorage.setItem('fypUser', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('fypToken');
  },

  // Get stored user
  getStoredUser: () => {
    const userStr = localStorage.getItem('fypUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Request password reset
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reset password with token
  resetPassword: async (token, password) => {
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify reset token
  verifyResetToken: async (token) => {
    try {
      const response = await api.get(`/auth/verify-reset-token/${token}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Initiate password reset (for logged-in users)
  resetPasswordInitiate: async () => {
    try {
      const response = await api.post('/auth/reset-password-initiate');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Change password with current password verification
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default authService;