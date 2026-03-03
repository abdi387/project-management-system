// src/pages/admin/ProtectedRoute.jsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  // const { academicYear } = useProject(); // Can be used inside dashboards instead of blocking routes
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user's role is allowed for this specific route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    // MAIN LAYOUT CONTAINER
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* 1. Sidebar (Fixed width on Desktop) */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* 2. Main Content Wrapper (Takes remaining width) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Topbar (Sticky at top of this column) */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProtectedRoute;