import api from './apiConfig';

const groupService = {
  // Get all groups
  getGroups: async (filters = {}) => {
    try {
      // Filter out undefined/null values
      const validFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== null && value !== '')
      );
      const params = new URLSearchParams(validFilters).toString();
      const response = await api.get(`/groups?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get group by ID
  getGroupById: async (groupId) => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get group by student ID
  getGroupByStudentId: async (studentId) => {
    try {
      const response = await api.get(`/groups/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Generate groups automatically (dept head only)
  generateGroups: async (department, maxPerGroup) => {
    try {
      const response = await api.post('/groups/generate', {
        department,
        maxPerGroup
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete groups (for undo functionality)
  deleteGroups: async (groupIds) => {
    try {
      const response = await api.delete('/groups', {
        data: { groupIds }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Assign advisor to group (advisor only)
  assignAdvisor: async (groupId, advisorId) => {
    try {
      const response = await api.put(`/groups/${groupId}/assign-advisor`, {
        advisorId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Assign evaluators to group (faculty head only)
  assignEvaluators: async (groupId, evaluatorIds) => {
    try {
      const response = await api.post(`/groups/${groupId}/evaluators`, {
        evaluatorIds
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get groups for evaluator
  getGroupsForEvaluator: async (evaluatorId) => {
    try {
      const response = await api.get(`/groups/evaluator/${evaluatorId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get available projects (groups with approved proposals but no advisor)
  getAvailableProjects: async () => {
    try {
      const response = await api.get('/groups/available-projects');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default groupService;