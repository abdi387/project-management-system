import api from './apiConfig';

const aiSuggestionService = {
  /**
   * Check AI service health
   */
  checkAIHealth: async () => {
    try {
      const response = await api.get('/proposals/ai-health', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: 'Service unreachable',
        status: 'offline'
      };
    }
  },

  /**
   * Get AI title suggestions
   */
  getTitleSuggestions: async (query) => {
    try {
      const response = await api.post('/proposals/ai-suggest-titles', query, {
        timeout: 60000
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        error: error.message || 'Network error',
        errorType: 'network'
      };
    }
  }
};

export default aiSuggestionService;
