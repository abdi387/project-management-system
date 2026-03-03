// src/hooks/useEvaluatorAssign.js

import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export const useEvaluatorAssign = () => {
  const { groups } = useProject();
  const { users } = useAuth();

  const getEvaluatorsForGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.evaluators) return [];
    
    return group.evaluators.map(evaluatorId => 
      users.find(u => u.id === evaluatorId)
    ).filter(Boolean);
  };

  const getGroupsForEvaluator = (evaluatorId) => {
    return groups
      .filter(g => g.evaluators && g.evaluators.includes(evaluatorId))
      .map(g => ({
        groupId: g.id,
        groupName: g.name,
        projectTitle: g.approvedTitle || 'Untitled Project',
        advisorId: g.advisorId,
        assignedAt: g.createdAt,
        evaluators: getEvaluatorsForGroup(g.id)
      }));
  };

  return {
    getEvaluatorsForGroup,
    getGroupsForEvaluator
  };
};