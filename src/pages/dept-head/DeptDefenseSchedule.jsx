import React, { useMemo } from 'react';
import { Calendar, FileText, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { defenseService, groupService, sectionService } from '../../services';
import pdfService from '../../services/pdfService';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const DeptDefenseSchedule = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const department = user?.department;
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  // Fetch defense schedules filtered by department, academic year, and semester
  const {
    data: defenseData,
    loading: defenseLoading,
    error: defenseError
  } = useFetch(() => defenseService.getDefenseSchedules({
    department,
    academicYearId: currentAcademicYearId,
    semester: currentSemester
  }), [department, currentAcademicYearId, currentSemester]);

  // Fetch groups for member details
  const {
    data: groupsData,
    loading: groupsLoading
  } = useFetch(() => groupService.getGroups({ 
    department,
    academicYearId: currentAcademicYearId
  }), [department, currentAcademicYearId]);

  // Fetch sections to resolve names
  const { data: sectionsData, loading: sectionsLoading } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  // Filter schedules by academic year and semester (extra safety)
  const schedules = useMemo(() => {
    const allSchedules = defenseData?.schedules || [];
    return allSchedules.filter(schedule => {
      // Check academic year ID
      if (schedule.academicYearId && currentAcademicYearId) {
        if (schedule.academicYearId !== currentAcademicYearId) return false;
      }
      
      // Check semester (compare as strings)
      const scheduleSemester = String(schedule.semester || '1');
      const currentSemesterStr = String(currentSemester);
      return scheduleSemester === currentSemesterStr;
    });
  }, [defenseData?.schedules, currentAcademicYearId, currentSemester]);
  
  const groups = groupsData?.groups || [];

  const handleExportPDF = () => {
    try {
      if (schedules.length === 0) {
        toast.error('No defense schedules to export');
        return;
      }

      const schedulesForPdf = schedules.map(schedule => {
        const group = groups.find(g => g.id === schedule.groupId);
        return {
          ...schedule,
          groupName: formatGroupDisplayName(group, sectionNameMap) || schedule.groupName,
          time: formatTime(schedule.time),
          section: getMemberSectionName(group?.Members?.[0], sectionNameMap),
          members: group?.Members || []
        };
      });
      const doc = pdfService.generateDefenseSchedulePDF(schedulesForPdf, department);
      pdfService.downloadPDF(doc, `Defense_Schedule_${department}_${new Date().toISOString().split('T')[0]}`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const columns = [
    {
      key: 'groupName',
      label: 'Group',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return formatGroupDisplayName(group, sectionNameMap) || row.groupName || 'N/A';
      }
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return getMemberSectionName(group?.Members?.[0], sectionNameMap);
      }
    },
    {
      key: 'members',
      label: 'Group Members',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        const members = group?.Members || [];
        return (
          <div className="flex flex-col">
            {members.map(m => <span key={m.id}>{m.name}</span>)}
          </div>
        );
      }
    },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'time', label: 'Time', render: (v) => formatTime(v) },
    { key: 'venue', label: 'Venue' },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (evaluators) => {
        if (!evaluators || evaluators.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {evaluators.map(e => <span key={e.id}>{e.name}</span>)}
          </div>
        );
      }
    }
  ];

  if (defenseLoading || groupsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading defense schedules..." />;
  }

  if (defenseError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Schedules</h2>
          <p className="text-gray-600 mb-6">There was a problem loading defense schedules. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalScheduled = schedules.length;
  const thisWeek = schedules.filter(s => {
    const date = new Date(s.date);
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return date >= now && date <= weekLater;
  }).length;
  const venuesUsed = new Set(schedules.map(s => s.venue)).size;
  const upcomingDefenses = schedules.filter(s => new Date(s.date) >= new Date()).length;

  return (
    <div className="space-y-6">
      {/* Stunning Header with Attractive Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-xl">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10" 
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-white/80 text-sm mb-3">
                <Calendar className="w-4 h-4" />
                <span>Department Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Defense Schedule</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Defense Schedule
              </h1>

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/15 rounded-lg border border-white/20">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">{department}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/15 rounded-lg border border-white/20">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">Semester {currentSemester}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/15 rounded-lg border border-white/20">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">{totalScheduled} scheduled defense{totalScheduled !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={schedules.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 rounded-xl shadow-md hover:shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
            >
              <Download className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Scheduled */}
        <div className="group bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm p-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalScheduled}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Scheduled</div>
          <div className="text-xs text-gray-500 mt-2">
            All defenses
          </div>
        </div>

        {/* Venues Used */}
        <div className="group bg-white rounded-xl border-l-4 border-purple-500 shadow-sm p-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900">{venuesUsed}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Venues Used</div>
          <div className="text-xs text-gray-500 mt-2">
            Different locations
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        {/* Table Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-5 py-5">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-52 h-52 bg-white/5 rounded-full -mr-24 -mt-24"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mb-20"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Defense Schedule List</h2>
              <p className="text-sm text-white/70 mt-0.5">{schedules.length} defense{schedules.length !== 1 ? 's' : ''} scheduled</p>
            </div>
          </div>
        </div>
        
        {/* Table Content */}
        <div className="p-4">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Defense Schedules</h3>
              <p className="text-gray-500">No defense schedules found for this department.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map((schedule, index) => {
                const group = groups.find(g => g.id === schedule.groupId);
                const members = group?.Members || [];
                const evaluators = schedule.evaluators || [];

                return (
                  <div
                    key={schedule.id}
                    className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden transform hover:-translate-y-0.5"
                  >
                    {/* Card Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                      <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14"></div>
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg text-white font-semibold text-base">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">{formatGroupDisplayName(group) || schedule.groupName}</h3>
                            <p className="text-xs text-white/80">Section {getMemberSectionName(group?.Members?.[0])}</p>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                          <span className="text-[10px] font-medium text-white">{formatTime(schedule.time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-3">
                      {/* Project Title */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">Project Title</span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium leading-relaxed">
                          {schedule.projectTitle}
                        </p>
                      </div>

                      {/* Date & Venue */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-700">Date</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{formatDate(schedule.date)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-700">Venue</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{schedule.venue}</p>
                        </div>
                      </div>

                      {/* Group Members */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">Group Members ({members.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-6">
                          {members.map(member => (
                            <span
                              key={member.id}
                              className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full text-xs font-medium text-gray-800 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
                            >
                              {member.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Evaluators */}
                      {evaluators.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Evaluators ({evaluators.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {evaluators.map(evaluator => (
                              <span
                                key={evaluator.id}
                                className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-xs font-medium text-gray-800 hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
                              >
                                {evaluator.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeptDefenseSchedule;
