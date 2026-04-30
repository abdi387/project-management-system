import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, CheckCircle, AlertCircle, Users, FileText, Calendar, Star } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { getRelativeTime } from '../../utils/dateUtils';

const NotificationItem = ({ notification, onDelete, onClose }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotification();
  const [isRead, setIsRead] = useState(notification.isRead);

  const handleClick = async () => {
    try {
      // Mark as read if not already
      if (!isRead) {
        setIsRead(true);
        await markAsRead(notification.id);
        if (onDelete) onDelete();
      }

      // Navigate to the relevant page if link exists
      if (notification.link) {
        navigate(notification.link);
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteNotification(notification.id);
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get icon based on notification type
  const getIcon = () => {
    const type = notification.type || 'default';
    switch (type) {
      case 'new-registration':
        return { icon: Users, color: '#3b82f6', bg: '#eff6ff' };
      case 'registration-approved':
        return { icon: CheckCircle, color: '#10b981', bg: '#f0fdf4' };
      case 'registration-rejected':
        return { icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' };
      case 'proposal-submission':
        return { icon: FileText, color: '#8b5cf6', bg: '#f5f3ff' };
      case 'group-formed':
        return { icon: Users, color: '#06b6d4', bg: '#ecfeff' };
      case 'evaluators-assigned-group':
        return { icon: Users, color: '#ec4899', bg: '#fdf2f8' };
      case 'defense-schedule':
        return { icon: Calendar, color: '#6366f1', bg: '#eef2ff' };
      case 'defense-scheduled':
        return { icon: Calendar, color: '#8b5cf6', bg: '#f5f3ff' };
      case 'semester-change':
      case 'year-started':
        return { icon: Calendar, color: '#f59e0b', bg: '#fffbeb' };
      default:
        return { icon: Bell, color: '#6b7280', bg: '#f9fafb' };
    }
  };

  const { icon: Icon, color, bg } = getIcon();

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid #f0f0f0',
        cursor: notification.link ? 'pointer' : 'default',
        backgroundColor: isRead ? '#fff' : bg,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isRead ? '#f9fafb' : color + '20';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isRead ? '#fff' : bg;
      }}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div style={{
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: '3px',
          backgroundColor: color,
          borderRadius: '0 4px 4px 0'
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={20} color={color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: '0 0 6px 0',
          fontSize: '14px',
          fontWeight: isRead ? '400' : '600',
          color: '#1f2937',
          lineHeight: '1.4'
        }}>
          {notification.message}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            color: '#9ca3af'
          }}>
            {getRelativeTime(notification.createdAt)}
          </span>
          {!isRead && (
            <span style={{
              fontSize: '10px',
              backgroundColor: color,
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: '500'
            }}>
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#fee2e2';
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#9ca3af';
        }}
        title="Delete"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationItem;
