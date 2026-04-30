import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { notificationService, sectionService } from '../services';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sectionNameMap, setSectionNameMap] = useState({});

  // Load sections to resolve section names in notification content
  useEffect(() => {
    const loadSections = async () => {
      try {
        const response = await sectionService.getAllSections();
        const sections = Array.isArray(response) ? response : (response?.sections || []);
        const map = {};
        sections.forEach(s => {
          if (s.id && s.name) map[s.id] = s.name;
        });
        setSectionNameMap(map);
      } catch (err) {
        console.error('Failed to load sections for notification sanitization:', err);
      }
    };
    if (user) loadSections();
  }, [user]);

  const sanitizeNotifications = useCallback((notifs) => {
    if (!sectionNameMap || Object.keys(sectionNameMap).length === 0) return notifs;

    return notifs.map(n => {
      let title = n.title || '';
      let message = n.message || '';

      // Global replacement of any section IDs found in content
      Object.entries(sectionNameMap).forEach(([id, name]) => {
        if (title.includes(id)) title = title.split(id).join(name);
        if (message.includes(id)) message = message.split(id).join(name);
      });

      return { ...n, title, message };
    });
  }, [sectionNameMap]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Re-sanitize if map becomes available after notifications are already loaded
  useEffect(() => {
    if (notifications.length > 0 && Object.keys(sectionNameMap).length > 0) {
      setNotifications(prev => sanitizeNotifications(prev));
    }
  }, [sectionNameMap, sanitizeNotifications]);

  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'FYP Management System';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await notificationService.getUserNotifications();
      const rawNotifs = response.notifications || [];
      setNotifications(sanitizeNotifications(rawNotifs));
      setUnreadCount(response.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, sanitizeNotifications]);

  const addNotification = async (notification) => {
    try {
      const response = await notificationService.createNotification(notification);
      await loadNotifications();
      return response;
    } catch (err) {
      console.error('Failed to add notification:', err);
      throw err;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state immediately for UI feedback
      setNotifications(prev => {
        const updated = prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        // Calculate unread count from updated local state
        const newUnreadCount = updated.filter(n => !n.isRead).length;
        setUnreadCount(newUnreadCount);
        return updated;
      });

      // Refresh from server to ensure sync
      await loadNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationService.markAllAsRead();
      // Refresh from server to ensure sync
      await loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      throw err;
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);

      // Update local state immediately for UI feedback
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        // Calculate unread count from updated local state
        const newUnreadCount = updated.filter(n => !n.isRead).length;
        setUnreadCount(newUnreadCount);
        return updated;
      });

      // Refresh from server to ensure sync
      await loadNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      await notificationService.clearAllNotifications();
      // Refresh from server to ensure sync
      await loadNotifications();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      throw err;
    }
  };

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;