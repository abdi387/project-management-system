// src/context/AppProviders.jsx

import React from 'react';
import { AuthProvider } from './AuthContext';
import { ProjectProvider } from './ProjectContext';
import { NotificationProvider } from './NotificationContext';

const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ProjectProvider>
          {children}
        </ProjectProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export { AppProviders };
export default AppProviders;