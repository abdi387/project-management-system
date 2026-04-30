import React from 'react';
import { X, Bell } from 'lucide-react';
import NotificationItem from './NotificationItem';

const NotificationList = ({ notifications, onClose, onUpdate }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <div style={{
        width: '360px',
        padding: '40px 20px',
        textAlign: 'center',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bell size={32} color="#9ca3af" />
        </div>
        <p style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          No notifications
        </p>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      width: '360px',
      maxHeight: '500px',
      overflowY: 'auto',
      backgroundColor: '#fff',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      border: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '16px 16px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={20} color="#6b7280" />
          <span style={{ 
            fontWeight: '700', 
            fontSize: '16px',
            color: '#1f2937'
          }}>
            Notifications
          </span>
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span style={{
              fontSize: '11px',
              backgroundColor: '#ef4444',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              {notifications.filter(n => !n.isRead).length} new
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
            e.currentTarget.style.color = '#1f2937';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Notification Items */}
      <div>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDelete={onUpdate}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationList;
