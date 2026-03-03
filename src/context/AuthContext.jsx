// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(() => {
    const savedStatus = localStorage.getItem('fypRegistrationStatus');
    return savedStatus ? JSON.parse(savedStatus) : true; // Default to open
  });

  // Initialize mock users data
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('fypUsers');
    if (savedUsers) {
      return JSON.parse(savedUsers);
    }
    
    // Default users (Admins, Heads, etc.)
    const defaultUsers = [
      {
        id: 'admin-001',
        email: 'admin@hu.edu.et',
        password: 'admin123',
        role: 'admin',
        name: 'System Administrator',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'fh-001',
        email: 'facultyhead@hu.edu.et',
        password: 'faculty123',
        role: 'faculty-head',
        name: 'Dr. Abebe Kebede',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'dh-cs-001',
        email: 'cs.head@hu.edu.et',
        password: 'cshead123',
        role: 'dept-head',
        name: 'Dr. Mulugeta Tadesse',
        department: 'Computer Science',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'dh-it-001',
        email: 'it.head@hu.edu.et',
        password: 'ithead123',
        role: 'dept-head',
        name: 'Dr. Sara Bekele',
        department: 'Information Technology',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'dh-is-001',
        email: 'is.head@hu.edu.et',
        password: 'ishead123',
        role: 'dept-head',
        name: 'Dr. Daniel Haile',
        department: 'Information Systems',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'adv-001',
        email: 'advisor1@hu.edu.et',
        password: 'advisor123',
        role: 'advisor',
        name: 'Mr. Yohannes Girma',
        department: 'Computer Science',
        status: 'active',
        maxGroups: 2,
        currentGroups: 0,
        createdAt: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('fypUsers', JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('fypCurrentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('fypUsers', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('fypRegistrationStatus', JSON.stringify(isRegistrationOpen));
  }, [isRegistrationOpen]);

  // LOGIN Logic with Timestamp
  const login = (email, password) => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (!foundUser) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (foundUser.status === 'active') {
      const userWithSession = {
        ...foundUser,
        lastLogin: new Date().toISOString() // Track login time
      };

      // Remove password from session storage for security
      const { password: _, ...userWithoutPassword } = userWithSession;

      setUser(userWithoutPassword);
      localStorage.setItem('fypCurrentUser', JSON.stringify(userWithoutPassword));
      return { success: true, user: userWithoutPassword };
    }

    if (foundUser.status === 'pending') {
      return { success: false, error: 'Your registration is still pending approval from your Department Head.' };
    }

    // For any other status like 'inactive' or 'rejected'
    return { success: false, error: 'you are not eligible to use this system any more' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fypCurrentUser');
  };

  // REGISTER Logic (For Students)
  const register = (userData) => {
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      return { success: false, error: 'Email already registered.' };
    }

    const newUser = {
      ...userData,
      id: `std-${Date.now()}`,
      role: 'student',
      status: 'pending', // Critical: Sets status to pending for Dept Head review
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);
    return { success: true, message: 'Registration submitted! Please wait for Department Head approval.' };
  };

  const addUser = (userData) => {
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      return { success: false, error: 'Email already exists.' };
    }

    const newUser = {
      ...userData,
      id: `${userData.role}-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);
    return { success: true, message: 'User added successfully.' };
  };

  const updateUser = (userId, updates) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, ...updates } : u
    ));
    
    if (user && user.id === userId) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('fypCurrentUser', JSON.stringify(updatedUser));
    }
    return { success: true };
  };

  const toggleRegistration = () => {
    setIsRegistrationOpen(prev => !prev);
  };

  const deleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    return { success: true };
  };

  const getUsersByRole = (role) => {
    return users.filter(u => u.role === role);
  };

  // Critical for Dept Head Workflow
  const getUsersByDepartment = (department) => {
    return users.filter(u => u.department === department);
  };

  // Logic to fetch pending students for a specific department
  const getPendingStudents = (department) => {
    return users.filter(
      u => u.role === 'student' && u.status === 'pending' && u.department === department
    );
  };

  const approveStudent = (studentId) => {
    return updateUser(studentId, { status: 'active' });
  };

  const rejectStudent = (studentId) => {
    return updateUser(studentId, { status: 'rejected' });
  };

  const value = {
    user,
    users,
    loading,
    login,
    logout,
    register,
    addUser,
    updateUser,
    deleteUser,
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;