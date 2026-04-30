import api from './apiConfig';

const defenseService = {
  // Get all defense schedules
  getDefenseSchedules: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/defense?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get defense schedule by ID
  getDefenseScheduleById: async (scheduleId) => {
    try {
      const response = await api.get(`/defense/${scheduleId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get defense schedule by group ID
  getDefenseScheduleByGroup: async (groupId) => {
    try {
      const response = await api.get(`/defense/group/${groupId}`);
      return response.data;
    } catch (error) {
      // Silently handle 404 errors - they're expected
      if (error.response?.status === 404) {
        // Return a consistent error object without logging
        return Promise.reject({ 
          response: { 
            status: 404, 
            data: { success: false, error: 'No defense schedule found' } 
          } 
        });
      }
      // Log other errors
      console.error('Get defense schedule by group error:', error);
      throw error.response?.data || error;
    }
  },

  // Create defense schedule (faculty head only)
  createDefenseSchedule: async (scheduleData) => {
    try {
      const response = await api.post('/defense', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Create defense schedule error:', error);
      throw error.response?.data || error;
    }
  },

  // Update defense schedule (faculty head only)
  updateDefenseSchedule: async (scheduleId, scheduleData) => {
    try {
      const response = await api.put(`/defense/${scheduleId}`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Update defense schedule error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete defense schedule (faculty head only)
  deleteDefenseSchedule: async (scheduleId) => {
    try {
      const response = await api.delete(`/defense/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.error('Delete defense schedule error:', error);
      throw error.response?.data || error;
    }
  },

  // Get defense schedules for evaluator
  getDefenseSchedulesForEvaluator: async (evaluatorId) => {
    try {
      const response = await api.get(`/defense/evaluator/${evaluatorId}`);
      return response.data;
    } catch (error) {
      console.error('Get defense schedules for evaluator error:', error);
      throw error.response?.data || error;
    }
  },

  // Automatically generate defense schedules
  generateDefenseSchedule: async (payload) => {
    try {
      const response = await api.post('/defense/generate', payload);
      return response.data;
    } catch (error) {
      // Re-throw the error so the component can catch it
      throw error.response?.data || error;
    }
  }
};

export default defenseService;