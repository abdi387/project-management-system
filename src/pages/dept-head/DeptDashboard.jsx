import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FileText,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Shield,
  BookOpen,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService, groupService, proposalService, defenseService, notificationService, finalDraftService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import { buildSectionNameMap, formatGroupDisplayName } from '../../utils/sectionDisplay';

const DeptDashboard = () => {
  const navigate = useNavigate();
  const groupsRef = useRef(null);
  const { user } = useAuth();
  const { isReadOnly, academicYear, isFeatureAvailable } = useProtectedRoute();

  const isTerminated = academicYear?.status === 'terminated';
  const department = user?.department;
  const isSemester1 = academicYear?.semester === '1';
  const isSemester2 = academicYear?.semester === '2';

  // State for API errors
  const [apiErrors, setApiErrors] = useState([]);

  // Fetch pending students
  const { 
    data: pendingData, 
    loading: pendingLoading,
    error: pendingError
  } = useFetch(() => userService.getPendingStudents(department), [department]);

  // Fetch groups
  const { 
    data: groupsData, 
    loading: groupsLoading,
    error: groupsError
  } = useFetch(() => groupService.getGroups({ 
    department, 
    academicYearId: academicYear?.id 
  }), [department, academicYear?.id]);

  // Fetch proposals
  const { 
    data: proposalsData,
    loading: proposalsLoading,
    error: proposalsError
  } = useFetch(() => proposalService.getProposalsByDepartment(department), [department]);

  // Fetch all students
  const { 
    data: studentsData,
    loading: studentsLoading,
    error: studentsError
  } = useFetch(() => 
    userService.getUsersByDepartment(department, 'student', 'active'), 
  [department]);

  // Fetch advisors – using getUsers with filters for reliability
  const { 
    data: advisorsData,
    loading: advisorsLoading,
    error: advisorsError
  } = useFetch(() => 
    userService.getUsers({ 
      role: 'advisor', 
      department, 
      status: 'active' 
    }), 
  [department]);

  // Fetch defense schedules
  const { 
    data: defenseData,
    loading: defenseLoading,
    error: defenseError
  } = useFetch(() => defenseService.getDefenseSchedules({ 
    department, 
    semester: academicYear?.semester 
  }), [department, academicYear?.semester]);

  // Fetch final drafts - advisor approved drafts represent completed projects
  // Fetch by department and academic year, then filter by semester
  const {
    data: draftsData,
    loading: draftsLoading,
    error: draftsError
  } = useFetch(() => finalDraftService.getDepartmentDrafts(department, academicYear?.id), [department, academicYear?.id]);

  // Fetch notifications/activities
  const {
    data: notificationsData,
    loading: notificationsLoading,
    error: notificationsError
  } = useFetch(() => notificationService.getUserNotifications(false, 10), []);

  // Fetch sections to resolve section names
  const {
    data: sectionsData,
    loading: sectionsLoading
  } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  const currentAcademicYearDisplay = academicYear?.yearName || academicYear?.current || (academicYear?.id ? `AY${academicYear.id}` : null);

  const sanitizeStr = useCallback((str) => {
    if (!str || !sectionNameMap) return str;
    let out = str;
    Object.entries(sectionNameMap).forEach(([id, name]) => {
      if (out.includes(id)) {
        out = out.split(id).join(name);
      }
    });
    return out;
  }, [sectionNameMap]);

  const normalizeActivityText = useCallback((text) => {
    if (!text) return '';
    return text
      .toString()
      .replace(/registartion/gi, 'registration')
      .replace(/has registered and is awaiting approval\.?/gi, 'registered and awaiting approval')
      .replace(/has registered and awaiting approval\.?/gi, 'registered and awaiting approval')
      .replace(/\.+$/g, '')
      .trim();
  }, []);

  // Collect errors
  useEffect(() => {
    const errors = [];
    if (pendingError) errors.push({ api: 'Pending Students', error: pendingError });
    if (groupsError) errors.push({ api: 'Groups', error: groupsError });
    if (proposalsError) errors.push({ api: 'Proposals', error: proposalsError });
    if (studentsError) errors.push({ api: 'Students', error: studentsError });
    if (advisorsError) errors.push({ api: 'Advisors', error: advisorsError });
    if (defenseError) errors.push({ api: 'Defense', error: defenseError });
    if (draftsError) errors.push({ api: 'Final Drafts', error: draftsError });
    if (notificationsError) errors.push({ api: 'Notifications', error: notificationsError });

    setApiErrors(errors);

    if (errors.length > 0) {
      console.error('API Errors:', errors);
    }
  }, [
    pendingError, groupsError, proposalsError,
    studentsError, advisorsError, defenseError, draftsError, notificationsError
  ]);

  // Process data safely
  const pendingStudents = pendingData?.students || [];
  const groups = groupsData?.groups || [];
  const proposals = proposalsData?.proposals || [];
  const activeStudents = studentsData?.users || [];
  // advisorsData may contain a 'users' array from getUsers
  const advisors = advisorsData?.users || [];
  const defenseSchedules = defenseData?.schedules || [];
  const allDrafts = draftsData?.drafts || [];
  const notifications = notificationsData?.notifications || [];

  // Filter drafts by current semester for semester-aware counting
  const drafts = useMemo(() => {
    const currentSemester = academicYear?.semester;
    return allDrafts.filter(draft => 
      draft.semester === currentSemester || 
      (currentSemester === '1' && (!draft.semester || draft.semester === 1)) ||
      (currentSemester === '2' && draft.semester === '2')
    );
  }, [allDrafts, academicYear?.semester]);

  // Calculate unique advisors from groups (fallback in case advisors fetch fails)
  const uniqueAdvisorIdsFromGroups = new Set();
  groups.forEach(group => {
    if (group.Advisor?.id) {
      uniqueAdvisorIdsFromGroups.add(group.Advisor.id);
    }
  });
  const uniqueAdvisorsFromGroups = uniqueAdvisorIdsFromGroups.size;

  // Use advisors count from API if >0, otherwise use unique advisors from groups
  const totalAdvisors = advisors.length > 0 ? advisors.length : uniqueAdvisorsFromGroups;

  // Calculate statistics
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const approvedProposals = proposals.filter(p => p.status === 'approved');
  const rejectedProposals = proposals.filter(p => p.status === 'rejected');
  const groupsWithAdvisor = groups.filter(g => g.advisorId);
  const groupsWithEvaluators = groups.filter(g => g.Evaluators?.length > 0);
  // Completed projects: count of advisor-approved final drafts (from final_drafts table)
  const completedProjects = drafts.filter(d => d.advisorStatus === 'approved');
  const inProgressGroups = groups.filter(g => g.progressStatus === 'in-progress');
  const upcomingDefenses = defenseSchedules.filter(s => new Date(s.date) >= new Date());
  const pendingDrafts = drafts.filter(d => d.advisorStatus === 'pending');
  const approvedDrafts = drafts.filter(d => d.advisorStatus === 'approved');

  const stats = {
    totalGroups: groups.length,
    approvedProposals: approvedProposals.length,
    pendingProposals: pendingProposals.length,
    groupsWithAdvisor: groupsWithAdvisor.length,
    completedProjects: completedProjects.length,
    totalStudents: activeStudents.length,
    totalAdvisors: totalAdvisors,
    pendingRegistrations: pendingStudents.length,
    totalDrafts: drafts.length,
    pendingDrafts: pendingDrafts.length,
    approvedDrafts: approvedDrafts.length
  };

  const ACTIVITY_STORAGE_KEY = 'DeptDashboard_removedActivityIds';
  const [removedActivityIds, setRemovedActivityIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ACTIVITY_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(removedActivityIds));
  }, [removedActivityIds]);

  useEffect(() => {
    const currentAcademicYearId = academicYear?.id; // Ensure this is correctly captured
    const currentSemester = academicYear?.semester;

    // Build activities from both system data and notifications
    const activities = [
      // Include notifications specific to this department head
      ...notifications.slice(0, 4).map(n => ({
        id: `notif-${n.id}`,
        type: n.type?.includes('approved') ? 'approval' :
              n.type?.includes('rejected') ? 'warning' :
              n.type?.includes('proposal') || n.type?.includes('draft') ? 'file-text' :
              n.type?.includes('registration') || n.type?.includes('student') ? 'user-plus' :
              n.type?.includes('defense') || n.type?.includes('schedule') ? 'calendar' :
              n.type?.includes('complete') || n.type?.includes('completed') ? 'check-circle' : 'info',
        title: normalizeActivityText(sanitizeStr(n.title)),
        description: normalizeActivityText(sanitizeStr(n.message)),
        academicYear: currentAcademicYearDisplay,
        semester: `Semester ${currentSemester}`,
        timestamp: n.createdAt,
        link: n.link || '/dept-head/dashboard'
      })),
      // Include pending student registrations
      ...pendingStudents.slice(0, 2).map(s => ({
        id: `reg-${s.id}`,
        type: 'user-plus',
        title: 'New Student Registration',
        description: normalizeActivityText(`${s.name} registered and awaiting approval`),
        academicYear: currentAcademicYearDisplay,
        semester: `Semester ${currentSemester}`,
        timestamp: s.createdAt,
        link: '/dept-head/registrations'
      })),

      // Include pending proposals
      ...pendingProposals.slice(0, 2).map(p => ({
        id: `prop-${p.id}`,
        type: 'file-text',
        title: 'Proposal Submitted', // Changed 'Proposal Submitted' to 'Proposal Submitted'
        description: `${formatGroupDisplayName(p.Group, sectionNameMap) || 'Unknown Group'} submitted a proposal`,
        academicYear: currentAcademicYearDisplay,
        semester: `Semester ${p.semester || currentSemester}`,
        timestamp: p.submittedAt,
        link: '/dept-head/proposals'
      })),
      // Include upcoming defenses
      ...upcomingDefenses.slice(0, 2).map(d => ({
        id: `def-${d.id}`,
        type: 'calendar',
        title: 'Defense Scheduled',
        description: `${sanitizeStr(d.groupName)} defense on ${formatDate(d.date)}`,
        academicYear: currentAcademicYearDisplay,
        semester: `Semester ${d.semester || currentSemester}`,
        timestamp: d.createdAt || d.date,
        link: '/dept-head/defense-schedule'
      })),
      // Include completed projects
      ...groups.filter(g => g.finalDraftStatus === 'fully-approved').slice(0, 2).map(g => ({
        id: `complete-${g.id}`,
        type: 'check-circle',
        title: 'Project Completed',
        description: `${formatGroupDisplayName(g, sectionNameMap)} completed their project`,
        academicYear: currentAcademicYearDisplay,
        semester: `Semester ${currentSemester}`,
        timestamp: g.updatedAt,
        link: '/dept-head/group-info'
      })),
      // Include pending final drafts
      ...pendingDrafts.slice(0, 2).map(d => ({
        id: `draft-${d.id}`,
        type: 'file-text',
        title: 'Final Draft Ready',
        description: `${formatGroupDisplayName(d.Group, sectionNameMap) || 'Unknown Group'} submitted final draft`,
        academicYear: currentAcademicYearDisplay,
        semester: `Semester ${d.semester || currentSemester}`,
        timestamp: d.submittedAt,
        link: '/dept-head/final-drafts'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    const seenActivityKeys = new Set();
    const uniqueActivities = [];

    activities.forEach((activity) => {
      const dedupeKey = `${activity.type}|${normalizeActivityText(activity.title)}|${normalizeActivityText(activity.description)}`;
      if (!seenActivityKeys.has(dedupeKey)) {
        seenActivityKeys.add(dedupeKey);
        uniqueActivities.push(activity);
      }
    });

    setRecentActivities(uniqueActivities);
  }, [JSON.stringify(pendingStudents), JSON.stringify(pendingProposals), sectionNameMap, sanitizeStr, normalizeActivityText,
      JSON.stringify(upcomingDefenses), JSON.stringify(groups), JSON.stringify(pendingDrafts),
      // Ensure all dependencies are correctly listed
      // The original code used JSON.stringify for arrays, which is fine for memoization,
      // but for useEffect, it's better to pass the actual arrays if they are stable or
      // if the effect should re-run when their content changes.
      // For now, I'll keep the JSON.stringify for consistency with the original code's intent.
      JSON.stringify(notifications), academicYear?.id, academicYear?.semester]);

  const displayedRecentActivities = useMemo(
    () => recentActivities.filter(activity => !removedActivityIds.includes(activity.id)),
    [recentActivities, removedActivityIds]
  );

  const scrollToGroups = () => {
    groupsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickActions = [
    {
      title: 'Student Registrations',
      description: `${pendingStudents.length} pending approval${pendingStudents.length !== 1 ? 's' : ''}`,
      icon: UserPlus,
      path: '/dept-head/registrations',
      color: 'bg-blue-500',
      urgent: pendingStudents.length > 0,
      semester: 1,
      stats: pendingStudents.length,
      hideWhenTerminated: false
    },
    {
      title: 'Proposal Evaluation',
      description: `${pendingProposals.length} proposal${pendingProposals.length !== 1 ? 's' : ''} to review`,
      icon: FileText,
      path: '/dept-head/proposals',
      color: 'bg-purple-500',
      urgent: pendingProposals.length > 0,
      semester: 1,
      stats: pendingProposals.length,
      hideWhenTerminated: true
    },
    {
      title: 'Group Formation',
      description: `${groups.length} group${groups.length !== 1 ? 's' : ''} formed`,
      icon: Users,
      path: '/dept-head/groups',
      color: 'bg-teal-500',
      semester: 1,
      stats: groups.length,
      hideWhenTerminated: false
    },
    {
      title: 'Progress Monitoring',
      description: `${inProgressGroups.length} active group${inProgressGroups.length !== 1 ? 's' : ''}`,
      icon: Clock,
      path: '/dept-head/monitoring',
      color: 'bg-yellow-500',
      semester: 2,
      stats: inProgressGroups.length,
      hideWhenTerminated: true
    },
    {
      title: 'Defense Schedule',
      description: `${upcomingDefenses.length} upcoming defense${upcomingDefenses.length !== 1 ? 's' : ''}`,
      icon: Calendar,
      path: '/dept-head/defense-schedule',
      color: 'bg-green-500',
      semester: 2,
      stats: upcomingDefenses.length,
      hideWhenTerminated: true
    },
    {
      title: 'Final Drafts',
      description: `${pendingDrafts.length} pending, ${approvedDrafts.length} approved`,
      icon: FileText,
      path: '/dept-head/final-drafts',
      color: 'bg-orange-500',
      semester: 'both',
      stats: drafts.length,
      hideWhenTerminated: true
    },
    {
      title: 'Group Information',
      description: 'View all group details',
      icon: BookOpen,
      path: '/dept-head/group-info',
      color: 'bg-indigo-500',
      semester: 'both',
      stats: groups.length,
      hideWhenTerminated: false
    }
  ].filter(action => {
    if (action.hideWhenTerminated && isTerminated) return false;
    if (action.semester === 'both') return true;
    if (isSemester1 && action.semester === 1) return true;
    if (isSemester2 && action.semester === 2) return true;
    return false;
  });

  // Sort groups by number
  const sortedGroups = [...groups].sort((a, b) => {
    const numA = parseInt(a.name?.match(/\d+/)?.[0]) || 0;
    const numB = parseInt(b.name?.match(/\d+/)?.[0]) || 0;
    return numA - numB;
  });

  const groupColumns = [
    {
      key: 'name',
      label: 'Group',
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900">{formatGroupDisplayName(row, sectionNameMap)}</div>
          <div className="text-xs text-gray-500">{row.department}</div>
        </div>
      )
    },
    {
      key: 'members',
      label: 'Members',
      render: (_, row) => {
        const members = row.Members || [];
        return (
          <div className="flex flex-col gap-1">
            {members.map((member, idx) => (
              <div
                key={idx}
                className="text-sm text-gray-700"
                title={member.name}
              >
                {member.name}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      key: 'project',
      label: 'Project',
      render: (_, row) => {
        if (!row.approvedTitle) return <span className="text-gray-400 italic">Not approved</span>;
        try {
          const title = typeof row.approvedTitle === 'string' 
            ? JSON.parse(row.approvedTitle).title 
            : row.approvedTitle;
          return <span className="text-sm line-clamp-1">{title}</span>;
        } catch {
          return <span className="text-sm line-clamp-1">{row.approvedTitle}</span>;
        }
      }
    },
    {
      key: 'advisor',
      label: 'Advisor',
      render: (_, row) => {
        const advisor = row.Advisor;
        return advisor ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
              {advisor.name?.charAt(0)}
            </div>
            <span className="text-sm truncate max-w-[100px]">{advisor.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Unassigned</span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        let statusColor = 'bg-gray-100 text-gray-800';
        let statusText = 'Pending';
        
        if (row.finalDraftStatus === 'fully-approved') {
          statusColor = 'bg-green-100 text-green-800';
          statusText = 'Completed';
        } else if (row.finalDraftStatus === 'advisor-approved') {
          statusColor = 'bg-blue-100 text-blue-800';
          statusText = 'Advisor Approved';
        } else if (row.proposalStatus === 'approved') {
          statusColor = 'bg-yellow-100 text-yellow-800';
          statusText = 'In Progress';
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {statusText}
          </span>
        );
      }
    }
  ];

  // Show loading state
  if (pendingLoading || groupsLoading || proposalsLoading || studentsLoading || 
      advisorsLoading || defenseLoading || draftsLoading || notificationsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  // Show error state
  if (apiErrors.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 text-center mb-6">The following API calls failed:</p>
          
          <div className="space-y-3 mb-6">
            {apiErrors.map((err, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-red-800">{err.api} API Error</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {typeof err.error === 'object' 
                        ? JSON.stringify(err.error) 
                        : err.error || 'Unknown error'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.removeItem('fypToken');
                navigate('/login');
              }}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-xl p-6 text-white shadow-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>Welcome back, {user?.name}!</h1>
            <p className="text-teal-100" style={{ fontFamily: 'Times New Roman, serif' }}>
              Department Head - {department} • Semester {academicYear?.semester} • {academicYear?.yearName || academicYear?.current}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs opacity-80">Groups</p>
              <p className="text-xl font-bold">{stats.totalGroups}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs opacity-80">Students</p>
              <p className="text-xl font-bold">{stats.totalStudents}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs opacity-80">Advisors</p>
              <p className="text-xl font-bold">{stats.totalAdvisors}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Pending Registrations</p>
            <p className={`text-2xl font-bold ${pendingStudents.length > 0 ? 'text-yellow-300' : 'text-white'}`}>
              {pendingStudents.length}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Pending Proposals</p>
            <p className={`text-2xl font-bold ${pendingProposals.length > 0 ? 'text-yellow-300' : 'text-white'}`}>
              {pendingProposals.length}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Groups with Advisor</p>
            <p className="text-2xl font-bold text-white">{stats.groupsWithAdvisor}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Completed Projects</p>
            <p className="text-2xl font-bold text-white">{stats.completedProjects}</p>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(pendingStudents.length > 0 || pendingProposals.length > 0 || pendingDrafts.length > 0) && (
        <div className="space-y-3 mb-6">
          {pendingStudents.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4">
              <UserPlus className="w-6 h-6 text-yellow-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800">
                  {pendingStudents.length} student registration{pendingStudents.length !== 1 ? 's' : ''} awaiting approval
                </p>
                <p className="text-sm text-yellow-700">
                  Review and approve student registrations to allow them access to the system.
                </p>
              </div>
              <Button
                variant="warning"
                size="sm"
                onClick={() => navigate('/dept-head/registrations')}
                disabled={isReadOnly}
              >
                Review Now
              </Button>
            </div>
          )}

          {pendingProposals.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-4">
              <FileText className="w-6 h-6 text-purple-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-purple-800">
                  {pendingProposals.length} project proposal{pendingProposals.length !== 1 ? 's' : ''} awaiting evaluation
                </p>
                <p className="text-sm text-purple-700">
                  Review and approve/reject proposals to help groups move forward.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/dept-head/proposals')}
                disabled={isReadOnly}
              >
                Evaluate Now
              </Button>
            </div>
          )}

          {pendingDrafts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-4">
              <FileText className="w-6 h-6 text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  {pendingDrafts.length} final draft{pendingDrafts.length !== 1 ? 's' : ''} awaiting your review
                </p>
                <p className="text-sm text-orange-700">
                  Final drafts approved by advisors need your final approval.
                </p>
              </div>
              <Button
                variant="warning"
                size="sm"
                onClick={() => navigate('/dept-head/final-drafts')}
                disabled={isReadOnly}
              >
                Review Drafts
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div onClick={scrollToGroups} className="cursor-pointer transition-transform hover:scale-105">
          <MetricCard
            title="Total Groups"
            value={stats.totalGroups}
            subtitle={`${stats.groupsWithAdvisor} with advisor`}
            icon={Users}
            color="blue"
            trend={stats.totalGroups > 0 ? 'up' : 'neutral'}
            trendValue={`${Math.round((stats.groupsWithAdvisor / (stats.totalGroups || 1)) * 100)}% assigned`}
          />
        </div>

        {isSemester1 && (
          <MetricCard
            title="Pending Registrations"
            value={pendingStudents.length}
            subtitle="Awaiting approval"
            icon={UserPlus}
            color={pendingStudents.length > 0 ? 'yellow' : 'green'}
            trend={pendingStudents.length > 0 ? 'up' : 'down'}
            trendValue={`${pendingStudents.length} pending`}
            onClick={() => !isReadOnly && navigate('/dept-head/registrations')}
          />
        )}

        {isSemester1 && (
          <MetricCard
            title="Proposals"
            value={proposals.length}
            subtitle={`${pendingProposals.length} pending`}
            icon={FileText}
            color={pendingProposals.length > 0 ? 'purple' : 'green'}
            trend={approvedProposals.length > 0 ? 'up' : 'neutral'}
            trendValue={`${approvedProposals.length} approved`}
            onClick={() => !isReadOnly && navigate('/dept-head/proposals')}
          />
        )}

        <MetricCard
          title="Active Students"
          value={stats.totalStudents}
          subtitle={`${stats.totalGroups} groups`}
          icon={Award}
          color="teal"
          onClick={() => !isReadOnly && navigate('/dept-head/students')}
        />

        {isSemester2 && (
          <MetricCard
            title="Completed Projects"
            value={stats.completedProjects}
            subtitle={`${Math.round((stats.completedProjects / (stats.totalGroups || 1)) * 100)}% of groups`}
            icon={CheckCircle}
            color="green"
            trend={stats.completedProjects > 0 ? 'up' : 'neutral'}
            onClick={() => !isReadOnly && navigate('/dept-head/monitoring')}
          />
        )}

        <MetricCard
          title="Final Drafts"
          value={drafts.length}
          subtitle={`${approvedDrafts.length} approved, ${pendingDrafts.length} pending`}
          icon={FileText}
          color="orange"
          onClick={() => !isReadOnly && navigate('/dept-head/final-drafts')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Grid */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  onClick={() => !isReadOnly && navigate(action.path)}
                  className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 transition-all group ${
                    isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${action.color} p-2.5 rounded-lg group-hover:scale-110 transition-transform shrink-0`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.description}</p>
                      <p className="text-xs font-medium text-gray-700 mt-1">{action.stats}</p>
                    </div>
                    {!isReadOnly && (
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Groups Table */}
          <div ref={groupsRef} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Groups</h2>
              <button
                onClick={() => navigate('/dept-head/group-info')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <DataTable
              columns={groupColumns}
              data={sortedGroups.slice(0, 5)}
              searchable={false}
              pageSize={5}
              emptyMessage="No groups found."
            />
          </div>
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="space-y-6 h-full">
          <ActivityTimeline
            activities={displayedRecentActivities}
            onActivityClick={(activity) => {
              if (activity.link) {
                navigate(activity.link);
              }
            }}
            onRemoveActivity={(id) => setRemovedActivityIds(prev => prev.includes(id) ? prev : [...prev, id])}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default DeptDashboard;
