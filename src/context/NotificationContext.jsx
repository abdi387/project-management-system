// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, getUsersByDepartment, getUsersByRole } = useAuth();
  
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('fypNotifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fypNotifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (notification) => {
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    return newNotification;
  };

  const getUserNotifications = (userId) => {
    return notifications.filter(n => n.userId === userId).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = (userId) => {
    setNotifications(prev => prev.map(n => 
      n.userId === userId ? { ...n, read: true } : n
    ));
  };

  const getUnreadCount = (userId) => {
    return notifications.filter(n => n.userId === userId && !n.read).length;
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = (userId) => {
    setNotifications(prev => prev.filter(n => n.userId !== userId));
  };

  const unreadCount = user ? notifications.filter(n => n.userId === user.id && !n.read).length : 0;

  useEffect(() => {
    const baseTitle = 'FYP Management System';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  // Notification types
  const notifyProjectClaim = (groupId, advisorName, memberIds) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'project-claim',
        title: 'Advisor Assigned',
        message: `${advisorName} has claimed your project as advisor.`,
        link: '/student/group'
      });
    });
  };

  const notifyProposalApproval = (groupId, approvedTitle, memberIds) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'proposal-approved',
        title: 'Congratulations! Proposal Approved',
        message: `Your project proposal "${approvedTitle}" has been approved!`,
        link: '/student/proposal'
      });
    });
  };

  const notifyProposalRejection = (groupId, memberIds) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'proposal-rejected',
        title: 'Proposal Rejected',
        message: 'Your project proposal has been rejected. Please submit a new proposal.',
        link: '/student/proposal',
        variant: 'danger'
      });
    });
  };

  const notifyProgressFeedback = (groupId, memberIds) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'progress-feedback',
        title: 'New Feedback',
        message: 'Your advisor has provided feedback on your progress report.',
        link: '/student/progress'
      });
    });
  };

  const notifyFinalDraftApproval = (groupId, memberIds, stage) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'draft-approved',
        title: `Final Draft ${stage === 'advisor' ? 'Advisor' : 'Department'} Approved`,
        message: stage === 'advisor' 
          ? 'Your draft has been approved by your advisor and escalated to your respective department head.'
          : 'Your final draft has been approved by the department head.',
        link: '/student/final-draft'
      });
    });
  };

  const notifyDefenseSchedule = (userId, date, time, venue) => {
    addNotification({
      userId,
      type: 'defense-schedule',
      title: 'Defense Scheduled',
      message: `Your defense is scheduled for ${date} at ${time} in ${venue}.`,
      link: '/student/defense-schedule'
    });
  };

  const notifyEvaluatorAssignment = (evaluatorId, groupName, department) => {
    addNotification({
      userId: evaluatorId,
      type: 'evaluator-assigned',
      title: 'Evaluator Assignment',
      message: `You have been assigned by the Faculty Head to evaluate Group "${groupName}" (${department}).`,
      link: '/advisor/AdvisorEvaluations',
      variant: 'danger'
    });
  };

  const notifyDefenseDuty = (evaluatorId, groupName, groupId, date, time, venue) => {
    addNotification({
      userId: evaluatorId,
      type: 'defense-duty',
      title: 'Defense Evaluation Duty',
      message: `You are assigned to evaluate ${groupName} on ${date} at ${time} in ${venue}.`,
      link: '/advisor/schedule',
      variant: 'danger'
    });
  };

  const notifySemesterChange = (semester) => {
    const rolesToNotify = ['student', 'advisor', 'dept-head', 'admin'];
    const usersToNotify = rolesToNotify.flatMap(role => getUsersByRole(role));
    
    const phase = semester === 1 ? 'Documentation Phase' : 'Implementation Phase';

    usersToNotify.forEach(u => {
      addNotification({
        userId: u.id,
        type: 'semester-change',
        title: `Semester ${semester} Started`,
        message: `The academic year has moved to Semester ${semester} (${phase}). Functionalities have been updated accordingly.`,
        link: `/${u.role}`,
        variant: 'danger'
      });
    });
  };

  const notifySemesterTermination = () => {
    const rolesToNotify = ['student', 'advisor', 'dept-head', 'admin'];
    const usersToNotify = rolesToNotify.flatMap(role => getUsersByRole(role));

    usersToNotify.forEach(u => {
      addNotification({
        userId: u.id,
        type: 'semester-terminated',
        title: 'Semester Terminated',
        message: 'The academic semester has been terminated by the Faculty Head. The system is now in read-only mode. You can only manage your profile.',
        link: null,
        variant: 'danger'
      });
    });
  };

  const notifyYearStarted = (year) => {
    const rolesToNotify = ['student', 'advisor', 'dept-head', 'admin'];
    const usersToNotify = rolesToNotify.flatMap(role => getUsersByRole(role));

    usersToNotify.forEach(u => {
      addNotification({
        userId: u.id,
        type: 'year-started',
        title: 'New Academic Year Started',
        message: `The academic year ${year} has begun. You are now in Semester 1.`,
        link: `/${u.role}`,
        variant: 'danger'
      });
    });
  };

  const notifyGroupEvaluatorsAssigned = (groupId, memberIds, evaluatorNames) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'evaluators-assigned-group',
        title: 'Evaluators Assigned',
        message: `Evaluators have been assigned to your group: ${evaluatorNames.join(', ')}.`,
        link: '/student/evaluators',
        variant: 'info'
      });
    });
  };

  const notifyGroupFormation = (groupName, memberIds, department) => {
    memberIds.forEach(memberId => {
      addNotification({
        userId: memberId,
        type: 'group-formed',
        title: 'Group Assignment',
        message: `You have been assigned to ${groupName} in the ${department} department.`,
        link: '/student/group',
        variant: 'danger'
      });
    });
  };

  const notifyRegistrationApproval = (studentId, approved) => {
    addNotification({
      userId: studentId,
      type: approved ? 'registration-approved' : 'registration-rejected',
      title: approved ? 'Registration Approved' : 'Registration Rejected',
      message: approved 
        ? 'Your registration has been approved. You can now log in to the system.'
        : 'Your registration has been rejected. Please contact your department.',
      link: null,
      variant: approved ? 'success' : 'danger'
    });
  };

  const notifyProgressSubmission = (advisorId, groupName, reportTitle) => {
    if (!advisorId) return;
    addNotification({
      userId: advisorId,
      type: 'progress-submission',
      title: 'Progress Report Submitted',
      message: `${groupName} has submitted a progress report: "${reportTitle}".`,
      link: '/advisor/progress-review'
    });
  };

  const notifyFinalDraftSubmission = (advisorId, groupName, draftTitle) => {
    if (!advisorId) return;
    addNotification({
      userId: advisorId,
      type: 'draft-submission',
      title: 'Final Draft Submitted',
      message: `${groupName} has submitted their final draft: "${draftTitle}".`,
      link: '/advisor/final-approval'
    });
  };

  const notifyDeptHeadFinalDraft = (department, groupName, projectTitle) => {
    const deptHeads = getUsersByDepartment(department).filter(u => u.role === 'dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'draft-escalation',
        title: 'Approved Final Draft',
        message: `Group "${groupName}" has a final draft approved by their respective advisor: "${projectTitle}".`,
        link: '/dept-head/final-drafts',
        variant: 'danger'
      });
    });
  };

  const notifyDeptHeadDefenseScheduled = (department, groupName, date, time, venue) => {
    const deptHeads = getUsersByDepartment(department).filter(u => u.role === 'dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'defense-scheduled',
        title: 'Defense Scheduled',
        message: `Defense for ${groupName} has been scheduled on ${date} at ${time} in ${venue}.`,
        link: '/dept-head/defense-schedule',
        variant: 'danger'
      });
    });
  };

  const notifyDeptHeadEvaluatorsAssigned = (department, groupName) => {
    const deptHeads = getUsersByDepartment(department).filter(u => u.role === 'dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'evaluators-assigned',
        title: 'Evaluators Assigned',
        message: `Evaluators have been assigned for group ${groupName}.`,
        link: '/dept-head/groups',
        variant: 'danger'
      });
    });
  };

  const notifyDeptHeadYearClosed = (year) => {
    const deptHeads = getUsersByRole('dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'year-closed',
        title: 'Academic Year Closed',
        message: `The academic year ${year} has been closed. A new year has been initiated.`,
        link: '/dept-head'
      });
    });
  };

  // Placeholder for Registration (to be used when Register page is available)
  const notifyDeptHeadNewRegistration = (department, studentName) => {
    const deptHeads = getUsersByDepartment(department).filter(u => u.role === 'dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'new-registration',
        title: 'New Student Registration',
        message: `${studentName} has registered and is awaiting approval.`,
        link: '/dept-head/registrations',
        variant: 'danger'
      });
    });
  };

  const notifyDeptHeadProposalSubmission = (department, groupName) => {
    const deptHeads = getUsersByDepartment(department).filter(u => u.role === 'dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'proposal-submission',
        title: 'New Proposal Submitted',
        message: `Group "${groupName}" has submitted a project proposal for review.`,
        link: '/dept-head/proposals',
        variant: 'danger'
      });
    });
  };

  const notifyDeptHeadProjectClaim = (department, groupName, advisorName) => {
    const deptHeads = getUsersByDepartment(department).filter(u => u.role === 'dept-head');
    deptHeads.forEach(head => {
      addNotification({
        userId: head.id,
        type: 'project-claim',
        title: 'Project Claimed',
        message: `Advisor ${advisorName} has claimed Group "${groupName}".`,
        link: '/dept-head/claimed-projects',
        variant: 'danger'
      });
    });
  };

  const notifyAdminSupport = (data) => {
    const admins = getUsersByRole('admin');
    admins.forEach(admin => {
      addNotification({
        userId: admin.id,
        type: 'system-support',
        title: 'New Support Inquiry',
        message: `From ${data.name} (${data.email}): ${data.message}`,
        link: '/admin/inquiries',
        variant: 'danger'
      });
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification,
    clearAllNotifications,
    notifyProjectClaim,
    notifyProposalApproval,
    notifyProposalRejection,
    notifyProgressFeedback,
    notifyFinalDraftApproval,
    notifyDefenseSchedule,
    notifyDefenseDuty,
    notifySemesterTermination,
    notifySemesterChange,
    notifyYearStarted,
    notifyEvaluatorAssignment,
    notifyGroupEvaluatorsAssigned,
    notifyGroupFormation,
    notifyRegistrationApproval,
    notifyProgressSubmission,
    notifyFinalDraftSubmission,
    notifyDeptHeadFinalDraft,
    notifyDeptHeadDefenseScheduled,
    notifyDeptHeadYearClosed,
    notifyDeptHeadNewRegistration,
    notifyAdminSupport,
    notifyDeptHeadProposalSubmission,
    notifyDeptHeadProjectClaim
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;