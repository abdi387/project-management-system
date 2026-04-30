import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Shield,
  Download,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService, defenseService, userService, academicService, finalDraftService } from '../../services';
import useFetch from '../../hooks/useFetch';
import pdfService from '../../services/pdfService';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ReportChart from '../../components/reports/ReportChart';
import { formatDate, formatTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer
} from 'recharts';

// Enhanced Project Status Chart with stunning visuals
const EnhancedStatusChart = ({ data, height = 280 }) => {
  // Filter out zero values for cleaner display
  const activeData = data.filter(item => item.value > 0);
  
  if (activeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  const total = activeData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 text-sm">{data.name}</p>
          <p className="text-gray-600 text-xs mt-1">
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: data.color }}></span>
            {data.value} projects ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent }) => {
    if (value === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = name.length > 15 ? innerRadius - 20 : innerRadius - 10;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {name.length > 12 ? name.substring(0, 10) + '...' : name}
      </text>
    );
  };

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={height - 60}>
        <PieChart>
          <defs>
            {activeData.map((entry, index) => (
              <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={activeData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={85}
            innerRadius={55}
            strokeWidth={3}
            stroke="#ffffff"
            fill="#8884d8"
            dataKey="value"
          >
            {activeData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#colorGradient-${index})`}
                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
              />
            ))}
          </Pie>
          <RechartsTooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Enhanced Legend */}
      <div className="grid grid-cols-2 gap-2 px-2">
        {activeData.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
              style={{ backgroundColor: item.color }}
            ></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{item.value} projects</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FacultyReports = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedReport, setSelectedReport] = useState('comprehensive');
  const [generating, setGenerating] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch all groups filtered by academic year
  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useFetch(() => groupService.getGroups({ academicYearId: academicYear?.id }), [academicYear?.id]);

  // Fetch all proposals
  const {
    data: proposalsData,
    loading: proposalsLoading,
    error: proposalsError
  } = useFetch(() => proposalService.getProposalsByDepartment('all'), []);

  // Fetch defense schedules filtered by semester
  const {
    data: defenseData,
    loading: defenseLoading,
    error: defenseError
  } = useFetch(() => defenseService.getDefenseSchedules({ semester: academicYear?.semester }), [academicYear?.semester]);

  // Fetch all users
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError
  } = useFetch(() => userService.getUsers(), []);

  // Fetch domains
  const {
    data: domainsData,
    loading: domainsLoading,
    error: domainsError
  } = useFetch(() => academicService.getProjectDomains(), []);

  // Fetch final drafts filtered by academic year
  const {
    data: finalDraftsData,
    loading: finalDraftsLoading,
    error: finalDraftsError
  } = useFetch(() => finalDraftService.getFacultyHeadDrafts(academicYear?.id), [academicYear?.id]);

  const [departmentStats, setDepartmentStats] = useState({});
  const [domainStats, setDomainStats] = useState({});
  const [advisorWorkload, setAdvisorWorkload] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [apiErrors, setApiErrors] = useState([]);

  const groups = groupsData?.groups || [];
  const proposals = proposalsData?.proposals || [];
  const users = usersData?.users || [];
  const domains = domainsData?.domains || [];
  const finalDrafts = finalDraftsData?.drafts || [];
  
  // Filter defense schedules by academic year AND semester
  const schedules = useMemo(() => {
    const allSchedules = defenseData?.schedules || [];
    return allSchedules.filter(s => {
      // Check academic year ID
      if (s.academicYearId && currentAcademicYearId) {
        if (s.academicYearId !== currentAcademicYearId) return false;
      }
      // Check semester
      const scheduleSemester = String(s.semester || '1');
      return scheduleSemester === currentSemester;
    });
  }, [defenseData, currentAcademicYearId, currentSemester]);

  // Filter groups by academic year (include Semester 1 groups in Semester 2 since they continue)
  // In Semester 1: only show Semester 1 groups
  // In Semester 2: show ALL groups from the academic year (Semester 1 groups continue in Semester 2)
  const semesterGroups = useMemo(() => {
    return groups.filter(g => {
      // Check academic year ID
      if (g.academicYearId && currentAcademicYearId) {
        if (g.academicYearId !== currentAcademicYearId) return false;
      }
      // In Semester 1: only show Semester 1 groups
      // In Semester 2: show ALL groups (both Semester 1 and 2 groups continue working)
      if (currentSemester === '1') {
        const groupSemester = String(g.semester || '1');
        return groupSemester === '1';
      } else {
        // Semester 2: include all groups from the academic year
        return true;
      }
    });
  }, [groups, currentAcademicYearId, currentSemester]);

  // Get all group IDs for filtering proposals
  const semesterGroupIds = useMemo(() => {
    return new Set(semesterGroups.map(g => g.id));
  }, [semesterGroups]);

  // Filter proposals by academic year groups AND semester for activities
  // In Semester 1: only show Semester 1 proposals
  // In Semester 2: only show Semester 2 activities (proposals/updates from semester 2)
  const semesterProposals = useMemo(() => {
    return proposals.filter(p => {
      // Check if proposal belongs to a group in the current academic year
      if (!p.groupId || !semesterGroupIds.has(p.groupId)) return false;
      
      // Filter by semester for activities
      const proposalSemester = String(p.semester || '1');
      return proposalSemester === currentSemester;
    });
  }, [proposals, semesterGroupIds, currentSemester]);

  // Collect API errors
  useEffect(() => {
    const errors = [];
    if (groupsError) errors.push({ api: 'Groups', error: groupsError });
    if (proposalsError) errors.push({ api: 'Proposals', error: proposalsError });
    if (defenseError) errors.push({ api: 'Defense', error: defenseError });
    if (usersError) errors.push({ api: 'Users', error: usersError });
    if (domainsError) errors.push({ api: 'Domains', error: domainsError });
    if (finalDraftsError) errors.push({ api: 'Final Drafts', error: finalDraftsError });
    setApiErrors(errors);
  }, [groupsError, proposalsError, defenseError, usersError, domainsError, finalDraftsError]);

  // Calculate comprehensive statistics (semester-aware)
  useEffect(() => {
    if (!semesterGroups.length || !users.length) {
      return;
    }

    // Department statistics - using semesterGroups
    const deptStats = {
      'Computer Science': { groups: 0, completed: 0, students: 0, advisors: 0 },
      'Information Technology': { groups: 0, completed: 0, students: 0, advisors: 0 },
      'Information Systems': { groups: 0, completed: 0, students: 0, advisors: 0 }
    };

    semesterGroups.forEach(group => {
      if (deptStats[group.department]) {
        deptStats[group.department].groups++;
      }
    });

    // Count completed projects from final drafts that are advisor-approved for the current semester
    const semesterFinalDrafts = finalDrafts.filter(d =>
      String(d.semester) === String(currentSemester) &&
      d.advisorStatus === 'approved'
    );

    // Map drafts to their group's department
    semesterFinalDrafts.forEach(draft => {
      const group = groups.find(g => g.id === draft.groupId);
      if (group && deptStats[group.department]) {
        deptStats[group.department].completed++;
      }
    });

    users.forEach(user => {
      if (user.role === 'student' && user.status === 'active' && deptStats[user.department]) {
        deptStats[user.department].students++;
      }
      if (user.role === 'advisor' && user.status === 'active' && deptStats[user.department]) {
        deptStats[user.department].advisors++;
      }
    });

    setDepartmentStats(deptStats);

    // Domain statistics - include ALL proposals from academic year (Semester 1 proposals carry to Semester 2)
    const domainCount = {};
    proposals.forEach(proposal => {
      // Only count proposals from groups in the current academic year
      if (!proposal.groupId || !semesterGroupIds.has(proposal.groupId)) return;
      
      if (proposal.status === 'approved' && proposal.Titles) {
        const approvedTitle = proposal.Titles.find(t => t.titleIndex === proposal.approvedTitleIndex);
        if (approvedTitle?.Domain?.name) {
          const domain = approvedTitle.Domain.name;
          domainCount[domain] = (domainCount[domain] || 0) + 1;
        }
      }
    });
    console.log('[FacultyReports] Domain stats for academic year', currentAcademicYearId, ':', domainCount);
    setDomainStats(domainCount);

    // Advisor workload - using semesterGroups
    const advisors = users.filter(u => u.role === 'advisor' && u.status === 'active');
    const workload = advisors.map(advisor => ({
      name: advisor.name,
      department: advisor.department,
      groups: semesterGroups.filter(g => g.advisorId === advisor.id).length,
      maxGroups: 5
    })).sort((a, b) => b.groups - a.groups);
    setAdvisorWorkload(workload);

    // Prepare report data - using semesterGroups and semesterProposals
    const totalGroups = semesterGroups.length;
    const totalStudents = users.filter(u => u.role === 'student' && u.status === 'active').length;
    const approvedProposals = semesterProposals.filter(p => p.status === 'approved').length;

    // In Semester 2: count completed projects from Semester 2 approved final drafts only
    // In Semester 1: count groups with advisor-approved or fully-approved final draft status
    const completedProjects = currentSemester === '2'
      ? finalDrafts.filter(d => String(d.semester) === '2' && d.advisorStatus === 'approved').length
      : semesterGroups.filter(g => g.finalDraftStatus === 'advisor-approved' || g.finalDraftStatus === 'fully-approved').length;

    const departments = ['Computer Science', 'Information Technology', 'Information Systems'].map(name => ({
      name,
      totalGroups: semesterGroups.filter(g => g.department === name).length,
      approvedProposals: semesterProposals.filter(p => p.Group?.department === name && p.status === 'approved').length,
      // In Semester 2: count completed from Semester 2 final drafts only, grouped by group's department
      completedProjects: currentSemester === '2'
        ? finalDrafts.filter(d =>
            String(d.semester) === '2' &&
            d.advisorStatus === 'approved' &&
            d.Group?.department === name
          ).length
        : semesterGroups.filter(g => g.department === name && (g.finalDraftStatus === 'advisor-approved' || g.finalDraftStatus === 'fully-approved')).length,
      advisorCount: users.filter(u => u.role === 'advisor' && u.status === 'active' && u.department === name).length
    }));

    setReportData({
      totalGroups,
      totalStudents,
      approvedProposals,
      completedProjects,
      totalDepartments: 3,
      academicYear: academicYear?.current,
      semester: currentSemester,
      departments,
      schedules: schedules.map(s => ({
        ...s,
        time: formatTime(s.time)
      }))
    });

  }, [semesterGroups, users, semesterProposals, academicYear, currentSemester, finalDrafts, schedules]);

  // Calculate totals (semester-aware)
  const totalGroups = semesterGroups.length;
  const totalStudents = users.filter(u => u.role === 'student' && u.status === 'active').length;
  const totalAdvisors = users.filter(u => u.role === 'advisor' && u.status === 'active').length;
  const totalDeptHeads = users.filter(u => u.role === 'dept-head').length;
  // In Semester 2: count completed from Semester 2 approved final drafts only
  // In Semester 1: count groups with advisor-approved or fully-approved final draft status
  const completedProjects = currentSemester === '2'
    ? finalDrafts.filter(d => String(d.semester) === '2' && d.advisorStatus === 'approved').length
    : semesterGroups.filter(g => g.finalDraftStatus === 'advisor-approved' || g.finalDraftStatus === 'fully-approved').length;
  const approvedProposals = semesterProposals.filter(p => p.status === 'approved').length;
  const scheduledDefenses = schedules.length;
  const completionRate = totalGroups > 0 ? Math.round((completedProjects / totalGroups) * 100) : 0;

  // Chart data (semester-aware)
  const departmentGroupsData = Object.entries(departmentStats).map(([name, stats]) => ({
    name: name.split(' ').map(w => w[0]).join(''),
    groups: stats.groups,
    completed: stats.completed
  }));

  const domainChartData = Object.entries(domainStats).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 12) + '...' : name,
    value
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  // Enhanced Project Status data - count by final draft status
  const advisorApprovedCount = semesterGroups.filter(g => 
    g.finalDraftStatus === 'advisor-approved'
  ).length;
  
  const fullyApprovedCount = semesterGroups.filter(g => 
    g.finalDraftStatus === 'fully-approved'
  ).length;
  
  const submittedCount = semesterGroups.filter(g => 
    g.finalDraftStatus === 'submitted'
  ).length;
  
  const notSubmittedCount = semesterGroups.filter(g => 
    g.finalDraftStatus === 'not-submitted' || !g.finalDraftStatus
  ).length;

  const statusData = [
    { name: 'Fully Approved', value: fullyApprovedCount, color: '#10B981' },
    { name: 'Advisor Approved', value: advisorApprovedCount, color: '#3B82F6' },
    { name: 'Submitted', value: submittedCount, color: '#F59E0B' },
    { name: 'Not Submitted', value: notSubmittedCount, color: '#EF4444' }
  ];

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      if (!reportData || semesterGroups.length === 0) {
        toast.error('No data to export');
        return;
      }

      const doc = pdfService.generateFacultyReport(
        'Faculty of Informatics',
        reportData,
        departmentStats,
        domainStats,
        statusData,
        currentSemester
      );
      const filename = `Faculty_Report_${academicYear?.current?.replace('/', '-')}_Sem${currentSemester}_${new Date().toISOString().split('T')[0]}`;
      pdfService.downloadPDF(doc, filename);
      toast.success('PDF report exported successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (groupsLoading || proposalsLoading || defenseLoading || usersLoading || domainsLoading || finalDraftsLoading) {
    return <LoadingSpinner fullScreen text="Generating reports..." />;
  }

  if (apiErrors.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Error Loading Reports</h2>
          <p className="text-gray-600 text-center mb-6">Failed to fetch data from server</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stunning Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 shadow-2xl">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <BarChart3 className="w-4 h-4" />
                <span>Faculty Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Faculty Reports</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
                Faculty Reports
              </h1>
            </div>
          </div>
        </div>
      </div>
      {/* No Data Banner */}
      {semesterGroups.length === 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-800 font-semibold">No Groups Found for Semester {currentSemester}</h3>
              <p className="text-amber-700 text-sm mt-1">
                There are no project groups registered for Semester {currentSemester}.
                Reports and charts will be empty until groups are created.
              </p>
              <p className="text-amber-600 text-xs mt-2">
                💡 Tip: Go to the department head panel to generate groups for this semester.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPDF}
          disabled={!reportData || semesterGroups.length === 0 || exportLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold"
        >
          <Download className="w-5 h-5" />
          <span>{exportLoading ? 'Generating...' : 'Export Report PDF'}</span>
        </button>
      </div>

      {/* Report Controls - Removed */}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="group bg-white rounded-xl border-l-4 border-blue-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalGroups}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Groups</div>
          <div className="text-xs text-gray-500 mt-2">Semester {currentSemester}</div>
        </div>

        <div className="group bg-white rounded-xl border-l-4 border-green-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalStudents}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Students</div>
          <div className="text-xs text-gray-500 mt-2">Active students</div>
        </div>

        <div className="group bg-white rounded-xl border-l-4 border-orange-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{scheduledDefenses}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Scheduled Defenses</div>
          <div className="text-xs text-gray-500 mt-2">Semester {currentSemester}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Department Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Progress</h3>
          <div className="h-64">
            {semesterGroups.length > 0 && departmentGroupsData.length > 0 ? (
              <ReportChart
                type="bar"
                data={departmentGroupsData}
                xKey="name"
                dataKeys={['groups', 'completed']}
                height={220}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-gray-500">No department data available for Semester {currentSemester}</p>
                  <p className="text-sm text-gray-400 mt-2">Total groups: {semesterGroups.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project Status - Only show in Semester 1 */}
        {currentSemester === '1' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status</h3>
            <div className="h-80">
              {semesterGroups.length > 0 && statusData.some(s => s.value > 0) ? (
                <EnhancedStatusChart data={statusData} height={280} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500">No status data available for Semester {currentSemester}</p>
                    <p className="text-sm text-gray-400 mt-2">Create groups to see project status</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Second Charts Row - Conditional based on Semester */}
      {currentSemester === '1' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Domain Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Domains</h3>
            <div className="h-64">
              {domainChartData.length > 0 ? (
                <ReportChart
                  type="bar"
                  data={domainChartData}
                  xKey="name"
                  yKey="value"
                  height={220}
                  barCategoryGap="10%"
                  barGap={2}
                  barSize={12}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500">No domain data available</p>
                    <p className="text-sm text-gray-400 mt-2">Approved proposals with domains will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Completion Metrics - REMOVED */}
        </div>
      )}

      {/* Semester 2 - Domain Distribution Only */}
      {currentSemester === '2' && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          {/* Domain Distribution - Shows ALL domains from academic year */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Domains (Academic Year)</h3>
            <div className="h-64">
              {domainChartData.length > 0 ? (
                <ReportChart
                  type="bar"
                  data={domainChartData}
                  xKey="name"
                  yKey="value"
                  height={220}
                  barCategoryGap="10%"
                  barGap={2}
                  barSize={12}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500">No domain data available</p>
                    <p className="text-sm text-gray-400 mt-2">Approved proposals with domains will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Department Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Department Summary</h2>
                <p className="text-sm text-white/70 mt-0.5">Overview by department</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(departmentStats).map(([name, stats], index) => (
              <div
                key={name}
                className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className={`relative px-5 py-4 ${
                  index === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                  index === 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                  'bg-gradient-to-r from-teal-500 to-teal-600'
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative z-10">
                    <h3 className="text-base font-bold text-white">{name}</h3>
                    <p className="text-xs text-white/80 mt-0.5">Department Overview</p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 font-medium">Groups</p>
                      <p className="text-xl font-bold text-blue-700">{stats.groups}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600 font-medium">Completed</p>
                      <p className="text-xl font-bold text-green-700">{stats.completed}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-purple-600 font-medium">Students</p>
                      <p className="text-xl font-bold text-purple-700">{stats.students}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-orange-600 font-medium">Advisors</p>
                      <p className="text-xl font-bold text-orange-700">{stats.advisors}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Defense Schedule */}
      {schedules.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Upcoming Defense Schedule</h2>
                  <p className="text-sm text-white/70 mt-0.5">Semester {currentSemester} defenses</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.filter(s => {
                const scheduleSemester = s.semester?.toString() || '1';
                return scheduleSemester === currentSemester;
              }).slice(0, 10).map((schedule, index) => (
                <div
                  key={schedule.id}
                  className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className="relative bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{schedule.groupName}</h3>
                          <p className="text-xs text-white/80">{schedule.department}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <span className="text-xs font-medium text-white">{formatTime(schedule.time)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium">Date</p>
                        <p className="text-sm font-bold text-blue-700">{formatDate(schedule.date)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-purple-600 font-medium">Venue</p>
                        <p className="text-sm font-bold text-purple-700">{schedule.venue}</p>
                      </div>
                    </div>

                    {/* Evaluators */}
                    {schedule.evaluators && schedule.evaluators.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Evaluators ({schedule.evaluators.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {schedule.evaluators.map(e => (
                            <span
                              key={e.id}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full text-xs font-medium text-gray-800 hover:from-indigo-100 hover:to-purple-100 transition-all duration-200"
                            >
                              {e.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {groups.length === 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-center">
            No data available for report generation. Please ensure there are groups and proposals in the system.
          </p>
        </div>
      )}
    </div>
  );
};

export default FacultyReports;