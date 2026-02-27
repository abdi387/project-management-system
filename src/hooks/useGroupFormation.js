// src/hooks/useGroupFormation.js
import { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export const useGroupFormation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { createGroups } = useProject();
  const { getUsersByDepartment } = useAuth();

  const formGroups = useCallback((department, maxPerGroup) => {
    setLoading(true);
    setError(null);

    try {
      // Get all active students in the department
      const students = getUsersByDepartment(department).filter(
        u => u.role === 'student' && u.status === 'active'
      );

      if (students.length === 0) {
        throw new Error('No active students found in this department');
      }

      if (students.length < maxPerGroup) {
        throw new Error(`Not enough students. Need at least ${maxPerGroup} students per group.`);
      }

      // Create groups using the context function
      const newGroups = createGroups(department, students, maxPerGroup);
      
      setLoading(false);
      return { success: true, groups: newGroups };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, [createGroups, getUsersByDepartment]);

  const calculateGroupDistribution = useCallback((studentCount, maxPerGroup) => {
    const numberOfGroups = Math.ceil(studentCount / maxPerGroup);
    const baseSize = Math.floor(studentCount / numberOfGroups);
    const remainder = studentCount % numberOfGroups;
    
    const distribution = [];
    for (let i = 0; i < numberOfGroups; i++) {
      distribution.push({
        groupNumber: i + 1,
        size: baseSize + (i < remainder ? 1 : 0)
      });
    }
    
    return {
      numberOfGroups,
      distribution,
      averageSize: (studentCount / numberOfGroups).toFixed(1)
    };
  }, []);

  return {
    formGroups,
    calculateGroupDistribution,
    loading,
    error
  };
};

export default useGroupFormation;