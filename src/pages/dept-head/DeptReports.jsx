import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Calendar, BarChart as BarChartIcon, PieChart as PieChartIcon, Users, TrendingUp, Activity, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService, defenseService, userService, progressService, finalDraftService } from '../../services';
import pdfService from '../../services/pdfService';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line, LineChart,
  RadialBarChart, RadialBar
} from 'recharts';
import toast from 'react-hot-toast';

// Enhanced Milestone Tracker Chart with stunning visuals
const EnhancedMilestoneChart = ({ data, height = 400 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No milestone data available
      </div>
    );
  }

  const CustomMilestoneTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
          <p className="text-gray-600 text-xs mt-1">
            {item.value} projects ({item.percentage}%)
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div 
              className="h-1.5 rounded-full" 
              style={{ backgroundColor: item.fill, width: `${item.percentage}%` }}
            ></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 overflow-y-auto" style={{ maxHeight: `${height}px` }}>
      {/* Radial Progress Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <div key={index} className="relative">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow border border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={item.fill}
                      strokeWidth="2.5"
                      strokeDasharray={`${item.percentage}, 100`}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  </div>
                </div>
                <div className="text-center w-full">
                  <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.percentage}% of total</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress Bar Summary */}
      <div className="space-y-3 px-1">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Detailed Progress</h4>
        {data.map((item, index) => (
          <div key={`progress-${index}`} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.fill }}></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-800 truncate">{item.name}</span>
                <span className="text-xs font-semibold text-gray-600 ml-2">{item.value} ({item.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-2.5 rounded-full transition-all duration-700 ease-out" 
                  style={{ 
                    backgroundColor: item.fill, 
                    width: `${item.percentage}%`,
                    boxShadow: `0 0 8px ${item.fill}40`
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Department Health Chart with stunning KPI visualization
const EnhancedHealthChart = ({ data, height = 450 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No health data available
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto pr-1" style={{ maxHeight: `${height}px` }}>
      {/* Circular Progress Indicators */}
      <div className="grid grid-cols-3 gap-3">
        {data.map((item, index) => (
          <div 
            key={index}
            className="relative group"
          >
            <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
              item.status === 'excellent' ? 'border-emerald-200' :
              item.status === 'good' ? 'border-blue-200' :
              'border-amber-200'
            }`}>
              {/* Circular Progress */}
              <div className="relative w-14 h-14 mx-auto mb-2">
                <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="2.5"
                  />
                  {/* Progress circle */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2.5"
                    strokeDasharray={`${item.value}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-gray-900">{item.value}%</span>
                </div>
              </div>
              
              {/* Metric info */}
              <div className="text-center">
                <div className="text-base mb-0.5">{item.icon}</div>
                <p className="text-[10px] font-semibold text-gray-800 mb-0.5 truncate leading-tight">{item.metric}</p>
                <p className="text-[10px] text-gray-500">{item.count}/{item.total}</p>
              </div>
              
              {/* Status badge */}
              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                item.status === 'excellent' ? 'bg-emerald-500' :
                item.status === 'good' ? 'bg-blue-500' :
                'bg-amber-500'
              }`}>
                <span className="text-white text-[10px]">
                  {item.status === 'excellent' ? '✓' : item.status === 'good' ? '●' : '!'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Overall Health Score */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Overall Health Score</span>
          <span className="text-sm font-bold text-indigo-600">
            {Math.round(data.reduce((acc, item) => acc + item.value, 0) / data.length)}%
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-3 overflow-hidden">
          <div 
            className="h-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000"
            style={{ 
              width: `${Math.round(data.reduce((acc, item) => acc + item.value, 0) / data.length)}%`
            }}
          ></div>
        </div>
      </div>
      
      {/* Quick Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
          <p className="text-sm font-bold text-emerald-600">
            {data.filter(d => d.status === 'excellent').length}
          </p>
          <p className="text-[10px] text-emerald-700 font-medium">Excellent</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
          <p className="text-sm font-bold text-blue-600">
            {data.filter(d => d.status === 'good').length}
          </p>
          <p className="text-[10px] text-blue-700 font-medium">Good</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
          <p className="text-sm font-bold text-amber-600">
            {data.filter(d => d.status === 'needs-attention').length}
          </p>
          <p className="text-[10px] text-amber-700 font-medium">Needs Work</p>
        </div>
      </div>
    </div>
  );
};

const DeptReports = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const department = user?.department;
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  // Use current semester from academic year (no manual selection)
  const selectedSemester = currentSemester;

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const past = new Date();
    past.setMonth(today.getMonth() - 6);
    return {
      start: past.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });

  // Fetch groups - filtered by academic year
  const {
    data: groupsData,
    loading: groupsLoading
  } = useFetch(() => groupService.getGroups({
    department,
    academicYearId: currentAcademicYearId
  }), [department, currentAcademicYearId]);

  // Fetch proposals - all proposals for the department
  const {
    data: proposalsData,
    loading: proposalsLoading
  } = useFetch(() => proposalService.getProposalsByDepartment(department), [department]);

  // Fetch defense schedules - all schedules for the department (we'll filter by semester locally)
  const {
    data: defenseData,
    loading: defenseLoading
  } = useFetch(() => defenseService.getDefenseSchedules({
    department
  }), [department]);

  // Filter all data by current academic year AND selected semester
  const allGroups = groupsData?.groups || [];
  const allProposals = proposalsData?.proposals || [];
  const allSchedules = defenseData?.schedules || [];

  // Fetch final drafts for the department
  const {
    data: finalDraftsData,
    loading: finalDraftsLoading
  } = useFetch(() => finalDraftService.getDepartmentDrafts(department, currentAcademicYearId), [department, currentAcademicYearId]);

  const allFinalDrafts = finalDraftsData?.drafts || [];

  // Fetch all progress reports for the department
  const [allProgressReports, setAllProgressReports] = useState([]);
  const [progressReportsLoading, setProgressReportsLoading] = useState(false);

  useEffect(() => {
    const fetchProgressReports = async () => {
      if (!allGroups.length) return;
      setProgressReportsLoading(true);
      try {
        const promises = allGroups.map(g =>
          progressService.getProgressReportsByGroup?.(g.id)
            .then(res => res.reports || res || [])
            .catch(() => [])
        );
        const results = await Promise.all(promises);
        setAllProgressReports(results.flat());
      } catch (error) {
        console.error('Failed to fetch progress reports:', error);
      } finally {
        setProgressReportsLoading(false);
      }
    };
    fetchProgressReports();
  }, [allGroups]);

  // Filter groups by academic year (NOT by semester - groups belong to academic year)
  const groups = useMemo(() => {
    return allGroups.filter(g => {
      return g.academicYearId === currentAcademicYearId;
    });
  }, [allGroups, currentAcademicYearId]);

  // Filter proposals by academic year (NOT by semester)
  const proposals = useMemo(() => {
    return allProposals.filter(p => {
      return p.academicYearId === currentAcademicYearId;
    });
  }, [allProposals, currentAcademicYearId]);

  // Filter schedules by academic year AND selected semester (defenses ARE semester-specific)
  const schedules = useMemo(() => {
    return allSchedules.filter(s => {
      const matchesAcademicYear = s.academicYearId === currentAcademicYearId;
      const scheduleSemester = s.semester?.toString() || '1';
      const matchesSemester = scheduleSemester === selectedSemester;
      return matchesAcademicYear && matchesSemester;
    });
  }, [allSchedules, currentAcademicYearId, selectedSemester]);

  // Derive advisors from the groups data to ensure consistency
  const advisors = useMemo(() => {
    if (!groups) return [];
    const advisorMap = new Map();
    groups.forEach(group => {
      if (group.Advisor && group.Advisor.id && !advisorMap.has(group.Advisor.id)) {
        advisorMap.set(group.Advisor.id, group.Advisor);
      }
    });
    return Array.from(advisorMap.values());
  }, [groups]);

  // --- Filter groups based on date range ---
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);

    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    return groups.filter(g => {
      const createdDate = new Date(g.createdAt);
      return createdDate >= start && createdDate <= end;
    });
  }, [groups, dateRange]);

  // --- Filter data based on date range for dynamic charts ---
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0); // Start of the day

    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999); // End of the day

    return proposals.filter(p => {
      const submittedDate = new Date(p.submittedAt);
      return submittedDate >= start && submittedDate <= end;
    });
  }, [proposals, dateRange]);

  // --- Filter progress reports by semester ---
  const progressReports = useMemo(() => {
    if (!groups) return [];
    // This would require fetching progress reports - for now we'll calculate from groups
    return groups.filter(g => g.progressStatus === 'in-progress' || g.progressStatus === 'submitted');
  }, [groups]);

  // --- Filter final drafts by semester ---
  const finalDrafts = useMemo(() => {
    if (!groups) return [];
    return groups.filter(g => 
      g.finalDraftStatus === 'submitted' || 
      g.finalDraftStatus === 'advisor-approved' || 
      g.finalDraftStatus === 'fully-approved'
    );
  }, [groups]);

  // --- Chart Data Preparation ---
  const proposalStatusData = useMemo(() => {
    const approved = filteredProposals.filter(p => p.status === 'approved').length;
    const pending = filteredProposals.filter(p => p.status === 'pending').length;
    const rejected = filteredProposals.filter(p => p.status === 'rejected').length;
    return [
      { name: 'Approved', value: approved },
      { name: 'Pending', value: pending },
      { name: 'Rejected', value: rejected },
    ].filter(item => item.value > 0);
  }, [filteredProposals]);

  const advisorWorkloadData = useMemo(() => {
    return advisors
      .map(advisor => ({
        name: advisor.name.split(' ')[0], // Use first name for brevity
        groups: filteredGroups.filter(g => g.advisorId === advisor.id).length,
      }))
      .filter(item => item.groups > 0)
      .sort((a, b) => b.groups - a.groups);
  }, [advisors, filteredGroups]);

  const groupProgressData = useMemo(() => {
    const total = filteredGroups.length;
    const withProposal = filteredGroups.filter(g => g.proposalStatus && g.proposalStatus !== 'not-submitted').length;
    const approved = filteredGroups.filter(g => g.proposalStatus === 'approved').length;
    const withAdvisor = filteredGroups.filter(g => g.advisorId).length;
    const completed = filteredGroups.filter(g => g.finalDraftStatus === 'fully-approved').length;
    return [
      { name: 'Total Groups', value: total, fill: '#3b82f6' },
      { name: 'Submitted Proposal', value: withProposal, fill: '#8b5cf6' },
      { name: 'Approved Proposal', value: approved, fill: '#10b981' },
      { name: 'Advisor Assigned', value: withAdvisor, fill: '#f97316' },
      { name: 'Completed', value: completed, fill: '#14b8a6' },
    ];
  }, [filteredGroups]);

  // --- New: Monthly Activity Trends ---
  const monthlyTrendsData = useMemo(() => {
    if (!filteredGroups || !filteredProposals) return [];
    
    const months = {};

    filteredGroups.forEach(g => {
      if (!g.createdAt) return;
      const date = new Date(g.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { name: key, groups: 0, proposals: 0 };
      months[key].groups++;
    });

    filteredProposals.forEach(p => {
      if (!p.submittedAt) return;
      const date = new Date(p.submittedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { name: key, groups: 0, proposals: 0 };
      months[key].proposals++;
    });

    return Object.values(months).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredGroups, filteredProposals]);

  // --- New: Average CGPA vs Status ---
  const cgpaAnalysisData = useMemo(() => {
    const statusGroups = {
      'Pending': [],
      'Approved': [],
      'Completed': []
    };

    filteredGroups.forEach(g => {
      const avgCgpa = g.Members?.reduce((acc, m) => acc + (parseFloat(m.cgpa) || 0), 0) / (g.Members?.length || 1);
      if (g.finalDraftStatus === 'fully-approved') statusGroups['Completed'].push(avgCgpa);
      else if (g.proposalStatus === 'approved') statusGroups['Approved'].push(avgCgpa);
      else statusGroups['Pending'].push(avgCgpa);
    });

    return Object.keys(statusGroups).map(status => ({
      name: status,
      avgCgpa: statusGroups[status].length ? (statusGroups[status].reduce((a, b) => a + b, 0) / statusGroups[status].length).toFixed(2) : 0,
      count: statusGroups[status].length
    }));
  }, [filteredGroups]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  // --- Enhanced: Project Milestone Tracker (for both semesters) ---
  const milestoneTrackerData = useMemo(() => {
    if (!groups || groups.length === 0) return [];

    const total = groups.length;
    
    const milestones = [
      { 
        name: 'Proposals Approved', 
        value: groups.filter(g => g.proposalStatus === 'approved').length,
        fill: '#10b981'
      },
      { 
        name: 'Advisor Assigned', 
        value: groups.filter(g => g.advisorId).length,
        fill: '#3b82f6'
      },
      { 
        name: 'Progress In-Progress', 
        value: groups.filter(g => g.progressStatus === 'in-progress').length,
        fill: '#8b5cf6'
      },
      { 
        name: 'Final Draft Submitted', 
        value: groups.filter(g => g.finalDraftStatus === 'submitted').length,
        fill: '#f59e0b'
      },
      { 
        name: 'Advisor Approved', 
        value: groups.filter(g => g.finalDraftStatus === 'advisor-approved').length,
        fill: '#06b6d4'
      },
      { 
        name: 'Ready for Defense', 
        value: groups.filter(g => g.isReadyForDefense === true).length,
        fill: '#ec4899'
      }
    ].map(milestone => ({
      ...milestone,
      percentage: total > 0 ? Math.round((milestone.value / total) * 100) : 0
    })).filter(m => m.value > 0);

    return milestones;
  }, [groups]);

  // --- Semester 2 Specific: Progress Report Status ---
  const progressReportStatusData = useMemo(() => {
    if (selectedSemester !== '2') return [];

    // Count groups with submitted progress reports
    // Use groups which is already filtered by semester
    const submitted = groups.filter(g => 
      g.progressStatus === 'submitted' || g.progressStatus === 'reviewed'
    ).length;
    const inProgress = groups.filter(g => g.progressStatus === 'in-progress').length;
    const notStarted = groups.filter(g => 
      !g.progressStatus || 
      g.progressStatus === 'not-started' || 
      g.progressStatus === 'not_submitted'
    ).length;

    return [
      { name: 'Submitted', value: submitted, fill: '#10b981' },
      { name: 'In Progress', value: inProgress, fill: '#f59e0b' },
      { name: 'Not Started', value: notStarted, fill: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [groups, selectedSemester]);

  // --- Semester 2 Specific: Final Draft Status ---
  const finalDraftStatusData = useMemo(() => {
    if (selectedSemester !== '2') return [];
    if (!groups || groups.length === 0) return [];

    // Count ONLY final drafts approved in Semester 2
    const semester2ApprovedDrafts = allFinalDrafts.filter(d =>
      String(d.semester) === '2' &&
      d.advisorStatus === 'approved'
    );

    const notSubmitted = groups.filter(g =>
      String(g.semester) === '2' &&
      (!g.finalDraftStatus ||
      g.finalDraftStatus === 'not-submitted' ||
      g.finalDraftStatus === 'not_started')
    ).length;

    return [
      { name: 'Advisor Approved (Sem 2)', value: semester2ApprovedDrafts.length, fill: '#10b981' },
      { name: 'Not Submitted', value: notSubmitted, fill: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [groups, selectedSemester, allFinalDrafts]);

  // --- Semester 2 Specific: Project Completion Timeline ---
  const completionTimelineData = useMemo(() => {
    if (selectedSemester !== '2') return [];
    if (!groups || groups.length === 0) return [];

    // Track cumulative progress by month based on updatedAt
    const timeline = {};

    groups.forEach(g => {
      if (!g.updatedAt) return;
      const date = new Date(g.updatedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!timeline[key]) timeline[key] = { name: key, submitted: 0, advisorApproved: 0 };

      // Count based on current status
      if (g.finalDraftStatus === 'submitted') {
        timeline[key].submitted++;
      } else if (g.finalDraftStatus === 'advisor-approved') {
        timeline[key].advisorApproved++;
      }
    });

    return Object.values(timeline).sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, selectedSemester]);

  // --- Semester 2: Project Progress Timeline Aggregation ---
  const progressTimelineData = useMemo(() => {
    if (selectedSemester !== '2' || !allProgressReports || allProgressReports.length === 0) return [];

    const reports = Array.isArray(allProgressReports) ? allProgressReports.flat() : [];
    const year = currentAcademicYearId;
    const monthlyData = {};

    reports.forEach(report => {
      if (!report.submittedAt) return;
      if (String(report.semester) !== '2') return;
      if (report.academicYearId !== year) return;

      const date = new Date(report.submittedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: key,
          reportCount: 0,
          groupIds: new Set()
        };
      }

      monthlyData[key].reportCount++;
      if (report.groupId) monthlyData[key].groupIds.add(report.groupId);
    });

    return Object.values(monthlyData)
      .map(item => ({
        month: item.month,
        reportCount: item.reportCount,
        uniqueGroups: item.groupIds.size
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allProgressReports, selectedSemester, currentAcademicYearId]);

  const semester2GroupCount = useMemo(() => {
    if (selectedSemester !== '2' || !allProgressReports || allProgressReports.length === 0) return 0;

    const reports = Array.isArray(allProgressReports) ? allProgressReports.flat() : [];
    const year = currentAcademicYearId;
    const reportGroupSet = new Set();

    reports.forEach(report => {
      if (!report.submittedAt) return;
      if (String(report.semester) !== '2') return;
      if (report.academicYearId !== year) return;
      if (report.groupId) reportGroupSet.add(report.groupId);
    });

    return reportGroupSet.size;
  }, [allProgressReports, selectedSemester, currentAcademicYearId]);

  // --- Enhanced: Department Health Dashboard (for both semesters) ---
  const departmentHealthData = useMemo(() => {
    if (!groups || groups.length === 0) return [];

    const total = groups.length;
    
    // Calculate key health metrics
    const proposalApprovalRate = total > 0 
      ? Math.round((groups.filter(g => g.proposalStatus === 'approved').length / total) * 100)
      : 0;
    
    const advisorAssignmentRate = total > 0
      ? Math.round((groups.filter(g => g.advisorId).length / total) * 100)
      : 0;
    
    const activeProgressRate = total > 0
      ? Math.round((groups.filter(g => g.progressStatus === 'in-progress').length / total) * 100)
      : 0;
    
    const draftSubmissionRate = total > 0
      ? Math.round((groups.filter(g => 
          g.finalDraftStatus === 'submitted' || 
          g.finalDraftStatus === 'advisor-approved' ||
          g.finalDraftStatus === 'fully-approved'
        ).length / total) * 100)
      : 0;
    
    const advisorApprovalRate = total > 0
      ? Math.round((groups.filter(g => 
          g.finalDraftStatus === 'advisor-approved' ||
          g.finalDraftStatus === 'fully-approved'
        ).length / total) * 100)
      : 0;
    
    const defenseReadinessRate = total > 0
      ? Math.round((groups.filter(g => g.isReadyForDefense === true).length / total) * 100)
      : 0;

    return [
      {
        metric: 'Proposal Approval',
        value: proposalApprovalRate,
        count: groups.filter(g => g.proposalStatus === 'approved').length,
        total,
        color: '#10b981',
        icon: '✓',
        status: proposalApprovalRate >= 80 ? 'excellent' : proposalApprovalRate >= 60 ? 'good' : 'needs-attention'
      },
      {
        metric: 'Advisor Assignment',
        value: advisorAssignmentRate,
        count: groups.filter(g => g.advisorId).length,
        total,
        color: '#3b82f6',
        icon: '👤',
        status: advisorAssignmentRate >= 90 ? 'excellent' : advisorAssignmentRate >= 70 ? 'good' : 'needs-attention'
      },
      {
        metric: 'Active Progress',
        value: activeProgressRate,
        count: groups.filter(g => g.progressStatus === 'in-progress').length,
        total,
        color: '#8b5cf6',
        icon: '⚡',
        status: activeProgressRate >= 50 ? 'excellent' : activeProgressRate >= 30 ? 'good' : 'needs-attention'
      },
      {
        metric: 'Draft Submissions',
        value: draftSubmissionRate,
        count: groups.filter(g => 
          g.finalDraftStatus === 'submitted' || 
          g.finalDraftStatus === 'advisor-approved' ||
          g.finalDraftStatus === 'fully-approved'
        ).length,
        total,
        color: '#f59e0b',
        icon: '📄',
        status: draftSubmissionRate >= 60 ? 'excellent' : draftSubmissionRate >= 40 ? 'good' : 'needs-attention'
      },
      {
        metric: 'Advisor Approval',
        value: advisorApprovalRate,
        count: groups.filter(g => 
          g.finalDraftStatus === 'advisor-approved' ||
          g.finalDraftStatus === 'fully-approved'
        ).length,
        total,
        color: '#06b6d4',
        icon: '⭐',
        status: advisorApprovalRate >= 50 ? 'excellent' : advisorApprovalRate >= 30 ? 'good' : 'needs-attention'
      },
      {
        metric: 'Defense Readiness',
        value: defenseReadinessRate,
        count: groups.filter(g => g.isReadyForDefense === true).length,
        total,
        color: '#ec4899',
        icon: '🎯',
        status: defenseReadinessRate >= 40 ? 'excellent' : defenseReadinessRate >= 20 ? 'good' : 'needs-attention'
      }
    ];
  }, [groups]);

  // --- Semester 2 Specific: Weekly Progress Activity ---
  const weeklyProgressData = useMemo(() => {
    if (selectedSemester !== '2') return [];
    if (!groups || groups.length === 0) return [];
    
    const weeks = {};
    const now = new Date();
    
    groups.forEach(g => {
      if (!g.updatedAt) return;
      const updateDate = new Date(g.updatedAt);
      const weekDiff = Math.floor(Math.abs(now - updateDate) / (7 * 24 * 60 * 60 * 1000));
      const weekKey = `Week ${Math.max(1, 8 - Math.min(weekDiff, 7))}`;
      
      if (!weeks[weekKey]) weeks[weekKey] = { week: weekKey, approved: 0, submitted: 0, inProgress: 0 };

      if (g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved') {
        weeks[weekKey].approved++;
      } else if (g.finalDraftStatus === 'submitted') {
        weeks[weekKey].submitted++;
      } else if (g.progressStatus === 'in-progress') {
        weeks[weekKey].inProgress++;
      }
    });

    return Object.values(weeks).sort((a, b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]));
  }, [groups, selectedSemester]);

  // --- Semester 2 Specific: Status Distribution (Stacked) ---
  const statusDistributionData = useMemo(() => {
    if (selectedSemester !== '2') return [];

    const total = groups.length;
    if (total === 0) return [];

    const progressSubmitted = groups.filter(g => g.progressStatus === 'submitted').length;
    const progressInProgress = groups.filter(g => g.progressStatus === 'in-progress').length;
    const progressNotStarted = groups.filter(g => 
      !g.progressStatus || 
      g.progressStatus === 'not-started' ||
      g.progressStatus === 'not_submitted'
    ).length;

    const draftApproved = groups.filter(g => g.finalDraftStatus === 'fully-approved').length;
    const draftAdvisorApproved = groups.filter(g => g.finalDraftStatus === 'advisor-approved').length;
    const draftSubmitted = groups.filter(g => g.finalDraftStatus === 'submitted').length;
    const draftNotSubmitted = groups.filter(g => 
      !g.finalDraftStatus || 
      g.finalDraftStatus === 'not-submitted'
    ).length;

    const defenseScheduled = schedules.length;
    const readyForDefense = groups.filter(g => 
      g.finalDraftStatus === 'fully-approved' && 
      !schedules.find(s => s.groupId === g.id)
    ).length;

    return [
      { category: 'Progress Reports', submitted: progressSubmitted, inProgress: progressInProgress, notStarted: progressNotStarted },
      { category: 'Final Drafts', approved: draftApproved, advisorReview: draftAdvisorApproved, submitted: draftSubmitted, notStarted: draftNotSubmitted },
      { category: 'Defense', scheduled: defenseScheduled, ready: readyForDefense, notReady: total - defenseScheduled - readyForDefense }
    ];
  }, [groups, schedules, selectedSemester]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-200">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare report data - Memoized to prevent infinite loops
  const reportData = useMemo(() => {
    if (groups.length === 0 && proposals.length === 0) return null;

    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    // Use the memoized filteredGroups
    const relevantProposals = proposals.filter(p => {
      const submitted = new Date(p.submittedAt);
      return submitted >= start && submitted <= end;
    });

    const relevantSchedules = schedules.filter(s => {
      const defenseDate = new Date(s.date);
      return defenseDate >= start && defenseDate <= end;
    });

    const approvedProposalsCount = relevantProposals.filter(p => p.status === 'approved').length;
    const pendingProposalsCount = relevantProposals.filter(p => p.status === 'pending').length;
    const groupsWithAdvisorCount = filteredGroups.filter(g => g.advisorId).length;
    const completedProjectsCount = filteredGroups.filter(g => g.finalDraftStatus === 'fully-approved').length;

    // Format groups for report
    const formattedGroups = filteredGroups.map(g => {
      let projectTitle = 'N/A';
      if (g.approvedTitle) {
        try {
          projectTitle = typeof g.approvedTitle === 'string' && g.approvedTitle.startsWith('{')
            ? JSON.parse(g.approvedTitle).title
            : g.approvedTitle;
        } catch {
          projectTitle = g.approvedTitle;
        }
      }
      return {
        name: g.name,
        approvedTitle: projectTitle,
        members: g.Members?.map(m => m.name).join(', ') || 'N/A',
        advisorName: g.Advisor?.name || 'Not Assigned',
        progressStatus: g.progressStatus || 'N/A',
        finalDraftStatus: g.finalDraftStatus || 'N/A'
      };
    });

    // Format defense schedules for report
    const formattedSchedules = relevantSchedules.map(s => ({
      groupName: s.groupName,
      projectTitle: s.projectTitle || 'N/A',
      date: s.date,
      time: formatTime(s.time),
      venue: s.venue,
      evaluators: s.evaluators?.map(e => e.name).join(', ') || 'N/A'
    }));

    return {
      totalGroups: filteredGroups.length,
      approvedProposals: approvedProposalsCount,
      pendingProposals: pendingProposalsCount,
      groupsWithAdvisor: groupsWithAdvisorCount,
      completedProjects: completedProjectsCount,
      academicYear: academicYear?.current,
      semester: selectedSemester,
      groups: formattedGroups,
      defenseSchedules: formattedSchedules
    };
  }, [groups, proposals, schedules, academicYear?.current, dateRange.start, dateRange.end, filteredGroups, selectedSemester]);

  const handleExportPDF = () => {
    try {
      if (!reportData) {
        toast.error('No data to export');
        return;
      }

      const doc = pdfService.generateDepartmentReport(department, reportData);
      const filename = `${department.replace(/\s+/g, '_')}_Report_${academicYear?.current?.replace('/', '-')}_Sem${selectedSemester}`;
      pdfService.downloadPDF(doc, filename);
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF: ' + (error.message || 'Unknown error'));
    }
  };

  if (groupsLoading || proposalsLoading || defenseLoading || progressReportsLoading || finalDraftsLoading) {
    return <LoadingSpinner fullScreen text="Generating reports..." />;
  }

  return (
    <PageContainer>
      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" /> Report Parameters
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="startDate" className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="endDate" className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart (Full Width) - Only in Semester 1 */}
      {selectedSemester === '1' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Monthly Activity Trends
          </h3>
          <div className="h-[350px]">
            {monthlyTrendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGroups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProposals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="groups" name="Groups Formed" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGroups)" />
                  <Area type="monotone" dataKey="proposals" name="Proposals Submitted" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorProposals)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No activity data available for this period.</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Semester 1 Specific Charts - Hide in Semester 2 */}
      {selectedSemester === '1' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Proposal Status Pie Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-600" /> Proposal Status
              </h3>
              {proposalStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={proposalStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={5}
                    >
                      {proposalStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">No proposal data available.</div>
              )}
            </motion.div>

            {/* Advisor Workload Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" /> Advisor Workload
              </h3>
              {advisorWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={advisorWorkloadData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <defs>
                      <linearGradient id="advisorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="groups" name="Assigned Groups" fill="url(#advisorGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">No advisors with assigned groups.</div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Group Progress Funnel Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChartIcon className="w-5 h-5 text-blue-600" /> Group Progress Funnel
            </h3>
            {groupProgressData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart layout="vertical" data={groupProgressData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="value" name="Groups" barSize={30}>
                    {groupProgressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} radius={[0, 4, 4, 0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-500">No group data to display.</div>
            )}
            </motion.div>

            {/* Academic Performance Analysis */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" /> Academic Performance vs Status
              </h3>
              {cgpaAnalysisData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={cgpaAnalysisData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis dataKey="name" scale="band" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" domain={[0, 4]} label={{ value: 'Avg CGPA', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Group Count', angle: 90, position: 'insideRight' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="right" dataKey="count" name="Number of Groups" barSize={20} fill="#413ea0" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="avgCgpa" name="Average CGPA" stroke="#ff7300" strokeWidth={3} dot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  No CGPA data available.
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* Semester 2 Specific Reports */}
      {selectedSemester === '2' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
            {/* Final Draft Status - Horizontal Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" /> Final Draft Status
              </h3>
              {finalDraftStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={finalDraftStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Groups" radius={[0, 4, 4, 0]} barSize={35}>
                      {finalDraftStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-500">No final draft data available.</div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Project Progress Timeline - Monthly Progress Reports */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Project Progress Timeline
              </h3>
              {progressTimelineData.length > 0 ? (
                <div className="h-auto min-h-[350px]">
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={progressTimelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(label) => `Month: ${label}`}
                        formatter={(value, name) => [value, name]}
                      />
                      <Legend />
                      <Bar dataKey="reportCount" name="Progress Reports" fill="#3b82f6" barSize={28} radius={[6, 6, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="uniqueGroups"
                        name="Distinct Groups"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#10b981' }}
                        activeDot={{ r: 7, fill: '#047857' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                      <p className="text-xl font-bold text-blue-600">
                        {progressTimelineData.reduce((acc, item) => acc + item.reportCount, 0)}
                      </p>
                      <p className="text-[10px] text-blue-700 font-semibold mt-0.5">Total Progress Reports</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                      <p className="text-xl font-bold text-green-600">
                        {semester2GroupCount}
                      </p>
                      <p className="text-[10px] text-green-700 font-semibold mt-0.5">Distinct Semester 2 Groups</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                      <p className="text-xl font-bold text-indigo-600">
                        {progressTimelineData.length}
                      </p>
                      <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">Active Months</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">No semester 2 progress report data available.</div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* Export Section - Hidden in Semester 2 */}
      {selectedSemester !== '2' && (
        <div className="bg-white rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Download Full Report</h3>
            <p className="text-sm text-gray-500 mt-1">Generate a comprehensive PDF document with all department data.</p>
          </div>
          <Button
            onClick={handleExportPDF}
            icon={Download}
            disabled={!reportData || groups.length === 0}
          >
            Download Full Report
          </Button>
        </div>
      )}

      {/* Preview Info */}
      {groups.length === 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No data available for report generation. Please ensure there are groups and proposals in the system.
          </p>
        </div>
      )}
    </PageContainer>
  );
};

export default DeptReports;