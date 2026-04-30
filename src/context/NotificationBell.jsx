// src/context/NotificationBell.jsx
import React from 'react';
import { Bell } from 'lucide-react';
import { useNotification } from './NotificationContext';

const NotificationBell = ({ onClick }) => {
  const { unreadCount } = useNotification();

  return (
    <div 
      onClick={onClick}
      style={{
        position: 'relative',
        margin: '0 1rem',
        cursor: 'pointer'
      }}
    >
      <Bell style={{ fontSize: '1.5rem', color: '#333' }} />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          right: '-12px',
          backgroundColor: 'red',
          color: 'white',
          borderRadius: '50%',
          padding: '0.15rem 0.45rem',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '20px'
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;