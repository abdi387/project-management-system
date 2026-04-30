import api from './apiConfig';

const proposalService = {
  // Submit proposal
  submitProposal: async (proposalData) => {
    try {
      const response = await api.post('/proposals', proposalData);
      return response.data;
    } catch (error) {
      console.error('Submit proposal error:', error);
      throw error.response?.data || error;
    }
  },

  // Get proposal by group ID
  getProposalByGroupId: async (groupId) => {
    try {
      const response = await api.get(`/proposals/group/${groupId}`);
      return response.data;
    } catch (error) {
      // Don't log 404 errors - they're expected
      if (error.response?.status !== 404) {
        console.error('Get proposal by group error:', error);
      }
      throw error.response?.data || error;
    }
  },

  // Get proposals by department (dept head)
  getProposalsByDepartment: async (department, status = null) => {
    try {
      const url = status 
        ? `/proposals/department/${department}?status=${status}`
        : `/proposals/department/${department}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Get proposals by department error:', error);
      throw error.response?.data || error;
    }
  },

  // Approve proposal (dept head)
  approveProposal: async (proposalId, selectedTitleIndex) => {
    try {
      const response = await api.put(`/proposals/${proposalId}/approve`, {
        selectedTitleIndex
      });
      return response.data;
    } catch (error) {
      console.error('Approve proposal error:', error);
      throw error.response?.data || error;
    }
  },

  // Reject proposal (dept head)
  rejectProposal: async (proposalId, feedback) => {
    try {
      const response = await api.put(`/proposals/${proposalId}/reject`, {
        feedback
      });
      return response.data;
    } catch (error) {
      console.error('Reject proposal error:', error);
      throw error.response?.data || error;
    }
  }
};

export default proposalService;