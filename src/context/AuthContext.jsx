import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService, academicService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = authService.getStoredUser();
      const token = localStorage.getItem('fypToken');
      
      if (storedUser && token) {
        try {
          // Verify token by fetching current user
          const response = await authService.getCurrentUser();
          setUser(response.user);
          setServerError(false);
          setAuthError(null);
        } catch (error) {
          console.error('Failed to load user:', error);
          
          // Check if it's a server connection error
          if (error.message?.includes('timeout') || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
            setServerError(true);
            setAuthError('Cannot connect to server. Please check if backend is running.');
            // Keep the stored user for offline display
            setUser(storedUser);
          } else {
            // Token invalid, clear storage
            authService.logout();
            setAuthError('Session expired. Please login again.');
          }
        }
      }
      
      // Load registration status
      try {
        const regResponse = await academicService.getRegistrationStatus();
        setIsRegistrationOpen(regResponse.isOpen);
      } catch (error) {
        console.error('Failed to load registration status:', error);
        if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
          setServerError(true);
        }
      }
      
      setLoading(false);
    };

    loadUser();
  }, []);

  // LOGIN
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      setServerError(false);
      return { success: true, user: response.user };
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if it's a server connection error
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        setServerError(true);
        const errorMsg = 'Cannot connect to server. Please make sure the backend server is running on port 5001.';
        setAuthError(errorMsg);
        return { 
          success: false, 
          error: errorMsg 
        };
      }
      
      const errorMsg = error.error || error.message || 'Login failed';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // LOGOUT
  const logout = () => {
    authService.logout();
    setUser(null);
    setAuthError(null);
  };

  // REGISTER
  const register = async (userData) => {
    setAuthError(null);
    try {
      const response = await authService.register(userData);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Register error:', error);
      
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        setServerError(true);
        const errorMsg = 'Cannot connect to server. Please make sure the backend server is running.';
        setAuthError(errorMsg);
        return { 
          success: false, 
          error: errorMsg 
        };
      }
      
      const errorMsg = error.error || error.message || 'Registration failed';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // ADD USER (Admin)
  const addUser = async (userData) => {
    setAuthError(null);
    try {
      const response = await userService.createUser(userData);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Add user error:', error);
      
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        setServerError(true);
        const errorMsg = 'Server connection lost. Please check if backend is running.';
        setAuthError(errorMsg);
        return { 
          success: false, 
          error: errorMsg 
        };
      }
      
      const errorMsg = error.error || error.message || 'Failed to add user';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // UPDATE USER (Admin only – for other users)
  const updateUser = async (userId, updates) => {
    try {
      const response = await userService.updateUser(userId, updates);
      
      // Update current user if it's the same user
      if (user && user.id === userId) {
        setUser(response.user);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      const errorMsg = error.error || error.message || 'Failed to update user';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // UPDATE OWN PROFILE (for any authenticated user)
  const updateOwnProfile = async (updates) => {
    try {
      const response = await userService.updateOwnProfile(updates);
      if (response.success && response.user) {
        setUser(response.user);
        // Also update localStorage
        localStorage.setItem('fypUser', JSON.stringify(response.user));
        return { success: true, user: response.user };
      }
      return { success: false, error: 'Failed to update profile' };
    } catch (error) {
      console.error('Update own profile error:', error);
      const errorMsg = error.error || error.message || 'Failed to update profile';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // REFRESH CURRENT USER DATA
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('fypToken');
      if (!token) {
        console.log('No token found, cannot refresh user');
        return null;
      }
      
      console.log('Refreshing user data from server...');
      const response = await authService.getCurrentUser();
      
      if (response && response.user) {
        console.log('User data refreshed successfully');
        setUser(response.user);
        setServerError(false);
        setAuthError(null);
        
        // Also update localStorage
        localStorage.setItem('fypUser', JSON.stringify(response.user));
        
        return response.user;
      } else {
        console.log('Refresh response did not contain user data');
        return null;
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      
      // If unauthorized, clear storage
      if (error.status === 401 || error.response?.status === 401) {
        console.log('Unauthorized during refresh, logging out');
        authService.logout();
        setUser(null);
        setAuthError('Session expired. Please login again.');
      }
      
      return null;
    }
  };

  // DELETE USER
  const deleteUser = async (userId) => {
    try {
      await userService.deleteUser(userId);
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      const errorMsg = error.error || error.message || 'Failed to delete user';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // TOGGLE REGISTRATION (Admin)
  const toggleRegistration = async () => {
    try {
      const response = await academicService.toggleRegistration();
      setIsRegistrationOpen(response.isOpen);
      return { success: true };
    } catch (error) {
      console.error('Toggle registration error:', error);
      const errorMsg = error.error || error.message || 'Failed to toggle registration';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // GET USERS BY ROLE
  const getUsersByRole = async (role) => {
    try {
      const response = await userService.getUsersByRole(role);
      return response.users || [];
    } catch (error) {
      console.error('Failed to get users by role:', error);
      return [];
    }
  };

  // GET USERS BY DEPARTMENT
  const getUsersByDepartment = async (department) => {
    try {
      const response = await userService.getUsersByDepartment(department);
      return response.users || [];
    } catch (error) {
      console.error('Failed to get users by department:', error);
      return [];
    }
  };

  // GET PENDING STUDENTS
  const getPendingStudents = async (department) => {
    try {
      const response = await userService.getPendingStudents(department);
      return response.students || [];
    } catch (error) {
      console.error('Failed to get pending students:', error);
      return [];
    }
  };

  // APPROVE STUDENT
  const approveStudent = async (studentId) => {
    try {
      await userService.approveStudent(studentId);
      return { success: true };
    } catch (error) {
      console.error('Approve student error:', error);
      const errorMsg = error.error || error.message || 'Failed to approve student';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // REJECT STUDENT
  const rejectStudent = async (studentId) => {
    try {
      await userService.rejectStudent(studentId);
      return { success: true };
    } catch (error) {
      console.error('Reject student error:', error);
      const errorMsg = error.error || error.message || 'Failed to reject student';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const value = {
    user,
    loading,
    serverError,
    authError,
    login,
    logout,
    register,
    addUser,
    updateUser,
    updateOwnProfile,
    deleteUser,
    refreshUser,
    getUsersByRole,
    getUsersByDepartment,
    getPendingStudents,
    approveStudent,
    rejectStudent,
    isRegistrationOpen,
    toggleRegistration
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;