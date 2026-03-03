// src/context/NotificationBell.jsx
import React from 'react';
import { useNotification } from './NotificationContext';

const NotificationBell = () => {
  const { unreadCount } = useNotification();

  const wrapperStyle = {
    position: 'relative',
    margin: '0 1rem',
    cursor: 'pointer'
  };

  const iconStyle = {
    fontSize: '1.5rem',
    color: '#333'
  };

  const badgeStyle = {
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
  };

  return (
    <div style={wrapperStyle}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      {unreadCount > 0 && <span style={badgeStyle}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </div>
  );
};

export default NotificationBell;