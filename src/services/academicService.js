import api from './apiConfig';

const academicService = {
  // Get current academic year
  getCurrentAcademicYear: async () => {
    try {
      const response = await api.get('/academic/current');
      return response.data;
    } catch (error) {
      console.error('Get current academic year error:', error);
      throw error.response?.data || error;
    }
  },

  // Get active academic year (alias for getCurrentAcademicYear for clarity)
  getActiveAcademicYear: async () => {
    try {
      const response = await api.get('/academic/current');
      return response.data;
    } catch (error) {
      console.error('Get active academic year error:', error);
      throw error.response?.data || error;
    }
  },

  // Start new academic year (faculty head only)
  startNewAcademicYear: async (yearData) => {
    try {
      const response = await api.post('/academic/start', yearData);
      return response.data;
    } catch (error) {
      console.error('Start new academic year error:', error);
      throw error.response?.data || error;
    }
  },

  // Switch semester (faculty head only)
  switchSemester: async (semester) => {
    try {
      const response = await api.put('/academic/semester', { semester });
      return response.data;
    } catch (error) {
      console.error('Switch semester error:', error);
      throw error.response?.data || error;
    }
  },

  // Get registration status (public)
  getRegistrationStatus: async () => {
    try {
      const response = await api.get('/academic/registration');
      return response.data;
    } catch (error) {
      console.error('Get registration status error:', error);
      throw error.response?.data || error;
    }
  },

  // Toggle registration (admin only)
  toggleRegistration: async () => {
    try {
      const response = await api.put('/academic/registration/toggle');
      return response.data;
    } catch (error) {
      console.error('Toggle registration error:', error);
      throw error.response?.data || error;
    }
  },

  // Get project domains
  getProjectDomains: async () => {
    try {
      const response = await api.get('/academic/domains');
      return response.data;
    } catch (error) {
      console.error('Get project domains error:', error);
      throw error.response?.data || error;
    }
  },

  // Add project domain (faculty head only)
  addProjectDomain: async (name) => {
    try {
      const response = await api.post('/academic/domains', { name });
      return response.data;
    } catch (error) {
      console.error('Add project domain error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete project domain (faculty head only)
  deleteProjectDomain: async (name) => {
    try {
      const response = await api.delete(`/academic/domains/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      console.error('Delete project domain error:', error);
      throw error.response?.data || error;
    }
  },

  // Get venues
  getVenues: async () => {
    try {
      const response = await api.get('/academic/venues');
      return response.data;
    } catch (error) {
      console.error('Get venues error:', error);
      throw error.response?.data || error;
    }
  },

  // Add venue (faculty head only)
  addVenue: async (name) => {
    try {
      const response = await api.post('/academic/venues', { name });
      return response.data;
    } catch (error) {
      console.error('Add venue error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete venue (faculty head only)
  deleteVenue: async (venueId) => {
    try {
      const response = await api.delete(`/academic/venues/${venueId}`);
      return response.data;
    } catch (error) {
      console.error('Delete venue error:', error);
      throw error.response?.data || error;
    }
  },

  // Get system settings (admin & faculty head)
  getSystemSettings: async () => {
    try {
      const response = await api.get('/academic/settings');
      return response.data;
    } catch (error) {
      console.error('Get system settings error:', error);
      throw error.response?.data || error;
    }
  },

  // Get password minimum length (public endpoint)
  getPasswordMinLength: async () => {
    try {
      const response = await api.get('/academic/settings/password-min-length');
      return response.data;
    } catch (error) {
      console.error('Get password min length error:', error);
      throw error.response?.data || error;
    }
  },

  // Update system setting (admin & faculty head) - FIXED: Now faculty-head can update
  updateSystemSetting: async (key, value) => {
    try {
      const response = await api.put(`/academic/settings/${key}`, { value });
      return response.data;
    } catch (error) {
      console.error('Update system setting error:', error);
      throw error.response?.data || error;
    }
  },

  // Clear cache
  clearCache: async () => {
    try {
      const response = await api.post('/academic/cache/clear');
      return response.data;
    } catch (error) {
      console.error('Clear cache error:', error);
      throw error.response?.data || error;
    }
  },

  // Get cache statistics
  getCacheStats: async () => {
    try {
      const response = await api.get('/academic/cache/stats');
      return response.data;
    } catch (error) {
      console.error('Get cache stats error:', error);
      throw error.response?.data || error;
    }
  },

  // Create backup (with compression)
  createBackup: async () => {
    try {
      const response = await api.post('/academic/backup/create', null, {
        timeout: 300000 // 5 minutes for backup creation
      });
      return response.data;
    } catch (error) {
      console.error('Create backup error:', error);
      throw error.response?.data || error;
    }
  },

  // Get backup list
  getBackupList: async () => {
    try {
      const response = await api.get('/academic/backup/list');
      return response.data;
    } catch (error) {
      console.error('Get backup list error:', error);
      throw error.response?.data || error;
    }
  },

  // Get backup statistics
  getBackupStats: async () => {
    try {
      const response = await api.get('/academic/backup/stats');
      return response.data;
    } catch (error) {
      console.error('Get backup stats error:', error);
      throw error.response?.data || error;
    }
  },

  // Restore backup
  restoreBackup: async (backupFile) => {
    try {
      const response = await api.post('/academic/backup/restore', 
        { backupFile },
        { 
          timeout: 300000 // 5 minutes for restore operation
        }
      );
      return response.data;
    } catch (error) {
      console.error('Restore backup error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete backup
  deleteBackup: async (filename) => {
    try {
      const response = await api.delete(`/academic/backup/${filename}`);
      return response.data;
    } catch (error) {
      console.error('Delete backup error:', error);
      throw error.response?.data || error;
    }
  },

  // Download backup
  downloadBackup: (filename) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_API_URL || '/api'}/academic/backup/download/${filename}`;
    link.setAttribute('download', filename);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Update backup settings
  updateBackupSettings: async (settings) => {
    try {
      const response = await api.put('/academic/backup/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Update backup settings error:', error);
      throw error.response?.data || error;
    }
  },

  // Get backup status
  getBackupStatus: async () => {
    try {
      const response = await api.get('/academic/backup/status');
      return response.data;
    } catch (error) {
      console.error('Get backup status error:', error);
      throw error.response?.data || error;
    }
  },

  // Stop current backup
  stopBackup: async () => {
    try {
      const response = await api.post('/academic/backup/stop');
      return response.data;
    } catch (error) {
      console.error('Stop backup error:', error);
      throw error.response?.data || error;
    }
  }
};

export default academicService;