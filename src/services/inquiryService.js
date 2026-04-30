import api from './apiConfig';

const inquiryService = {
  // Submit inquiry (public)
  submitInquiry: async (inquiryData) => {
    try {
      const response = await api.post('/inquiries', inquiryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all inquiries (admin only)
  getInquiries: async (status = null) => {
    try {
      let url = '/inquiries';
      if (status) url += `?status=${status}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Mark inquiry as resolved
  resolveInquiry: async (inquiryId, response = null, status = null) => {
    try {
      const requestBody = {};
      if (response !== null) requestBody.response = response;
      if (status !== null) requestBody.status = status;
      
      const response_data = await api.put(`/inquiries/${inquiryId}/resolve`, requestBody);
      return response_data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete inquiry
  deleteInquiry: async (inquiryId) => {
    try {
      const response = await api.delete(`/inquiries/${inquiryId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default inquiryService;