import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  FileText,
  BarChart3,
  Clock,
  ArrowRight,
  TrendingUp,
  UserX,
  Shield,
  Building,
  Award,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService, defenseService, userService, academicService, finalDraftService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import toast from 'react-hot-toast';
import MetricCard from '../../components/dashboard/MetricCard';
import ReportChart from '../../components/reports/ReportChart';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatDate } from '../../utils/dateUtils';
import { buildSectionNameMap, formatGroupDisplayName } from '../../utils/sectionDisplay';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();

  const isTerminated = academicYear?.status === 'terminated';
  const isSemester1 = academicYear?.semester === '1';
  const isSemester2 = academicYear?.semester === '2';

  // State for API errors
  const [apiErrors, setApiErrors] = useState([]);

  // Fetch all groups
  const { 
    data: groupsData, 
    loading: groupsLoading,
    error: groupsError
  } = useFetch(() => groupService.getGroups({ academicYearId: academicYear?.id }), [academicYear?.id]);

  // Fetch all proposals - FIXED: Use 'all' parameter
  const { 
    data: proposalsData,
    loading: proposalsLoading,
    error: proposalsError
  } = useFetch(() => proposalService.getProposalsByDepartment('all'), []);

  // Fetch defense schedules
  const { 
    data: defenseData,
    loading: defenseLoading,
    error: defenseError
  } = useFetch(() => defenseService.getDefenseSchedules({ semester: academicYear?.semester }), [academicYear?.semester]);

  // Fetch all users for stats
  const { 
    data: usersData,
    loading: usersLoading,
    error: usersError
  } = useFetch(() => userService.getUsers(), []);

  // Fetch academic year settings
  const {
    data: settingsData,
    loading: settingsLoading,
    error: settingsError
  } = useFetch(() => academicService.getSystemSettings(), []);

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

  // Fetch final drafts - advisor approved drafts represent completed projects
  // Filter by academic year AND semester for semester-aware counting
  const {
    data: draftsData,
    loading: draftsLoading,
    error: draftsError
  } = useFetch(() => finalDraftService.getFacultyHeadDrafts(academicYear?.id, 'approved'), [academicYear?.id]);

  // Collect errors - FIXED: Added proper dependencies
  useEffect(() => {
    const errors = [];
    if (groupsError) errors.push({ api: 'Groups', error: groupsError });
    if (proposalsError) errors.push({ api: 'Proposals', error: proposalsError });
    if (defenseError) errors.push({ api: 'Defense', error: defenseError });
    if (usersError) errors.push({ api: 'Users', error: usersError });
    if (settingsError) errors.push({ api: 'Settings', error: settingsError });
    if (draftsError) errors.push({ api: 'Final Drafts', error: draftsError });

    setApiErrors(errors);

    if (errors.length > 0) {
      console.error('API Errors:', errors);
    }
  }, [groupsError, proposalsError, defenseError, usersError, settingsError, draftsError]);

  // Memoized data to prevent unnecessary re-renders
  const groups = useMemo(() => groupsData?.groups || [], [groupsData]);
  const proposals = useMemo(() => proposalsData?.proposals || [], [proposalsData]);
  const schedules = useMemo(() => defenseData?.schedules || [], [defenseData]);
  const users = useMemo(() => usersData?.users || [], [usersData]);
  const settings = useMemo(() => settingsData?.settings || {}, [settingsData]);
  const allDrafts = useMemo(() => draftsData?.drafts || [], [draftsData]);

  // Filter drafts by current semester for semester-aware completed projects count
  const drafts = useMemo(() => {
    const currentSemester = academicYear?.semester;
    return allDrafts.filter(draft => 
      draft.semester === currentSemester || 
      (currentSemester === '1' && (!draft.semester || draft.semester === 1)) ||
      (currentSemester === '2' && draft.semester === '2')
    );
  }, [allDrafts, academicYear?.semester]);

  // Calculate upcoming defenses - FIXED: Use useMemo instead of recalculating on every render
  const upcomingDefenses = useMemo(() =>
    schedules.filter(s => new Date(s.date) >= new Date()),
  [schedules]);

  // Calculate totals - FIXED: Use useMemo
  const totalGroups = groups.length;
  const totalProposals = proposals.length;
  const approvedProposals = proposals.filter(p => p.status === 'approved').length;
  // Completed projects: count of advisor-approved final drafts (from final_drafts table)
  const completedProjects = drafts.length;
  const scheduledDefenses = schedules.length;
  // Count only active students (just like in DeptDashboard)
  const totalStudents = users.filter(u => u.role === 'student' && u.status === 'active').length;
  const totalAdvisors = users.filter(u => u.role === 'advisor' && u.status === 'active').length;
  const totalDeptHeads = users.filter(u => u.role === 'dept-head').length;

  // Department stats - FIXED: Use useMemo
  const departmentStats = useMemo(() => {
    const stats = {
      cs: { groups: 0, approved: 0, completed: 0 },
      it: { groups: 0, approved: 0, completed: 0 },
      is: { groups: 0, approved: 0, completed: 0 }
    };

    groups.forEach(group => {
      const dept = group.department;
      if (dept === 'Computer Science') stats.cs.groups++;
      else if (dept === 'Information Technology') stats.it.groups++;
      else if (dept === 'Information Systems') stats.is.groups++;
    });

    proposals.forEach(proposal => {
      if (proposal.status === 'approved') {
        const dept = proposal.Group?.department;
        if (dept === 'Computer Science') stats.cs.approved++;
        else if (dept === 'Information Technology') stats.it.approved++;
        else if (dept === 'Information Systems') stats.is.approved++;
      }
    });

    // Count completed projects from final drafts (advisor-approved) by department
    drafts.forEach(draft => {
      const dept = draft.Group?.department;
      if (dept === 'Computer Science') stats.cs.completed++;
      else if (dept === 'Information Technology') stats.it.completed++;
      else if (dept === 'Information Systems') stats.is.completed++;
    });

    return stats;
  }, [groups, proposals, drafts]);

  // Department data for charts - FIXED: Use useMemo
  const departmentGroupsData = useMemo(() => [
    { name: 'CS', value: departmentStats.cs.groups },
    { name: 'IT', value: departmentStats.it.groups },
    { name: 'IS', value: departmentStats.is.groups }
  ], [departmentStats]);

  // Helper to replace section IDs in strings
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

  // Recent activities - useMemo keeps hook order stable
  const recentActivities = useMemo(() => {
    const activities = [
      ...schedules.slice(0, 2).map(s => ({
        id: `def-${s.id}`,
        type: 'calendar',
        title: 'Defense Scheduled',
        description: `${sanitizeStr(s.groupName || '')} defense on ${formatDate(s.date)}`,
        timestamp: s.createdAt || s.date,
        link: '/faculty-head/defense'
      })),
      ...drafts.slice(0, 2).map(d => ({
        id: `complete-${d.id}`,
        type: 'check-circle',
        title: 'Project Completed',
        description: `${sanitizeStr(d.Group?.name || 'Unknown Group')} completed their project`,
        timestamp: d.submittedAt,
        link: '/faculty-head/reports'
      })),
      {
        id: 'academic',
        type: 'clock',
        title: 'Academic Year Status',
        description: `Semester ${academicYear?.semester} - ${academicYear?.status}`,
        timestamp: new Date().toISOString(),
        link: '/faculty-head/academic-year'
      }
    ];

    return activities.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 5);
  }, [schedules, drafts, academicYear, sectionNameMap, sanitizeStr]);

  const ACTIVITY_STORAGE_KEY = 'FacultyDashboard_removedActivityIds';
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
    () => recentActivities.filter(activity => !removedActivityIds.includes(activity.id)),
    [recentActivities, removedActivityIds]
  );

  const handleRemoveActivity = useCallback((id) => {
    setRemovedActivityIds(prev => prev.includes(id) ? prev : [...prev, id]);
    toast.success('Activity removed from list.');
  }, []);

  // Quick actions - FIXED: Use useMemo
  const quickActions = useMemo(() => {
    if (isTerminated) {
      return [
        {
          title: 'Academic Year',
          description: 'Start a new academic year',
          icon: Settings,
          path: '/faculty-head/academic-year',
          color: 'bg-orange-500',
          urgent: true
        },
        {
          title: 'Faculty Reports',
          description: 'View archived reports',
          icon: BarChart3,
          path: '/faculty-head/reports',
          color: 'bg-purple-500',
          urgent: false
        },
        {
          title: 'Repository',
          description: 'Access project archive',
          icon: FileText,
          path: '/faculty-head/repository',
          color: 'bg-teal-500',
          urgent: false
        }
      ];
    } else {
      return [
        {
          title: 'Defense Scheduling',
          description: `${scheduledDefenses} scheduled`,
          icon: Calendar,
          path: '/faculty-head/defense',
          color: 'bg-blue-500',
          stats: scheduledDefenses,
          urgent: scheduledDefenses > 0
        },
        {
          title: 'Evaluator Assignment',
          description: 'Assign evaluators to groups',
          icon: Shield,
          path: '/faculty-head/EvaluatorManager',
          color: 'bg-purple-500',
          urgent: true
        },
        {
          title: 'Venue Management',
          description: 'Manage defense venues',
          icon: Building,
          path: '/faculty-head/venues',
          color: 'bg-green-500',
          stats: settings.venuesCount || 0
        },
        {
          title: 'Project Domains',
          description: 'Manage project categories',
          icon: FileText,
          path: '/faculty-head/domains',
          color: 'bg-indigo-500'
        },
        {
          title: 'Faculty Reports',
          description: 'Generate faculty reports',
          icon: BarChart3,
          path: '/faculty-head/reports',
          color: 'bg-teal-500'
        },
        {
          title: 'Academic Year',
          description: `Semester ${academicYear?.semester} Management`,
          icon: Clock,
          path: '/faculty-head/academic-year',
          color: 'bg-orange-500'
        }
      ];
    }
  }, [isTerminated, scheduledDefenses, groups, settings, academicYear]);

  // Show loading state
  if (groupsLoading || proposalsLoading || defenseLoading || usersLoading || settingsLoading || draftsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading faculty dashboard..." />;
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

          <div className="flex gap-3 justify-center">
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
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white shadow-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>Welcome, {user?.name}!</h1>
            <p className="text-indigo-100" style={{ fontFamily: 'Times New Roman, serif' }}>
              Faculty Head - Faculty of Informatics • {academicYear?.current} • Semester {academicYear?.semester}
              {isTerminated && <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">Terminated</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs opacity-80">Departments</p>
              <p className="text-xl font-bold">3</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs opacity-80">Groups</p>
              <p className="text-xl font-bold">{totalGroups}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs opacity-80">Students</p>
              <p className="text-xl font-bold">{totalStudents}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Approved Proposals</p>
            <p className="text-2xl font-bold">{approvedProposals}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Completed Projects</p>
            <p className="text-2xl font-bold">{completedProjects}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Scheduled Defenses</p>
            <p className="text-2xl font-bold">{scheduledDefenses}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-80">Active Advisors</p>
            <p className="text-2xl font-bold">{totalAdvisors}</p>
          </div>
        </div>
      </div>

      {/* Termination Alert */}
      {isTerminated && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4 mb-6">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">Academic Year Terminated</p>
            <p className="text-sm text-red-700">
              The system is now in read-only mode for all other roles. You can start a new academic year.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => navigate('/faculty-head/academic-year')}
          >
            Start New Year
          </Button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Total Groups"
          value={totalGroups}
          subtitle="Across all departments"
          icon={Users}
          color="blue"
          trend={totalGroups > 0 ? 'up' : 'neutral'}
          trendValue={`${Math.round((completedProjects / (totalGroups || 1)) * 100)}% completed`}
        />
        
        <MetricCard
          title="Approved Proposals"
          value={approvedProposals}
          subtitle={`${Math.round((approvedProposals / (totalProposals || 1)) * 100)}% of total`}
          icon={FileText}
          color="green"
          trend={approvedProposals > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Completed Projects"
          value={completedProjects}
          subtitle={`${Math.round((completedProjects / (totalGroups || 1)) * 100)}% completion`}
          icon={TrendingUp}
          color="purple"
          trend={completedProjects > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Scheduled Defenses"
          value={scheduledDefenses}
          subtitle={`${upcomingDefenses.length} upcoming`}
          icon={Calendar}
          color="teal"
          trend={scheduledDefenses > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(action.path)}
              className={`bg-white rounded-xl p-5 shadow-sm border transition-all group cursor-pointer hover:shadow-md ${
                action.urgent ? 'border-yellow-300 hover:border-yellow-400' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`${action.color} p-2.5 rounded-lg group-hover:scale-110 transition-transform shrink-0`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
                    {action.stats > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        action.urgent ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {action.stats}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Department Groups Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Groups by Department</h3>
            {/* Chart content */}
            <div className="h-64">
              <ReportChart
                type="bar"
                data={departmentGroupsData}
                xKey="name"
                yKey="value"
                height={220}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Activity and Stats */}
        <div className="space-y-6 h-full">
          {/* Faculty Overview */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
            <h3 className="font-semibold text-gray-900 mb-4">Faculty Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Students</span>
                <span className="font-bold text-gray-900">{totalStudents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Advisors</span>
                <span className="font-bold text-gray-900">{totalAdvisors}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Department Heads</span>
                <span className="font-bold text-gray-900">{totalDeptHeads}</span>
              </div>
              <div className="pt-4 border-t border-indigo-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Overall Completion</span>
                  <span className="font-bold text-indigo-600">
                    {Math.round((completedProjects / (totalGroups || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${(completedProjects / (totalGroups || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <ActivityTimeline
            activities={displayedActivities}
            onActivityClick={(activity) => activity.link && navigate(activity.link)}
            onRemoveActivity={handleRemoveActivity}
          />
        </div>
      </div>

    </PageContainer>
  );
};

export default FacultyDashboard;