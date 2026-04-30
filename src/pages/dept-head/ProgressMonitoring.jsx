import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle, TrendingUp, Users, FileCheck, AlertCircle, BookOpen, Target, Award, Activity, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, sectionService } from '../../services';
import api from '../../services/apiConfig';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import MetricCard from '../../components/dashboard/MetricCard';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import { formatDate } from '../../utils/dateUtils';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const ProgressMonitoring = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const department = user?.department;
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  const [allReports, setAllReports] = useState([]);
  const [allDrafts, setAllDrafts] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState(null);

  // Fetch groups for current academic year only
  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useFetch(() => groupService.getGroups({
    department,
    academicYearId: currentAcademicYearId
  }), [department, currentAcademicYearId]);

  // Get all groups from the academic year
  const groups = groupsData?.groups || [];
  const groupIds = useMemo(() => groups.map(g => g.id), [groups]);

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(department, true),
    [department],
    !!department
  );

  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );

  // Fetch reports and drafts when groups change
  useEffect(() => {
    if (groupIds.length === 0) {
      console.log('[ProgressMonitoring] No groups found');
      return;
    }

    console.log('[ProgressMonitoring] Fetching for', groupIds.length, 'groups');

    const fetchAllData = async () => {
      if (!department) return;

      setLoadingReports(true);
      setReportsError(null);
      try {
        // Fetch reports for all groups
        const reportsPromises = groupIds.map(id =>
          api.get(`/progress/group/${id}`)
            .then(res => {
              console.log('[ProgressMonitoring] Reports for group', id, ':', res.data.reports?.length || 0);
              return res.data.reports || [];
            })
            .catch(err => {
              console.log('[ProgressMonitoring] No reports for group', id);
              return [];
            })
        );
        const reportsResults = await Promise.all(reportsPromises);
        const allReportsData = reportsResults.flat();
        console.log('[ProgressMonitoring] Total reports:', allReportsData.length);
        setAllReports(allReportsData);

        // Fetch drafts for all groups
        const draftsPromises = groupIds.map(id =>
          api.get(`/final-drafts/group/${id}`)
            .then(res => {
              // API returns { success: true, drafts: [...] }
              const draftsArray = res.data.drafts || [];
              if (draftsArray.length > 0) {
                console.log('[ProgressMonitoring] Draft for group', id, ':', draftsArray.length, 'draft(s) found');
                return draftsArray;
              } else {
                console.log('[ProgressMonitoring] No draft for group', id);
                return [];
              }
            })
            .catch(err => {
              console.log('[ProgressMonitoring] No draft for group', id, err.message);
              return [];
            })
        );
        const draftsResults = await Promise.all(draftsPromises);
        // Flatten all drafts into a single array
        const allDraftsData = draftsResults.flat();
        console.log('[ProgressMonitoring] Total drafts:', allDraftsData.length);
        setAllDrafts(allDraftsData);
      } catch (error) {
        console.error('Failed to fetch progress data:', error);
        setReportsError('Failed to load some data');
      } finally {
        setLoadingReports(false);
      }
    };

    fetchAllData();
  }, [groupIds, department]);

  // Filter reports by current academic year and semester
  const reports = useMemo(() => {
    return allReports.filter(report => {
      // Ensure report has groupId
      if (!report.groupId) {
        console.warn('[ProgressMonitoring] Report missing groupId:', report);
        return false;
      }
      
      const group = groups.find(g => g.id === report.groupId);
      if (!group) return false;
      
      // Filter by academic year ID
      if (report.academicYearId && currentAcademicYearId) {
        if (report.academicYearId !== currentAcademicYearId) return false;
      }
      
      // Filter by semester (compare as strings)
      const reportSemester = report.semester?.toString() || group.semester?.toString() || '1';
      const currentSemesterStr = currentSemester.toString();
      if (reportSemester !== currentSemesterStr) return false;
      
      return true;
    });
  }, [allReports, groups, currentSemester, currentAcademicYearId]);

  // Filter drafts by current academic year and semester
  const drafts = useMemo(() => {
    return allDrafts.filter(draft => {
      // Ensure draft has groupId
      if (!draft.groupId) {
        console.warn('[ProgressMonitoring] Draft missing groupId:', draft);
        return false;
      }

      const group = groups.find(g => g.id === draft.groupId);
      if (!group) return false;

      // Filter by academic year ID
      if (draft.academicYearId && currentAcademicYearId) {
        if (draft.academicYearId !== currentAcademicYearId) return false;
      }

      // Filter by semester (compare as strings)
      const draftSemester = draft.semester?.toString() || group.semester?.toString() || '1';
      const currentSemesterStr = currentSemester.toString();
      if (draftSemester !== currentSemesterStr) return false;

      return true;
    });
  }, [allDrafts, groups, currentSemester, currentAcademicYearId]);

  // Calculate statistics (semester-aware)
  const totalReports = reports.length;
  // Count completed projects from final drafts table that are advisor-approved for the current semester
  const completedProjects = drafts.filter(d =>
    d.advisorStatus === 'approved' &&
    String(d.semester) === String(currentSemester)
  ).length;
  const draftsSubmitted = drafts.length;
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const submissionRate = groups.length > 0 ? Math.round((draftsSubmitted / groups.length) * 100) : 0;

  // Custom styled header instead of PageContainer
  const renderPageHeader = () => (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-md mb-8">
      {/* Subtle colorful accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
              <BookOpen className="w-4 h-4" />
              <span>Department Head</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-700 font-medium">Progress Monitoring</span>
            </div>

            {/* Main title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Progress Monitoring
            </h1>

            {/* Semester info cards */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 font-medium text-sm">Semester {academicYear?.semester || '1'}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-purple-700 font-medium text-sm">{academicYear?.yearName || academicYear?.current || ''}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-lg border border-pink-200">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span className="text-pink-700 font-medium text-sm">{department}</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 mt-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{groups.length} Groups</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">{totalReports} Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{completedProjects} Completed</span>
              </div>
            </div>
          </div>

          {/* Stats ring */}
          <div className="flex gap-6">
            {/* Submission Rate Ring */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - submissionRate / 100)}
                    className="text-purple-500 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{submissionRate}%</span>
                  <span className="text-xs text-gray-500">Submitted</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-2">Submission</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!department) {
    return (
      <PageContainer title="Progress Monitoring">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Department Assigned</h2>
          <p className="text-yellow-700">Your user account is not associated with any department.</p>
        </div>
      </PageContainer>
    );
  }

  if (groupsLoading || loadingReports) {
    return <LoadingSpinner fullScreen text="Loading progress data..." />;
  }

  if (groupsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Groups</h2>
          <p className="text-gray-600 mb-6">{groupsError.message || 'Failed to load groups'}</p>
          <Button onClick={refetchGroups}>Retry</Button>
        </div>
      </div>
    );
  }

  const draftColumns = [
    {
      key: 'groupId',
      label: 'Group',
      render: (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return 'Unknown';
        const firstMember = group.Members?.[0];
        return (
          <div>
            <span className="font-medium">{formatGroupDisplayName(group, sectionNameMap)}</span>
            {firstMember?.section && <div className="text-xs text-gray-500">Section {getMemberSectionName(firstMember, sectionNameMap)}</div>}
          </div>
        );
      }
    },
    { key: 'title', label: 'Project Title' },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (value) => formatDate(value)
    },
    {
      key: 'advisorStatus',
      label: 'Advisor Status',
      render: (value) => <StatusBadge status={value || 'pending'} size="sm" />
    }
  ];

  const reportColumns = [
    {
      key: 'groupId',
      label: 'Group',
      render: (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return 'Unknown';
        const firstMember = group.Members?.[0];
        return (
          <div>
            <span className="font-medium">{formatGroupDisplayName(group, sectionNameMap)}</span>
            {firstMember?.section && <div className="text-xs text-gray-500">Section {getMemberSectionName(firstMember, sectionNameMap)}</div>}
          </div>
        );
      }
    },
    { key: 'title', label: 'Report Title' },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (value) => formatDate(value)
    },
    {
      key: 'status',
      label: 'Status',
      render: (status, row) => (
        <StatusBadge status={row.isOverdue ? 'overdue' : status || 'pending'} />
      )
    },
    {
      key: 'feedback',
      label: 'Feedback',
      render: (feedback) => feedback ? '✓ Given' : <span className="text-gray-400">Pending</span>
    }
  ];

  const groupProgressColumns = [
    {
      key: 'name',
      label: 'Group',
      render: (name, row) => {
        const firstMember = row.Members?.[0];
        return (
          <div>
            <span className="font-medium">{formatGroupDisplayName(row, sectionNameMap)}</span>
            {firstMember?.section && <div className="text-xs text-gray-500">Section {getMemberSectionName(firstMember, sectionNameMap)}</div>}
          </div>
        );
      }
    },
    {
      key: 'approvedTitle',
      label: 'Project',
      render: (title) => {
        if (!title) return 'N/A';
        try {
          const projectTitle = typeof title === 'string' ? JSON.parse(title).title : title;
          return projectTitle;
        } catch {
          return title;
        }
      }
    },
    {
      key: 'reportsCount',
      label: 'Reports',
      render: (_, row) => {
        const count = reports.filter(r => r.groupId === row.id).length;
        return count;
      }
    },
    {
      key: 'progressStatus',
      label: 'Status',
      render: (status) => <StatusBadge status={status || 'not-started'} />
    },
    {
      key: 'advisor',
      label: 'Advisor',
      render: (_, row) => {
        const advisor = row.Advisor;
        return advisor?.name || 'Not Assigned';
      }
    }
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Custom Stunning Header */}
      {renderPageHeader()}

      {/* Enhanced Metrics with Modern Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Reports Card */}
        <div className="group bg-white rounded-xl border-l-4 border-blue-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalReports}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Reports</div>
          <div className="text-xs text-gray-500 mt-2">
            {pendingReports > 0 ? `${pendingReports} pending feedback` : '✓ All caught up!'}
          </div>
        </div>

        {/* Pending Reports Card */}
        <div className="group bg-white rounded-xl border-l-4 border-orange-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{pendingReports}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Pending</div>
          <div className="text-xs text-gray-500 mt-2">
            Awaiting your review
          </div>
        </div>

        {/* Total Groups Card */}
        <div className="group bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{groups.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Groups</div>
          <div className="text-xs text-gray-500 mt-2">
            Active this semester
          </div>
        </div>

        {/* Drafts Submitted Card */}
        <div className="group bg-white rounded-xl border-l-4 border-purple-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{draftsSubmitted}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Drafts</div>
          <div className="text-xs text-gray-500 mt-2">
            Final submissions
          </div>
        </div>

        {/* Projects Completed Card */}
        <div className="group bg-white rounded-xl border-l-4 border-green-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{completedProjects}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Completed</div>
          <div className="text-xs text-gray-500 mt-2">
            Advisor approved
          </div>
        </div>
      </div>

      {/* Final Drafts Status */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Final Draft Submissions</h2>
                <p className="text-sm text-white/90">{drafts.length} draft{drafts.length !== 1 ? 's' : ''} submitted</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={draftColumns}
              data={drafts}
              searchable={false}
              pageSize={5}
            />
          </div>
        </div>
      )}

      {/* Group Progress Overview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Group Progress Overview</h2>
              <p className="text-sm text-white/90">Track each group's advancement</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <DataTable
            columns={groupProgressColumns}
            data={groups}
            searchable={false}
            pageSize={5}
          />
        </div>
      </div>

      {/* Progress Reports */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Progress Reports</h2>
                <p className="text-sm text-white/90">{reports.length} report{reports.length !== 1 ? 's' : ''} submitted</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={reportColumns}
              data={reports}
              searchable={false}
              pageSize={5}
            />
          </div>
        </div>
      )}

      {/* Error message if reports failed */}
      {reportsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Data Loading Error</h3>
              <p className="text-sm text-red-700">{reportsError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressMonitoring;
