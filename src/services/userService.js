import api from './apiConfig';

const userService = {
  // Get all users (with filters)
  getUsers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Only add non-empty filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `/users${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get users by role
  getUsersByRole: async (role) => {
    try {
      const response = await api.get(`/users/role/${role}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get users by department
  getUsersByDepartment: async (department, role = null, status = null) => {
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      
      const queryString = params.toString();
      const url = `/users/department/${department}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ✅ ADD THIS FUNCTION - Get pending students for department
  getPendingStudents: async (department) => {
    try {
      const response = await api.get(`/users/pending/${department}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update own profile (for any authenticated user)
  updateOwnProfile: async (profileData) => {
    try {
      const response = await api.put('/users/profile/me', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new user (admin only)
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user (admin only)
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete user (admin only)
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Approve student
  approveStudent: async (studentId) => {
    try {
      const response = await api.put(`/users/${studentId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reject student
  rejectStudent: async (studentId) => {
    try {
      const response = await api.put(`/users/${studentId}/reject`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Deactivate all students (for starting new academic year)
  deactivateStudents: async () => {
    try {
      const response = await api.put('/users/students/deactivate-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reset system data (admin only) - clears all project data except users
  resetSystemData: async () => {
    try {
      const response = await api.delete('users/reset-data');
      return response.data;
    } catch (error) {
      console.error('Reset system data API error:', error.response?.data || error);
      throw error.response?.data || error;
    }
  }
};

export default userService;