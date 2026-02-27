// src/components/layout/Topbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, User, ChevronDown, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import NotificationList from '../notifications/NotificationList';

const Topbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { getUserNotifications, getUnreadCount, markAllAsRead } = useNotification();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // State for session timer
  const [onlineSince, setOnlineSince] = useState('');
  
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const notifications = user ? getUserNotifications(user.id) : [];
  const unreadCount = user ? getUnreadCount(user.id) : 0;

  // Real-time "Online Since" calculator
  useEffect(() => {
    if (!user?.lastLogin) return;

    const calculateTime = () => {
      const loginTime = new Date(user.lastLogin);
      const now = new Date();
      const diffInMinutes = Math.floor((now - loginTime) / 60000);
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ${diffInMinutes % 60}m ago`;
    };

    setOnlineSince(calculateTime());
    const interval = setInterval(() => {
      setOnlineSince(calculateTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = () => {
    if (user) markAllAsRead(user.id);
  };

  const getProfilePath = () => {
    switch (user?.role) {
      case 'student': return '/student/profile';
      case 'advisor': return '/advisor/profile';
      case 'dept-head': return '/dept-head/profile';
      case 'faculty-head': return '/faculty-head/profile';
      case 'admin': return '/admin/profile';
      default: return '/';
    }
  };

  const getAvatarColor = () => {
    switch (user?.role) {
      case 'student': return '3b82f6';
      case 'advisor': return '8b5cf6';
      case 'dept-head': return '14b8a6';
      case 'faculty-head': return '6366f1';
      case 'admin': return '374151';
      default: return '3b82f6';
    }
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=${getAvatarColor()}&color=fff&size=40`;

  const getPageTitle = () => {
    switch(user?.role) {
      case 'admin': return 'System Administrator';
      case 'faculty-head': return 'Faculty Head Dashboard';
      case 'dept-head': return 'Department Dashboard';
      case 'advisor': return 'Advisor Dashboard';
      case 'student': return 'Student Dashboard';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 w-full h-16 shrink-0">
      <div className="flex items-center justify-between px-4 sm:px-6 h-full">
        
        {/* LEFT: Hamburger + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-800 leading-tight tracking-tight">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-gray-500 font-medium hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* RIGHT: Status, Notifs, Profile */}
        <div className="flex items-center gap-3 sm:gap-5">
          
          {/* Online Status Indicator (Desktop Only) */}
          <div className="hidden md:flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </div>
            <span className="text-xs font-semibold text-green-700">Online</span>
            <span className="text-xs text-green-600 border-l border-green-200 pl-2">
              {onlineSince}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 focus:outline-none"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in origin-top-right">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Mark all read</button>
                  )}
                </div>
                <NotificationList notifications={notifications.slice(0, 5)} onClose={() => setShowNotifications(false)} />
              </div>
            )}
          </div>

          {/* User Profile - Far Right */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 pl-1 pr-1 sm:pr-2 py-1 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 focus:outline-none"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-100 shadow-sm">
                  <img src={user?.profilePicture || defaultAvatar} alt={user?.name} className="w-full h-full object-cover" />
                </div>
                {/* Mobile Online Dot */}
                <div className="md:hidden absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-gray-700 leading-none">{user?.name?.split(' ')[0]}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold leading-none mt-1">{user?.role?.replace('-', ' ')}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in origin-top-right">
                <div className="px-5 py-3 border-b border-gray-50 mb-1">
                  <p className="font-bold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Login: {onlineSince}
                  </p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); navigate(getProfilePath()); }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" /> My Profile
                </button>
                <div className="my-1 border-t border-gray-50"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;