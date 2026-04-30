import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  Store,
  ArrowRight,
  AlertCircle,
  Shield,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, progressService, finalDraftService, defenseService, notificationService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName } from '../../utils/sectionDisplay';

const AdvisorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly, academicYear, isFeatureAvailable } = useProtectedRoute();

  const isTerminated = academicYear?.status === 'terminated';
  const isSemester1 = academicYear?.semester === '1';

  // Get current academic year and semester
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  // Fetch my groups (mentored groups) - filtered by academic year
  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useFetch(() => groupService.getGroups({
    advisorId: user.id,
    academicYearId: currentAcademicYearId
  }), [user.id, currentAcademicYearId]);

  // Fetch progress reports for review
  const {
    data: progressData,
    loading: progressLoading,
    error: progressError,
    refetch: refetchProgress
  } = useFetch(() => progressService.getProgressReportsByAdvisor?.(user.id, 'pending') || Promise.resolve({ reports: [] }), [user.id]);

  // Fetch available projects (marketplace)
  const {
    data: availableData,
    loading: availableLoading,
    error: availableError
  } = useFetch(() => groupService.getAvailableProjects(), []);

  // Fetch groups where I'm an evaluator
  const {
    data: evaluationData,
    loading: evaluationLoading,
    error: evaluationError
  } = useFetch(() => groupService.getGroupsForEvaluator(user.id), [user.id]);

  // Fetch pending final drafts
  const {
    data: draftsData,
    loading: draftsLoading,
    error: draftsError,
    refetch: refetchDrafts
  } = useFetch(() => finalDraftService.getPendingAdvisorDrafts(), []);

  // Fetch defense schedules for evaluation - filtered by academic year AND semester
  const defenseFetchFn = useCallback(() => {
    return defenseService.getDefenseSchedules?.({
      department: user.department,
      academicYearId: currentAcademicYearId,
      semester: currentSemester
    }) || Promise.resolve({ schedules: [] });
  }, [user.department, currentAcademicYearId, currentSemester]);

  const {
    data: defenseData,
    loading: defenseLoading,
    error: defenseError
  } = useFetch(defenseFetchFn, [defenseFetchFn]);

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

  // Safely extract data
  const myGroups = groupsData?.groups || [];
  const allProgressReports = progressData?.reports || [];
  const availableProjects = availableData?.groups || [];
  const evaluationGroups = evaluationData?.groups || [];
  // Filter to only truly pending drafts (advisorStatus === 'pending')
  const allPendingDrafts = useMemo(() => {
    return (draftsData?.drafts || []).filter(d => d.advisorStatus === 'pending');
  }, [draftsData?.drafts]);
  const allDefenseSchedules = defenseData?.schedules || [];
  const notifications = notificationsData?.notifications || [];

  // Filter progress reports by semester, academic year, AND status === 'pending'
  const pendingReviews = useMemo(() => {
    return allProgressReports.filter(report => {
      // First check status - must be 'pending'
      if (report.status !== 'pending') return false;
      
      // Check academic year ID
      if (report.Group?.academicYearId && currentAcademicYearId) {
        if (report.Group.academicYearId !== currentAcademicYearId) return false;
      }
      // Check semester (compare as strings)
      const reportSemester = String(report.semester || '1');
      return reportSemester === currentSemester;
    }).map(report => {
      if (!report.Group) return report;

      // Extract section ID and manually fix the Group name string
      let sectionId = report.Group.section || report.Group.Members?.[0]?.section;
      let groupName = report.Group.name || '';
      
      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }

      return {
        ...report,
        Group: { ...report.Group, name: groupName, section: sectionId }
      };
    });
  }, [allProgressReports, currentSemester, currentAcademicYearId, sectionNameMap]);

  // Filter final drafts by semester and academic year (semester-aware)
  // Note: allPendingDrafts already filtered to only 'pending' status above
  const pendingDrafts = useMemo(() => {
    return allPendingDrafts.filter(draft => {
      // Check academic year ID
      if (draft.academicYearId && currentAcademicYearId) {
        if (draft.academicYearId !== currentAcademicYearId) return false;
      }
      if (draft.Group?.academicYearId && currentAcademicYearId) {
        if (draft.Group.academicYearId !== currentAcademicYearId) return false;
      }
      // Check semester (compare as strings)
      const draftSemester = String(draft.semester || '1');
      return draftSemester === currentSemester;
    }).map(draft => {
      if (!draft.Group) return draft;
      
      let sectionId = draft.Group.section || draft.Group.Members?.[0]?.section;
      let groupName = draft.Group.name || '';

      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }
      
      return {
        ...draft,
        Group: { ...draft.Group, name: groupName, section: sectionId }
      };
    });
  }, [allPendingDrafts, currentSemester, currentAcademicYearId, sectionNameMap]);

  // Filter defense schedules by semester and academic year (semester-aware)
  const defenseSchedules = useMemo(() => {
    return allDefenseSchedules.filter(schedule => {
      // Check academic year ID
      if (schedule.academicYearId && currentAcademicYearId) {
        if (schedule.academicYearId !== currentAcademicYearId) return false;
      }
      // Check semester (compare as strings)
      const scheduleSemester = String(schedule.semester || '1');
      return scheduleSemester === currentSemester;
    }).map(s => {
      if (!s.Group) return s;
      
      let sectionId = s.Group.section || s.Group.Members?.[0]?.section;
      let groupName = s.Group.name || '';

      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }
      
      return {
        ...s,
        groupName: groupName, // Update the flat property if used
        Group: { ...s.Group, name: groupName, section: sectionId }
      };
    });
  }, [allDefenseSchedules, currentSemester, currentAcademicYearId, sectionNameMap]);

  // Filter evaluation groups by semester and academic year (semester-aware)
  const semesterAwareEvaluationGroups = useMemo(() => {
    return evaluationGroups.filter(group => {
      // Check academic year ID
      if (group.academicYearId && currentAcademicYearId) {
        if (group.academicYearId !== currentAcademicYearId) return false;
      }
      // Check semester from the group object (backend now returns this)
      const groupSemester = String(group.semester || '1');
      if (groupSemester !== currentSemester) return false;
      return true;
    }).map(g => {
      let sectionId = g.section || g.Members?.[0]?.section;
      let groupName = g.name || '';

      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }

      return {
        ...g,
        name: groupName,
        section: sectionId
      };
    });
  }, [evaluationGroups, currentAcademicYearId, currentSemester, sectionNameMap]);

  // Filter groups by academic year (for mentored groups count - same across semesters)
  const academicYearGroups = useMemo(() => {
    return myGroups.filter(group =>
      group.academicYearId === currentAcademicYearId
    ).map(g => {
      let sectionId = g.section || g.Members?.[0]?.section;
      let groupName = g.name || '';

      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }

      return {
        ...g,
        name: groupName,
        section: sectionId
      };
    });
  }, [myGroups, currentAcademicYearId, sectionNameMap]);

  // Filter groups by academic year AND semester (for semester-specific metrics)
  const semesterAwareGroups = useMemo(() => {
    return myGroups.filter(group => {
      // Check academic year ID
      if (group.academicYearId && currentAcademicYearId) {
        if (group.academicYearId !== currentAcademicYearId) return false;
      }
      // Check semester (compare as strings)
      const groupSemester = String(group.semester || '1');
      return groupSemester === currentSemester;
    }).map(g => {
      let sectionId = g.section || g.Members?.[0]?.section;
      let groupName = g.name || '';

      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }

      return {
        ...g,
        name: groupName,
        section: sectionId
      };
    });
  }, [myGroups, currentAcademicYearId, currentSemester, sectionNameMap]);

  // Calculate statistics (semester-aware for progress, academic year for groups)
  const totalStudents = academicYearGroups.reduce((acc, group) => acc + (group.Members?.length || 0), 0);
  const completedGroups = semesterAwareGroups.filter(g => g.finalDraftStatus === 'advisor-approved').length;
  const inProgressGroups = semesterAwareGroups.filter(g => g.finalDraftStatus !== 'advisor-approved' && g.advisorId).length;
  // Upcoming defenses: only count actually scheduled defenses (future dates, already filtered by semester/academic year)
  // AND only count defenses where this advisor is actually listed as an evaluator
  const upcomingDefenses = useMemo(() => {
    const now = new Date().setHours(0, 0, 0, 0);
    return defenseSchedules.filter(s => {
      // Check if date is in the future
      if (new Date(s.date) < now) return false;
      // Verify advisor is actually assigned as an evaluator for this defense
      const evaluators = s.evaluators || s.Evaluators || s.groupEvaluators || [];
      const isEvaluator = evaluators.some(e => e.id === user.id || e.evaluatorId === user.id);
      return isEvaluator;
    }).length;
  }, [defenseSchedules, user.id]);

  // Create activities timeline from real data and notifications (semester-aware) - memoized for stability
  const rawActivities = useMemo(() => {
    const activityList = [];

    // Notifications - advisor-specific notifications
    notifications.forEach(n => {
      activityList.push({
        id: `notif-${n.id}`,
        type: n.type?.includes('approved') ? 'approval' :
              n.type?.includes('rejected') ? 'warning' :
              n.type?.includes('progress') || n.type?.includes('report') ? 'feedback' :
              n.type?.includes('draft') || n.type?.includes('document') ? 'document' :
              n.type?.includes('defense') || n.type?.includes('schedule') ? 'calendar' :
              n.type?.includes('group') ? 'group' :
              n.type?.includes('evaluation') ? 'evaluation' : 'info',
        title: sanitizeStr(n.title),
        description: sanitizeStr(n.message),
        timestamp: n.createdAt,
        link: n.link || '/advisor/dashboard',
        academicYear: academicYear?.year || null,
        semester: `Semester ${currentSemester}`
      });
    });

    // Progress Reports - pending reviews for current semester
    pendingReviews.forEach(r => {
      activityList.push({
        id: `progress-${r.id}`,
        type: r.type?.includes('approved') ? 'approval' :
              r.type?.includes('rejected') ? 'warning' :
              r.type?.includes('feedback') ? 'feedback' : 'info',
        title: 'New Progress Report',
        description: sanitizeStr(`${formatGroupDisplayName(r.Group, sectionNameMap) || 'A group'} submitted a progress report: ${r.title || ''}`),
        timestamp: r.submittedAt,
        link: '/advisor/progress-review',
        academicYear: academicYear?.year || null,
        semester: `Semester ${currentSemester}`
      });
    });

    // Final Drafts - pending drafts for current semester
    pendingDrafts.forEach(d => {
      activityList.push({
        id: `draft-${d.id}`,
        type: 'document',
        title: 'Final Draft Ready',
        description: sanitizeStr(`${formatGroupDisplayName(d.Group, sectionNameMap) || 'A group'} submitted their final draft for approval`),
        timestamp: d.submittedAt,
        link: '/advisor/final-approval',
        academicYear: academicYear?.year || null,
        semester: `Semester ${currentSemester}`
      });
    });

    // Defense Schedules - upcoming defenses where advisor is involved (advisor or evaluator)
    defenseSchedules.filter(s => {
      // Check if user is advisor of this group
      const isGroupAdvisor = academicYearGroups.some(mg => mg.id === s.groupId);
      // Check if user is evaluator for this schedule
      const evaluators = s.evaluators || s.Evaluators || s.groupEvaluators || [];
      const isEvaluator = evaluators.some(e => (e.id || e.evaluatorId) === user.id);
      
      return isGroupAdvisor || isEvaluator;
    }).forEach(s => {
      const groupDisplayName = formatGroupDisplayName(s.Group || academicYearGroups.find(g => g.id === s.groupId), sectionNameMap) || s.groupName || 'A group';
      
      activityList.push({
        id: `defense-${s.id}`,
        type: 'calendar',
        title: 'Defense Scheduled',
        description: sanitizeStr(`${groupDisplayName} defense on ${s.date ? new Date(s.date).toLocaleDateString() : 'TBD'} at ${s.time || 'TBD'}`),
        timestamp: s.createdAt || s.updatedAt || s.date || new Date(),
        link: '/advisor/schedule',
        academicYear: academicYear?.year || null,
        semester: `Semester ${currentSemester}`
      });
    });

    // Evaluator Assignments - groups where advisor is assigned as evaluator
    semesterAwareEvaluationGroups.forEach(g => {
      activityList.push({
        id: `eval-${g.id}`,
        type: 'evaluation',
        title: `Evaluation Assignment: ${formatGroupDisplayName(g, sectionNameMap)}`,
        description: sanitizeStr(`You have been assigned as evaluator for ${formatGroupDisplayName(g, sectionNameMap)} in ${g.department}`),
        timestamp: g.updatedAt || g.createdAt,
        link: `/advisor/evaluations/${g.id}`,
        academicYear: academicYear?.year || null,
        semester: `Semester ${currentSemester}`
      });
    });

    // Group Activities - recently created/updated groups in this academic year
    academicYearGroups.forEach(g => {
      const statusLabel = g.finalDraftStatus === 'advisor-approved' ? 'Advisor Approved' :
                         g.finalDraftStatus === 'fully-approved' ? 'Fully Approved' :
                         g.finalDraftStatus === 'submitted' ? 'Final Draft Submitted' :
                         g.progressStatus === 'in-progress' ? 'Progress In Progress' :
                         'Active';
      activityList.push({
        id: `group-${g.id}`,
        type: 'group',
        title: `Mentored Group: ${formatGroupDisplayName(g, sectionNameMap)}`,
        description: sanitizeStr(`${g.Members?.length || 0} members • ${g.department} • Status: ${statusLabel}`),
        timestamp: g.updatedAt || g.createdAt,
        link: `/advisor/groups/${g.id}`,
        academicYear: academicYear?.year || null,
        semester: `Semester ${currentSemester}`
      });
    });

    // Sort by timestamp (most recent first) and limit to 15
    return activityList
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 15);
  }, [notifications, pendingReviews, pendingDrafts, defenseSchedules, semesterAwareEvaluationGroups, academicYearGroups, academicYear, currentSemester, sectionNameMap, sanitizeStr]);

  const ACTIVITY_STORAGE_KEY = 'AdvisorDashboard_removedActivityIds';
  const [removedActivityIds, setRemovedActivityIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ACTIVITY_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(removedActivityIds));
  }, [removedActivityIds]);

  const displayedActivities = useMemo(
    () => rawActivities.filter(activity => !removedActivityIds.includes(activity.id)),
    [rawActivities, removedActivityIds]
  );

  const handleRemoveActivity = useCallback((id) => {
    setRemovedActivityIds(prev => prev.includes(id) ? prev : [...prev, id]);
    toast.success('Activity removed from list.');
  }, []);

  // Track initial load only
  const [initialLoaded, setInitialLoaded] = useState(false);
  const initialLoadDone = useRef(false);

  // Combine all initial fetch loading states
  const initialLoading = groupsLoading || progressLoading || availableLoading || evaluationLoading || draftsLoading || defenseLoading || notificationsLoading || sectionsLoading;

  useEffect(() => {
    if (!initialLoading && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setInitialLoaded(true);
    }
  }, [initialLoading]);

  // Only show full-screen spinner on VERY first load
  if (!initialLoaded) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-3">
      {/* Welcome Banner with Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>Welcome back, {user?.name}!</h1>
            <p className="text-purple-100" style={{ fontFamily: 'Times New Roman, serif' }}>
              Semester {currentSemester} • {academicYearGroups.length} Active Groups • {totalStudents} Students
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Mentored Groups</p>
            <p className="text-2xl font-bold">{academicYearGroups.length}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 relative">
            <p className="text-sm opacity-80">Pending Reviews</p>
            <p className="text-2xl font-bold text-yellow-300">{pendingReviews.length}</p>
            {pendingReviews.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className="bg-white/10 rounded-lg p-3 relative">
            <p className="text-sm opacity-80">Pending Approvals</p>
            <p className="text-2xl font-bold text-orange-300">{pendingDrafts.length}</p>
            {pendingDrafts.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Evaluation Duties</p>
            <p className="text-2xl font-bold">{evaluationGroups.length}</p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
        <MetricCard
          title="My Groups"
          value={myGroups.length}
          subtitle={`${totalStudents} students`}
          icon={Users}
          color="blue"
          onClick={() => navigate('/advisor/groups')}
        />

        {isSemester1 && !isTerminated && (
          <MetricCard
            title="Available Projects"
            value={availableProjects.length}
            subtitle="Ready to claim"
            icon={Store}
            color="purple"
            trend={availableProjects.length > 0 ? 'up' : 'neutral'}
            trendValue={`${availableProjects.length} available`}
            onClick={() => navigate('/advisor/marketplace')}
          />
        )}

        {!isTerminated && (
          <MetricCard
            title="Progress Reviews"
            value={pendingReviews.length}
            subtitle={pendingReviews.length > 0 ? 'Needs attention' : 'All caught up'}
            icon={MessageSquare}
            color={pendingReviews.length > 0 ? 'yellow' : 'green'}
            trend={pendingReviews.length > 0 ? 'up' : 'down'}
            trendValue={`${pendingReviews.length} pending`}
            onClick={() => navigate('/advisor/progress-review')}
          />
        )}

        {!isTerminated && (
          <MetricCard
            title="Final Approvals"
            value={pendingDrafts.length}
            subtitle={pendingDrafts.length > 0 ? 'Needs attention' : 'All caught up'}
            icon={CheckCircle}
            color={pendingDrafts.length > 0 ? 'orange' : 'green'}
            trend={pendingDrafts.length > 0 ? 'up' : 'down'}
            trendValue={`${pendingDrafts.length} pending`}
            onClick={() => navigate('/advisor/final-approval')}
          />
        )}

        {!isTerminated && (
          <MetricCard
            title="Evaluations"
            value={evaluationGroups.length}
            subtitle="View evaluation duties"
            icon={Shield}
            color="indigo"
            onClick={() => navigate('/advisor/AdvisorEvaluations')}
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Groups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'My Groups',
                  description: 'View and manage your mentored groups',
                  icon: Users,
                  path: '/advisor/groups',
                  color: 'bg-blue-500',
                  stats: `${academicYearGroups.length} groups`,
                  show: true
                },
                isSemester1 && !isTerminated ? {
                  title: 'Project Marketplace',
                  description: 'Find and claim projects',
                  icon: Store,
                  path: '/advisor/marketplace',
                  color: 'bg-purple-500',
                  stats: `${availableProjects.length} available`,
                  show: true
                } : null,
                !isTerminated ? {
                  title: 'Progress Review',
                  description: 'Review student progress reports',
                  icon: MessageSquare,
                  path: '/advisor/progress-review',
                  color: 'bg-teal-500',
                  stats: `${pendingReviews.length} pending`,
                  show: true
                } : null,
                !isTerminated ? {
                  title: 'Final Approvals',
                  description: 'Approve final project drafts',
                  icon: CheckCircle,
                  path: '/advisor/final-approval',
                  color: 'bg-green-500',
                  stats: `${pendingDrafts.length} pending`,
                  show: true
                } : null,
                !isTerminated ? {
                  title: 'Evaluations',
                  description: 'View your evaluation duties',
                  icon: Shield,
                  path: '/advisor/AdvisorEvaluations',
                  color: 'bg-indigo-500',
                  stats: `${evaluationGroups.length} groups`,
                  show: true
                } : null,
                !isTerminated ? {
                  title: 'Schedule',
                  description: 'View defense schedule',
                  icon: Calendar,
                  path: '/advisor/schedule',
                  color: 'bg-pink-500',
                  stats: `${upcomingDefenses} upcoming`,
                  show: true
                } : null
              ].filter(action => action && action.show).map((action, index) => (
                <div
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 transition-all group cursor-pointer hover:shadow-md hover:border-gray-200"
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
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Active Groups */}
          {academicYearGroups.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recently Active Groups</h2>
                <button
                  onClick={() => navigate('/advisor/groups')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {academicYearGroups.slice(0, 3).map((group) => {
                  const hasPendingReviews = pendingReviews.some(r => r.groupId === group.id);
                  const hasPendingDraft = pendingDrafts.some(d => d.groupId === group.id);
                  
                  return (
                    <div
                      key={group.id}
                      onClick={() => navigate(`/advisor/groups/${group.id}`)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{formatGroupDisplayName(group, sectionNameMap)}</p>
                        <p className="text-xs text-gray-500">
                          {group.Members?.length || 0} members • {group.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPendingReviews && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Review
                          </span>
                        )}
                        {hasPendingDraft && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Draft
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="space-y-6 h-full">
          <ActivityTimeline
            activities={displayedActivities}
            onActivityClick={(activity) => {
              if (activity.link) {
                navigate(activity.link);
              }
            }}
            onRemoveActivity={handleRemoveActivity}
          />
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;
