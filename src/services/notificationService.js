import api from './apiConfig';

const notificationService = {
  // Get user notifications
  getUserNotifications: async (unreadOnly = false, limit = 50) => {
    try {
      const response = await api.get(`/notifications?unreadOnly=${unreadOnly}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error.response?.data || error;
    }
  },

  // Create notification
  createNotification: async (notificationData) => {
    try {
      const response = await api.post('/notifications', notificationData);
      return response.data;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error.response?.data || error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error.response?.data || error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error.response?.data || error;
    }
  },

  // Clear all notifications for user
  clearAllNotifications: async () => {
    try {
      const response = await api.delete('/notifications/clear-all');
      return response.data;
    } catch (error) {
      console.error('Clear all notifications error:', error);
      throw error.response?.data || error;
    }
  }
};

export default notificationService;