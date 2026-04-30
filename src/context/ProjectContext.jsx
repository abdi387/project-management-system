import React, { createContext, useContext } from 'react';
import { finalDraftService } from '../services';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  // Action to approve a final draft by the department head
  const approveFinalDraftByDept = async (draftId) => {
    return await finalDraftService.approveByDept(draftId);
  };

  const value = {
    approveFinalDraftByDept,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};