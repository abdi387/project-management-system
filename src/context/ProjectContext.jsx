// src/context/ProjectContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const ProjectContext = createContext(null);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { user, users } = useAuth();
  const notificationContext = useNotification();
  
  const { 
    notifyDeptHeadProposalSubmission, 
    notifyDeptHeadProjectClaim, 
    notifyDeptHeadFinalDraft, 
    notifyEvaluatorAssignment, 
    notifyGroupEvaluatorsAssigned, 
    notifySemesterChange, 
    notifyYearStarted, 
    notifySemesterTermination, 
    notifyGroupFormation 
  } = notificationContext || {};

  // Groups State
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('fypGroups');
    return saved ? JSON.parse(saved) : [];
  });

  // Proposals State
  const [proposals, setProposals] = useState(() => {
    const saved = localStorage.getItem('fypProposals');
    return saved ? JSON.parse(saved) : [];
  });

  // Progress Reports State
  const [progressReports, setProgressReports] = useState(() => {
    const saved = localStorage.getItem('fypProgressReports');
    return saved ? JSON.parse(saved) : [];
  });

  // Final Drafts State
  const [finalDrafts, setFinalDrafts] = useState(() => {
    const saved = localStorage.getItem('fypFinalDrafts');
    return saved ? JSON.parse(saved) : [];
  });

  // Defense Schedules State
  const [defenseSchedules, setDefenseSchedules] = useState(() => {
    const saved = localStorage.getItem('fypDefenseSchedules');
    return saved ? JSON.parse(saved) : [];
  });

  // Advisor Repository State
  const [advisorRepository, setAdvisorRepository] = useState(() => {
    const saved = localStorage.getItem('fypAdvisorRepository');
    return saved ? JSON.parse(saved) : {};
  });

  // Venues State
  const [venues, setVenues] = useState(() => {
    const saved = localStorage.getItem('fypVenues');
    return saved ? JSON.parse(saved) : [
      { id: 'venue-1', name: 'Hall A' },
      { id: 'venue-2', name: 'Room 201' },
      { id: 'venue-3', name: 'Lab B' },
    ];
  });

  // Academic Year State
  const [academicYear, setAcademicYear] = useState(() => {
    const saved = localStorage.getItem('fypAcademicYear');
    return saved ? JSON.parse(saved) : {
      current: null,
      semester: null,
      status: 'pending_setup', // System needs to be set up by faculty head first
      startDate: null,
      history: []
    };
  });

  // Project Settings State
  const [projectSettings, setProjectSettings] = useState(() => {
    const saved = localStorage.getItem('fypProjectSettings');
    return saved ? JSON.parse(saved) : {
      maxGroupsPerAdvisor: 5
    };
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('fypGroups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('fypVenues', JSON.stringify(venues));
  }, [venues]);

  useEffect(() => {
    localStorage.setItem('fypProposals', JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    localStorage.setItem('fypProgressReports', JSON.stringify(progressReports));
  }, [progressReports]);

  useEffect(() => {
    localStorage.setItem('fypFinalDrafts', JSON.stringify(finalDrafts));
  }, [finalDrafts]);

  useEffect(() => {
    localStorage.setItem('fypDefenseSchedules', JSON.stringify(defenseSchedules));
  }, [defenseSchedules]);

  useEffect(() => {
    localStorage.setItem('fypAdvisorRepository', JSON.stringify(advisorRepository));
  }, [advisorRepository]);

  useEffect(() => {
    localStorage.setItem('fypAcademicYear', JSON.stringify(academicYear));
  }, [academicYear]);

  useEffect(() => {
    localStorage.setItem('fypProjectSettings', JSON.stringify(projectSettings));
  }, [projectSettings]);

  // Read-only logic for terminated semester
  const isReadOnly =
    academicYear.status === 'terminated' &&
    user &&
    ['student', 'advisor', 'dept-head'].includes(user.role);

  // Group Functions
  const createGroups = (department, students, maxPerGroup) => {
    // Sort students by CGPA descending
    const sortedStudents = [...students].sort((a, b) => b.cgpa - a.cgpa);
    
    const numberOfGroups = Math.ceil(sortedStudents.length / maxPerGroup);
    const newGroups = [];
    
    // Select group leaders (top CGPA students)
    const leaders = sortedStudents.slice(0, numberOfGroups);
    const remainingStudents = sortedStudents.slice(numberOfGroups);
    
    // Shuffle remaining students for random distribution
    const shuffledRemaining = remainingStudents.sort(() => Math.random() - 0.5);
    
    // Create groups with leaders
    leaders.forEach((leader, index) => {
      newGroups.push({
        id: `grp-${department}-${Date.now()}-${index}`,
        name: `Group ${index + 1}`,
        department,
        leader: leader.id,
        members: [leader.id],
        advisorId: null,
        proposalStatus: 'pending',
        approvedTitle: null,
        progressStatus: 'not-started',
        finalDraftStatus: 'not-submitted',
        createdAt: new Date().toISOString(),
        academicYear: academicYear.current
      });
    });
    
    // Distribute remaining students
    let groupIndex = 0;
    shuffledRemaining.forEach(student => {
      if (newGroups[groupIndex].members.length < maxPerGroup) {
        newGroups[groupIndex].members.push(student.id);
      }
      groupIndex = (groupIndex + 1) % numberOfGroups;
    });
    
    setGroups(prev => [...prev, ...newGroups]);

    newGroups.forEach(group => {
      notifyGroupFormation(group.name, group.members, group.department);
    });
    
    return newGroups;
  };

  const getGroupsByDepartment = (department) => {
    return groups.filter(g => g.department === department && g.academicYear === academicYear.current);
  };

  const getGroupByStudentId = (studentId) => {
    return groups.find(g => g.members.includes(studentId) && g.academicYear === academicYear.current);
  };

  const getGroupsByAdvisor = (advisorId) => {
    return groups.filter(g => g.advisorId === advisorId && g.academicYear === academicYear.current);
  };

  const assignAdvisorToGroup = (groupId, advisorId) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, advisorId } : g
    ));

    const group = groups.find(g => g.id === groupId);
    const advisor = users.find(u => u.id === advisorId);
    if (group && advisor) {
      notifyDeptHeadProjectClaim(group.department, group.name, advisor.name);
    }
  };

  const assignEvaluatorsToGroup = (groupId, evaluators) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, evaluators, evaluatorsAssignedAt: new Date().toISOString() } : g
    ));

    const group = groups.find(g => g.id === groupId);
    if (group && evaluators) {
      evaluators.forEach(evaluator => {
        notifyEvaluatorAssignment(evaluator.id, group.name, group.department);
      });

      // Notify students in the group
      const evaluatorNames = evaluators.map(e => e.name);
      notifyGroupEvaluatorsAssigned(group.id, group.members, evaluatorNames);
    }
  };

  const getGroupsForEvaluator = (evaluatorId) => {
    return groups.filter(g => g.evaluators && g.evaluators.some(e => e.id === evaluatorId));
  };

  const getAvailableProjects = () => {
    return proposals.filter(p => {
      const group = groups.find(g => g.id === p.groupId);
      return p.status === 'approved' && group && !group.advisorId;
    });
  };

  // Proposal Functions
  const submitProposal = (groupId, proposalData) => {
    // Check if a proposal already exists for this group in the current academic year
    const existingProposal = proposals.find(p => 
      p.groupId === groupId && 
      p.academicYear === academicYear.current
    );

    if (existingProposal) {
      // Update the existing proposal (handles resubmission after rejection)
      setProposals(prev => prev.map(p => 
        p.id === existingProposal.id 
        ? { 
            ...p, 
            titles: proposalData.titles,
            status: 'pending',
            feedback: null, // Clear old feedback
            approvedTitle: null, // Clear previous approval if any (edge case)
            submittedAt: new Date().toISOString() // Update submission time
          } 
        : p
      ));
    } else {
      // Create a new proposal if none exists
      const newProposal = {
        id: `prop-${Date.now()}`,
        groupId,
        titles: proposalData.titles,
        status: 'pending',
        approvedTitle: null,
        feedback: null,
        submittedAt: new Date().toISOString(),
        academicYear: academicYear.current
      };
      setProposals(prev => [...prev, newProposal]);
    }

    const group = groups.find(g => g.id === groupId);
    if (group) {
      // Update group status to reflect new submission
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, proposalStatus: 'pending' } : g
      ));

      if (notifyDeptHeadProposalSubmission) {
        notifyDeptHeadProposalSubmission(group.department, group.name);
      }
    }
  };

  const getProposalsByDepartment = (department) => {
    const deptGroups = getGroupsByDepartment(department);
    const groupIds = deptGroups.map(g => g.id);
    return proposals.filter(p => groupIds.includes(p.groupId) && p.academicYear === academicYear.current);
  };

  const getProposalByGroupId = (groupId) => {
    return proposals.find(p => p.groupId === groupId && p.academicYear === academicYear.current);
  };

  const approveProposal = (proposalId, selectedTitleIndex) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      const approvedTitle = proposal.titles[selectedTitleIndex];
      
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { 
          ...p, 
          status: 'approved', 
          approvedTitle,
          approvedAt: new Date().toISOString()
        } : p
      ));
      
      setGroups(prev => prev.map(g => 
        g.id === proposal.groupId ? { 
          ...g, 
          proposalStatus: 'approved',
          approvedTitle: approvedTitle.title
        } : g
      ));
    }
  };

  const rejectProposal = (proposalId, feedback) => {
    setProposals(prev => prev.map(p => 
      p.id === proposalId ? { 
        ...p, 
        status: 'rejected', 
        feedback,
        rejectedAt: new Date().toISOString()
      } : p
    ));
    
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      setGroups(prev => prev.map(g => 
        g.id === proposal.groupId ? { ...g, proposalStatus: 'rejected' } : g
      ));
    }
  };

  // Progress Report Functions
  const submitProgressReport = (groupId, reportData) => {
    const newReport = {
      id: `prog-${Date.now()}`,
      groupId,
      title: reportData.title,
      description: reportData.description,
      fileUrl: reportData.fileUrl,
      status: 'pending',
      feedback: null,
      submittedAt: new Date().toISOString(),
      deadline: reportData.deadline,
      isOverdue: new Date() > new Date(reportData.deadline),
      academicYear: academicYear.current,
      semester: academicYear.semester
    };
    
    setProgressReports(prev => [...prev, newReport]);
    
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, progressStatus: 'in-progress' } : g
    ));
    
    return newReport;
  };

  const getProgressReportsByGroup = (groupId) => {
    return progressReports.filter(r => 
      r.groupId === groupId && 
      r.academicYear === academicYear.current &&
      (r.semester === academicYear.semester || (!r.semester && academicYear.semester === 1))
    );
  };

  const getProgressReportsByAdvisor = (advisorId) => {
    const advisorGroups = getGroupsByAdvisor(advisorId);
    const groupIds = advisorGroups.map(g => g.id);
    return progressReports.filter(r => 
      groupIds.includes(r.groupId) && 
      r.academicYear === academicYear.current &&
      (r.semester === academicYear.semester || (!r.semester && academicYear.semester === 1))
    );
  };

  const addFeedbackToReport = (reportId, feedback) => {
    setProgressReports(prev => prev.map(r => 
      r.id === reportId ? { 
        ...r, 
        feedback, 
        status: 'reviewed',
        reviewedAt: new Date().toISOString()
      } : r
    ));
  };

  // Final Draft Functions
  const submitFinalDraft = (groupId, draftData) => {
    const newDraft = {
      id: `draft-${Date.now()}`,
      groupId,
      title: draftData.title,
      fileUrl: draftData.fileUrl,
      advisorStatus: 'pending',
      deptStatus: 'pending',
      advisorApprovedAt: null,
      deptApprovedAt: null,
      submittedAt: new Date().toISOString(),
      academicYear: academicYear.current,
      semester: academicYear.semester
    };
    
    setFinalDrafts(prev => [...prev, newDraft]);
    
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, finalDraftStatus: 'submitted' } : g
    ));
    
    return newDraft;
  };

  const getFinalDraftByGroup = (groupId) => {
    return finalDrafts.find(d => 
      d.groupId === groupId && 
      d.academicYear === academicYear.current &&
      (d.semester === academicYear.semester || (!d.semester && academicYear.semester === 1))
    );
  };

  const approveFinalDraftByAdvisor = (draftId) => {
    setFinalDrafts(prev => prev.map(d => 
      d.id === draftId ? { 
        ...d, 
        advisorStatus: 'approved', // Advisor approval
        advisorApprovedAt: new Date().toISOString(),
        deptStatus: 'approved', // Auto-approve for department
        deptApprovedAt: new Date().toISOString()
      } : d
    ));
    
    const draft = finalDrafts.find(d => d.id === draftId);
    if (draft) {
      setGroups(prev => prev.map(g => 
        // Set to fully-approved directly
        g.id === draft.groupId ? { ...g, finalDraftStatus: 'fully-approved' } : g
      ));

      const group = groups.find(g => g.id === draft.groupId);
      if (group) {
        // Notify dept head that a draft has been approved in their department
        notifyDeptHeadFinalDraft(group.department, group.name, draft.title);
      }
    }
  };

  const approveFinalDraftByDept = (draftId) => {
    setFinalDrafts(prev => prev.map(d => 
      d.id === draftId ? { 
        ...d, 
        deptStatus: 'approved',
        deptApprovedAt: new Date().toISOString()
      } : d
    ));
    
    const draft = finalDrafts.find(d => d.id === draftId);
    if (draft) {
      setGroups(prev => prev.map(g => 
        g.id === draft.groupId ? { ...g, finalDraftStatus: 'fully-approved' } : g
      ));
    }
  };

  // Defense Schedule Functions
  const addDefenseSchedule = (scheduleData) => {
    const newSchedule = {
      id: `def-${Date.now()}`,
      ...scheduleData,
      createdAt: new Date().toISOString(),
      academicYear: academicYear.current
    };
    
    setDefenseSchedules(prev => [...prev, newSchedule]);
    return newSchedule;
  };

  const getDefenseSchedules = () => {
    return defenseSchedules.filter(s => s.academicYear === academicYear.current);
  };

  // Academic Year Functions
  const startNewAcademicYear = (newYearString) => {
    const closedYear = {
      ...academicYear,
      status: 'archived',
      closedAt: new Date().toISOString()
    };
    
    setAcademicYear({
      current: newYearString,
      status: 'active',
      semester: 1,
      startDate: new Date().toISOString(),
      history: [...academicYear.history, closedYear]
    });
    notifyYearStarted(newYearString);
  };

  const updateMaxGroupsPerAdvisor = (count) => {
    setProjectSettings(prev => ({ ...prev, maxGroupsPerAdvisor: parseInt(count) }));
  };

  const setSemester = (semester) => {
    const newSemester = parseInt(semester);
    setAcademicYear(prev => ({ ...prev, semester: newSemester }));
    
    // Reset group statuses for Semester 2 to allow new submissions
    if (newSemester === 2) {
      setGroups(prev => prev.map(g => ({
        ...g,
        progressStatus: 'not-started',
        finalDraftStatus: 'not-submitted'
      })));
    }

    notifySemesterChange(newSemester);
  };

  const terminateSemester = () => {
    const currentYear = academicYear.current;
    const currentSemester = academicYear.semester;
    const currentSemesterKey = `semester${currentSemester}`;
    const advisors = users.filter(u => u.role === 'advisor');

    setAdvisorRepository(prevRepo => {
      const newRepo = JSON.parse(JSON.stringify(prevRepo)); // Deep copy

      advisors.forEach(advisor => {
        // 1. Get mentored groups and their semester-specific reports/drafts
        const mentoredGroups = groups
          .filter(g => g.advisorId === advisor.id && g.academicYear === currentYear)
          .map(group => ({
            ...group,
            semesterReports: progressReports.filter(r => r.groupId === group.id && (r.semester || 1) === currentSemester),
            semesterFinalDraft: finalDrafts.find(d => d.groupId === group.id && (d.semester || 1) === currentSemester)
          }));

        // 2. Get evaluation duties for the semester
        const evaluationDuties = groups
          .filter(g => g.academicYear === currentYear && g.evaluators?.some(e => e.id === advisor.id))
          .map(group => {
            const schedule = defenseSchedules.find(s => 
              s.groupId === group.id && 
              s.academicYear === currentYear && 
              (s.semester || 1) === currentSemester
            );
            if (!schedule) return null;
            return {
              groupId: group.id,
              groupName: group.name,
              projectTitle: group.approvedTitle,
              department: group.department,
              date: schedule.date,
              time: schedule.time,
              venue: schedule.venue,
            };
          }).filter(Boolean);

        if (mentoredGroups.some(g => g.semesterReports.length > 0 || g.semesterFinalDraft) || evaluationDuties.length > 0) {
          if (!newRepo[advisor.id]) newRepo[advisor.id] = {};
          if (!newRepo[advisor.id][currentYear]) newRepo[advisor.id][currentYear] = {};
          
          newRepo[advisor.id][currentYear][currentSemesterKey] = { mentoredGroups, evaluationDuties, archivedAt: new Date().toISOString() };
        }
      });
      return newRepo;
    });

    setAcademicYear(prev => ({ ...prev, status: 'terminated' }));
    if (notifySemesterTermination) {
      notifySemesterTermination();
    }
  };

  // Venue Functions
  const addVenue = (venueName) => {
    if (!venueName.trim()) {
      return { success: false, error: 'Venue name cannot be empty.' };
    }
    const newVenue = {
      id: `venue-${Date.now()}`,
      name: venueName.trim(),
    };
    setVenues(prev => [...prev, newVenue]);
    return { success: true, message: 'Venue added successfully.' };
  };

  const removeVenue = (venueId) => {
    setVenues(prev => prev.filter(v => v.id !== venueId));
    return { success: true };
  };

  const getNextAcademicYear = (current) => {
    const [start, end] = current.split('/');
    return `${parseInt(start) + 1}/${parseInt(end) + 1}`;
  };

  // Statistics Functions
  const getStatsByDepartment = (department) => {
    const deptGroups = getGroupsByDepartment(department);
    
    // Filter groups to ensure they have at least one valid member (user exists)
    const activeGroups = deptGroups.filter(g => 
      g.members.some(memberId => users.some(u => u.id === memberId))
    );
    const activeGroupIds = activeGroups.map(g => g.id);

    const deptProposals = getProposalsByDepartment(department).filter(p => activeGroupIds.includes(p.groupId));
    
    return {
      totalGroups: activeGroups.length,
      inactiveGroups: deptGroups.length - activeGroups.length,
      pendingProposals: deptProposals.filter(p => p.status === 'pending').length,
      approvedProposals: deptProposals.filter(p => p.status === 'approved').length,
      groupsWithAdvisor: activeGroups.filter(g => g.advisorId).length,
      completedProjects: activeGroups.filter(g => g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved').length
    };
  };

  const getFacultyStats = () => {
    const currentYearGroups = groups.filter(g => g.academicYear === academicYear.current);

    // Filter groups to ensure they have at least one valid member
    const activeGroups = currentYearGroups.filter(g => 
      g.members.some(memberId => users.some(u => u.id === memberId))
    );
    const activeGroupIds = activeGroups.map(g => g.id);
    
    const activeProposals = proposals.filter(p => 
      p.academicYear === academicYear.current && 
      activeGroupIds.includes(p.groupId)
    );

    return {
      totalGroups: activeGroups.length,
      inactiveGroups: currentYearGroups.length - activeGroups.length,
      totalProposals: activeProposals.length,
      approvedProposals: activeProposals.filter(p => p.status === 'approved').length,
      completedProjects: activeGroups.filter(g => (g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved')).length,
      scheduledDefenses: defenseSchedules.filter(s => s.academicYear === academicYear.current && activeGroupIds.includes(s.groupId)).length
    };
  };

  const value = {
    groups,
    proposals,
    progressReports,
    finalDrafts,
    defenseSchedules,
    academicYear,
    advisorRepository,
    projectSettings,
    updateMaxGroupsPerAdvisor,
    isReadOnly,
    setSemester,
    terminateSemester,
    createGroups,
    getGroupsByDepartment,
    getGroupByStudentId,
    getGroupsByAdvisor,
    assignAdvisorToGroup,
    assignEvaluatorsToGroup,
    getGroupsForEvaluator,
    getAvailableProjects,
    submitProposal,
    getProposalsByDepartment,
    getProposalByGroupId,
    approveProposal,
    rejectProposal,
    submitProgressReport,
    getProgressReportsByGroup,
    getProgressReportsByAdvisor,
    addFeedbackToReport,
    submitFinalDraft,
    getFinalDraftByGroup,
    approveFinalDraftByAdvisor,
    approveFinalDraftByDept,
    addDefenseSchedule,
    getDefenseSchedules,
    startNewAcademicYear,
    getNextAcademicYear,
    getStatsByDepartment,
    getFacultyStats,
    venues,
    addVenue,
    removeVenue
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export default ProjectContext;