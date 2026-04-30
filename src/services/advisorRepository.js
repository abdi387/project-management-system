import api from './apiConfig';

const advisorRepository = {
  // Get repository by advisor ID
  getByAdvisor: async (advisorId) => {
    try {
      const response = await api.get(`/advisor-repository/${advisorId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all repository entries (admin only)
  getAll: async () => {
    try {
      const response = await api.get('/advisor-repository');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Archive current semester data (faculty head only)
  archiveSemester: async (advisorId, semester, academicYearId) => {
    try {
      const response = await api.post('/advisor-repository/archive', {
        advisorId,
        semester,
        academicYearId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete repository entry (admin only)
  deleteEntry: async (entryId) => {
    try {
      const response = await api.delete(`/advisor-repository/${entryId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default advisorRepository;