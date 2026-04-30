import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, User, ChevronDown, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services';
import NotificationList from '../notifications/NotificationList';
import { formatLastActive } from '../../utils/dateUtils';

// Helper function to get full image URL
const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `http://localhost:5001${path}`;
  return path;
};

const Topbar = ({
  onMenuClick,
  academicYear,
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  onNotificationsUpdate
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount || 0);
  const [lastActive, setLastActive] = useState('');
  const [profileImageError, setProfileImageError] = useState(false);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Get profile image URL
  const profileImageUrl = user?.profilePicture && !profileImageError
    ? getFullImageUrl(user.profilePicture)
    : null;

  // Update local state when props change
  useEffect(() => {
    setNotifications(initialNotifications || []);
    setUnreadCount(initialUnreadCount || 0);
  }, [initialNotifications, initialUnreadCount]);

  // Real-time "Last Active" calculator - shows time since PREVIOUS session ended
  useEffect(() => {
    // Use sessionEndedAt which tracks when the user's last session ended
    const sessionEndedAt = user?.sessionEndedAt;

    if (!sessionEndedAt) {
      setLastActive('Never');
      return;
    }

    const calculateTime = () => {
      return formatLastActive(sessionEndedAt);
    };

    setLastActive(calculateTime());
    const interval = setInterval(() => {
      setLastActive(calculateTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user]);

  // Handle click outside
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

  const handleProfileImageError = () => {
    setProfileImageError(true);
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
    <header className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-30 w-full h-16 shrink-0" style={{ fontFamily: 'Times New Roman, serif' }}>
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
            <h1 className="text-lg font-bold text-gray-800 leading-tight tracking-wide">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-gray-500 font-medium hidden sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* RIGHT: Notifications, Profile */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-full hover:bg-gray-100 transition-all duration-300 text-gray-500 focus:outline-none hover:shadow-md"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 z-50">
                <NotificationList
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                  onUpdate={async () => {
                    // Signal parent to refresh notifications from server
                    if (onNotificationsUpdate) {
                      try {
                        const response = await notificationService.getUserNotifications(false, 50);
                        const newNotifications = response.notifications || [];
                        setNotifications(newNotifications);
                        setUnreadCount(response.unreadCount || 0);
                        onNotificationsUpdate(newNotifications);
                      } catch (err) {
                        console.error('Failed to refresh notifications:', err);
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* User Profile - With Profile Picture */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 pl-1 pr-2 sm:pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-all duration-300 border border-transparent hover:border-gray-200 hover:shadow-md focus:outline-none"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100 shadow-md bg-gray-100">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                      onError={handleProfileImageError}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Mobile Active Dot */}
                <div className="md:hidden absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
              </div>

              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-gray-700 leading-none">
                  {user?.name?.split(' ')[0]}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold leading-none mt-1">
                  {user?.role?.replace('-', ' ')}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-all duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in origin-top-right overflow-hidden" style={{ fontFamily: 'Times New Roman, serif' }}>
                {/* User Info Header */}
                <div className="px-5 py-4 border-b border-gray-50 mb-1 bg-gradient-to-br from-gray-50 to-slate-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 shadow-md">
                      {profileImageUrl ? (
                        <img
                          src={profileImageUrl}
                          alt={user?.name}
                          className="w-full h-full object-cover"
                          onError={handleProfileImageError}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Last active: {lastActive}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(getProfilePath());
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 font-medium"
                  >
                    <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    My Profile
                  </button>

                  <div className="my-1 border-t border-gray-100"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-300 font-medium"
                  >
                    <div className="p-1.5 bg-red-50 rounded-lg">
                      <LogOut className="w-4 h-4 text-red-600" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// ✅ IMPORTANT: This is the default export
export default Topbar;
