import api from './apiConfig';

const sectionService = {
  // Get all sections
  getAllSections: async () => {
    try {
      const response = await api.get('/sections');
      return response.data;
    } catch (error) {
      console.error('Get all sections error:', error);
      // Return empty array on error to prevent breaking the UI
      return { success: false, sections: [] };
    }
  },

  // Get sections grouped by department
  getSectionsGroupedByDepartment: async () => {
    try {
      const response = await api.get('/sections/grouped');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get sections by department
  getSectionsByDepartment: async (department, isActive = null) => {
    try {
      const params = {};
      if (isActive !== null) params.isActive = isActive;
      
      const response = await api.get(`/sections/department/${department}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create or update section
  upsertSection: async (sectionData) => {
    try {
      const response = await api.post('/sections', sectionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Bulk save sections
  bulkSaveSections: async (sections) => {
    try {
      const response = await api.post('/sections/bulk', { sections });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete section
  deleteSection: async (sectionId) => {
    try {
      const response = await api.delete(`/sections/${sectionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default sectionService;
