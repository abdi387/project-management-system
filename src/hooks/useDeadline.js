// src/hooks/useDeadline.js
import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { useNotification } from '../context/NotificationContext';
import { isOverdue, getDaysRemaining } from '../utils/dateUtils';

export const useDeadline = () => {
  const { progressReports, groups } = useProject();
  const { notifyOverdueSubmission } = useNotification();
  
  const [overdueItems, setOverdueItems] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  const checkDeadlines = useCallback(() => {
    const overdue = [];
    const upcoming = [];
    
    progressReports.forEach(report => {
      if (report.status === 'pending') {
        const daysRemaining = getDaysRemaining(report.deadline);
        const group = groups.find(g => g.id === report.groupId);
        
        if (isOverdue(report.deadline)) {
          overdue.push({
            ...report,
            groupName: group?.name,
            daysOverdue: Math.abs(daysRemaining)
          });
        } else if (daysRemaining <= 3 && daysRemaining >= 0) {
          upcoming.push({
            ...report,
            groupName: group?.name,
            daysRemaining
          });
        }
      }
    });
    
    setOverdueItems(overdue);
    setUpcomingDeadlines(upcoming);
    
    return { overdue, upcoming };
  }, [progressReports, groups]);

  useEffect(() => {
    checkDeadlines();
    
    // Check deadlines every hour
    const interval = setInterval(checkDeadlines, 3600000);
    return () => clearInterval(interval);
  }, [checkDeadlines]);

  const getOverdueByDepartment = useCallback((department) => {
    const deptGroups = groups.filter(g => g.department === department);
    const groupIds = deptGroups.map(g => g.id);
    
    return overdueItems.filter(item => groupIds.includes(item.groupId));
  }, [groups, overdueItems]);

  const getOverdueByAdvisor = useCallback((advisorId) => {
    const advisorGroups = groups.filter(g => g.advisorId === advisorId);
    const groupIds = advisorGroups.map(g => g.id);
    
    return overdueItems.filter(item => groupIds.includes(item.groupId));
  }, [groups, overdueItems]);

  const triggerOverdueNotifications = useCallback(() => {
    overdueItems.forEach(item => {
      const group = groups.find(g => g.id === item.groupId);
      if (group) {
        notifyOverdueSubmission(group.id, group.members, group.advisorId);
      }
    });
  }, [overdueItems, groups, notifyOverdueSubmission]);

  return {
    overdueItems,
    upcomingDeadlines,
    checkDeadlines,
    getOverdueByDepartment,
    getOverdueByAdvisor,
    triggerOverdueNotifications
  };
};

export default useDeadline;