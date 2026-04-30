import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { academicService, notificationService } from '../../services';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import SemesterStatusBanner from '../common/SemesterStatusBanner';
import { ProtectedRouteProvider } from '../../context/ProtectedRouteContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading: authLoading } = useAuth();
  const { notifications: contextNotifications, unreadCount: contextUnreadCount, loadNotifications } = useNotification();
  
  // Initialize from localStorage immediately to prevent layout shifts
  const [academicYear, setAcademicYear] = useState(() => {
    const stored = localStorage.getItem('fypAcademicYear');
    return stored ? JSON.parse(stored) : null;
  });
  const [notifications, setNotifications] = useState([]);
  const [systemSettings, setSystemSettings] = useState(() => {
    const stored = localStorage.getItem('fypSystemSettings');
    return stored ? JSON.parse(stored) : {};
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const hasFetchedRef = useRef(false);

  // Reset fetch flag when user changes (logout/login)
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [user]);

  // Sync with context notifications
  useEffect(() => {
    if (contextNotifications) {
      setNotifications(contextNotifications);
    }
    if (contextUnreadCount !== undefined) {
      setUnreadCount(contextUnreadCount);
    }
  }, [contextNotifications, contextUnreadCount]);

  // Fetch all necessary data on mount or when user changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch academic year from API
        const academicResponse = await academicService.getCurrentAcademicYear().catch(err => {
          console.error('Failed to fetch academic year:', err);
          return null;
        });

        // Only update state if we got fresh data from API
        if (isMounted && academicResponse?.academicYear) {
          setAcademicYear(prev => {
            const stringified = JSON.stringify(academicResponse.academicYear);
            if (JSON.stringify(prev) === stringified) return prev;
            localStorage.setItem('fypAcademicYear', stringified);
            return academicResponse.academicYear;
          });
        } else if (isMounted && !academicYear) {
          setAcademicYear({ status: 'pending_setup', semester: '1', current: 'Not Configured' });
        }

        // Only fetch system settings for admin and faculty-head
        if (isMounted && ['admin', 'faculty-head'].includes(user.role)) {
          const settingsResponse = await academicService.getSystemSettings().catch(err => {
            console.error('Failed to fetch system settings:', err);
            return null;
          });

          if (isMounted && settingsResponse?.settings) {
            setSystemSettings(prev => {
              const stringified = JSON.stringify(settingsResponse.settings);
              if (JSON.stringify(prev) === stringified) return prev;
              localStorage.setItem('fypSystemSettings', stringified);
              return settingsResponse.settings;
            });
          }
        }

        // Load notifications
        if (isMounted) {
          try {
            await loadNotifications();
          } catch (notifErr) {
            console.error('Failed to load notifications:', notifErr);
          }
        }

      } catch (err) {
        if (isMounted) {
          console.error('Error fetching protected route data:', err);
          setError('Failed to load some data. Please refresh the page.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user]); // Fetch when user changes

  // Set up periodic notification check separately
  useEffect(() => {
    // Set up periodic notification check
    const notificationInterval = user ? setInterval(async () => {
      try {
        await loadNotifications();
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    }, 30000) : null;

    return () => {
      if (notificationInterval) clearInterval(notificationInterval);
    };
  }, [user, loadNotifications]);

  // Set up periodic settings refresh to get updated values from faculty-head changes
  useEffect(() => {
    const shouldFetchSettings = user && ['admin', 'faculty-head'].includes(user.role);
    const settingsInterval = shouldFetchSettings ? setInterval(async () => {
      try {
        const response = await academicService.getSystemSettings();
        const newSettings = response.settings || {};

        // Check if settings have changed
        setSystemSettings(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(newSettings);
          if (hasChanged) {
            console.log('System settings updated from server:', newSettings);
            localStorage.setItem('fypSystemSettings', JSON.stringify(newSettings));
            return newSettings;
          }
          return prev;
        });
      } catch (err) {
        // Silently fail - settings will be refreshed on next interval
      }
    }, 60000) : null; // Check every 60 seconds

    return () => {
      if (settingsInterval) clearInterval(settingsInterval);
    };
  }, [user]);

  // Set up periodic reconnection check to refresh academic year after server restart
  useEffect(() => {

    const reconnectionInterval = setInterval(async () => {
      try {
        // Try to fetch current academic year from server
        const response = await academicService.getCurrentAcademicYear();

        if (response?.academicYear) {
          // Check if data has changed
          setAcademicYear(prev => {
            const isNewData = JSON.stringify(prev) !== JSON.stringify(response.academicYear);
            if (isNewData) {
              console.log('Academic year updated from server after reconnection');
              localStorage.setItem('fypAcademicYear', JSON.stringify(response.academicYear));
              return response.academicYear;
            }
            return prev;
          });
        }
      } catch (err) {
        // Silently fail - this is expected when server is down
        // The cached data in localStorage will be used
      }
    }, 30000); // Check every 30 seconds for server reconnection

    return () => clearInterval(reconnectionInterval);
  }, [user]);

  // ALL HOOKS MUST BE BEFORE EARLY RETURNS
  const checkAccess = useCallback(() => {
    if (!user) return false;
    if (!allowedRoles) return true;
    return allowedRoles.includes(user.role);
  }, [user, allowedRoles]);

  const getReadOnlyStatus = useCallback(() => {
    if (!user || !academicYear) return false;

    // Faculty-head and admin always have edit access
    if (['faculty-head', 'admin'].includes(user.role)) return false;

    // When academic year is terminated, enable read-only mode
    if (academicYear.status === 'terminated') {
      const isProfilePage = location.pathname.endsWith('/profile');
      if (isProfilePage) return false;
      return true;
    }

    return false;
  }, [user, academicYear, location.pathname]);

  const isFeatureAvailable = useCallback((feature) => {
    if (!academicYear) return true;

    const semester1Features = [
      'proposal-submission', 'project-marketplace', 'group-formation', 'student-registration'
    ];

    const semester2Features = [
      'progress-reporting', 'final-draft', 'defense-scheduling'
    ];

    // When terminated or pending_setup, project-related features are unavailable
    const projectRelatedFeatures = [
      'proposal-submission', 'project-marketplace', 'progress-reporting',
      'final-draft', 'defense-scheduling', 'proposal-evaluation',
      'group-generation', 'progress-monitoring', 'dept-final-drafts',
      'dept-defense-schedule', 'advisor-evaluations'
    ];

    if ((academicYear.status === 'terminated' || academicYear.status === 'pending_setup') && projectRelatedFeatures.includes(feature)) {
      return false;
    }

    if (academicYear.semester === '1' && semester2Features.includes(feature)) {
      return false;
    }

    if (academicYear.semester === '2' && semester1Features.includes(feature)) {
      return false;
    }

    return true;
  }, [academicYear]);

  // Memoize handlers to prevent recreation - MUST BE BEFORE EARLY RETURNS
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const refreshSettings = useCallback(async () => {
    try {
      const response = await academicService.getSystemSettings();
      const newSettings = response.settings || {};
      setSystemSettings(newSettings);
      localStorage.setItem('fypSystemSettings', JSON.stringify(newSettings));
      console.log('System settings refreshed:', newSettings);
    } catch (err) {
      console.error('Failed to refresh system settings:', err);
    }
  }, []);

  const refreshAcademicYear = useCallback(async () => {
    try {
      const response = await academicService.getCurrentAcademicYear();
      const newAcademicYear = response.academicYear;
      setAcademicYear(newAcademicYear);
      localStorage.setItem('fypAcademicYear', JSON.stringify(newAcademicYear));
      console.log('Academic year refreshed:', newAcademicYear);
    } catch (err) {
      console.error('Failed to refresh academic year:', err);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  // Only include actual values in dependency array, not functions
  const isReadOnly = getReadOnlyStatus();
  const protectedContextValue = useMemo(() => ({
    academicYear,
    systemSettings,
    isReadOnly,
    isFeatureAvailable,
    notifications,
    unreadCount,
    refreshNotifications,
    refreshSettings,
    refreshAcademicYear
  }), [
    academicYear,
    systemSettings,
    isReadOnly,
    notifications,
    unreadCount
  ]);

  // NOW WE CAN DO EARLY RETURNS
  if (authLoading || loading) {
    return <LoadingSpinner fullScreen text="Loading your dashboard..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!checkAccess()) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorAlert message={error} />
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar - Pass props correctly */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        academicYear={academicYear}
        unreadCount={unreadCount}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar - Pass props correctly */}
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          academicYear={academicYear}
          notifications={notifications}
          unreadCount={unreadCount}
          onNotificationsUpdate={async () => {
            // Refresh notifications from context
            await loadNotifications();
          }}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full pb-10">
            {/* Semester Status Banner - Always reserve space to prevent layout shift */}
            <div className="mb-6 min-h-[40px]">
              {(academicYear?.status === 'terminated' || academicYear?.semester) && (
                <SemesterStatusBanner
                  academicYear={academicYear}
                  isReadOnly={getReadOnlyStatus()}
                />
              )}
            </div>

            {/* Pass context to children */}
            <ProtectedRouteProvider value={protectedContextValue}>
              {children}
            </ProtectedRouteProvider>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProtectedRoute;