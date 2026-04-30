import React, { createContext, useContext } from 'react';

const ProtectedRouteContext = createContext(null);

export const useProtectedRoute = () => {
  const context = useContext(ProtectedRouteContext);
  if (!context) {
    throw new Error('useProtectedRoute must be used within a ProtectedRouteProvider');
  }
  return context;
};

export const ProtectedRouteProvider = ({ children, value }) => {
  return (
    <ProtectedRouteContext.Provider value={value}>
      {children}
    </ProtectedRouteContext.Provider>
  );
};