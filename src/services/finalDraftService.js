import api from './apiConfig';

/**
 * Service for final draft operations
 */
const finalDraftService = {
  /**
   * Get final draft by group ID
   * @param {string} groupId
   * @returns {Promise<Object>}
   */
  getFinalDraftByGroup: async (groupId) => {
    try {
      const response = await api.get(`/final-drafts/group/${groupId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, drafts: [] };
      }
      console.error('Get final draft by group error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Submit final draft
   * @param {Object} draftData { groupId, title, fileUrl }
   * @returns {Promise<Object>}
   */
  submitFinalDraft: async (draftData) => {
    try {
      const response = await api.post('/final-drafts', draftData);
      return response.data;
    } catch (error) {
      console.error('Submit final draft error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get pending final drafts for the logged-in advisor
   * @returns {Promise<Object>} { drafts: [] }
   */
  getPendingAdvisorDrafts: async () => {
    try {
      const response = await api.get('/final-drafts/advisor/pending');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, drafts: [] };
      }
      console.error('Get pending advisor drafts error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get final drafts by department (for department head)
   * @param {string} department 
   * @param {number} [academicYearId] - Optional academic year ID to filter by
   * @returns {Promise<Object>}
   */
  getDepartmentDrafts: async (department, academicYearId) => {
    try {
      let url = `/final-drafts/department/${encodeURIComponent(department)}`;
      if (academicYearId) {
        url += `?academicYearId=${academicYearId}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, drafts: [] };
      }
      console.error('Get department drafts error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get drafts by department (alias for getDepartmentDrafts)
   * @param {string} department 
   * @param {number} [academicYearId]
   * @returns {Promise<Object>}
   */
  getDraftsByDepartment: async (department, academicYearId) => {
    return finalDraftService.getDepartmentDrafts(department, academicYearId);
  },

  /**
   * Advisor approves a draft
   * @param {string} draftId 
   * @returns {Promise<Object>}
   */
  approveByAdvisor: async (draftId) => {
    try {
      const response = await api.put(`/final-drafts/${draftId}/advisor-approve`);
      return response.data;
    } catch (error) {
      console.error('Advisor approve error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Department head approves a draft
   * @param {string} draftId 
   * @returns {Promise<Object>}
   */
  approveByDept: async (draftId) => {
    try {
      const response = await api.put(`/final-drafts/${draftId}/dept-approve`);
      return response.data;
    } catch (error) {
      console.error('Dept approve error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get drafts by group (alternative)
   * @param {string} groupId 
   * @returns {Promise<Object>}
   */
  getDraftsByGroup: async (groupId) => {
    try {
      const response = await api.get(`/final-drafts/group/${groupId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, drafts: [] };
      }
      console.error('Get drafts by group error:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get all final drafts for faculty head (approved and pending)
   * @param {number} [academicYearId] - Optional academic year ID to filter by
   * @param {string} [status] - Optional status filter ('pending' or 'approved')
   * @returns {Promise<Object>}
   */
  getFacultyHeadDrafts: async (academicYearId, status) => {
    try {
      let url = '/final-drafts/faculty-head/drafts';
      const params = [];
      if (academicYearId) {
        params.push(`academicYearId=${academicYearId}`);
      }
      if (status) {
        params.push(`status=${status}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, drafts: [] };
      }
      console.error('Get faculty head drafts error:', error);
      throw error.response?.data || error;
    }
  }
};

export default finalDraftService;
