import api from './apiConfig';

const progressService = {
  // Submit progress report
  submitProgressReport: async (reportData) => {
    try {
      const response = await api.post('/progress', reportData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  uploadProgressFile: async (formData) => {
    try {
      const response = await api.post('/upload/progress-report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get progress reports by group
  getProgressReportsByGroup: async (groupId) => {
    try {
      const response = await api.get(`/progress/group/${groupId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get progress reports by advisor
  getProgressReportsByAdvisor: async (advisorId, status = null) => {
    try {
      let url = `/progress/advisor/${advisorId}`;
      if (status) url += `?status=${status}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add feedback to report
  addFeedback: async (reportId, feedback) => {
    try {
      const response = await api.put(`/progress/${reportId}/feedback`, { feedback });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check overdue reports
  checkOverdueReports: async () => {
    try {
      const response = await api.post('/progress/check-overdue');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default progressService;