// src/pages/faculty-head/DefenseSchedule.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, Users, Sparkles, PlusCircle, AlertTriangle, CheckCircle2, FileText, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { defenseService, groupService, academicService, notificationService, userService, finalDraftService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import pdfService from '../../services/pdfService';
import { formatDate, formatTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap } from '../../utils/sectionDisplay';

const DefenseSchedule = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  // Fetch users for PDF export
  const { data: usersData } = useFetch(() => userService.getUsers(), []);
  const users = usersData?.users || [];

  // Fetch defense schedules filtered by academic year and semester
  const {
    data: defenseData,
    loading: defenseLoading,
    refetch: refetchDefenses
  } = useFetch(() => defenseService.getDefenseSchedules({ 
    academicYearId: currentAcademicYearId,
    semester: currentSemester
  }), [currentAcademicYearId, currentSemester]);

  // Fetch all groups for current academic year
  const {
    data: groupsData,
    loading: groupsLoading,
    refetch: refetchGroups
  } = useFetch(() => groupService.getGroups({ academicYearId: currentAcademicYearId }), [currentAcademicYearId]);

  // Fetch venues
  const {
    data: venuesData,
    loading: venuesLoading,
    refetch: refetchVenues
  } = useFetch(() => academicService.getVenues());

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

  // Fetch all final drafts for faculty head (filtered by academic year)
  const {
    data: allDraftsData,
    loading: allDraftsLoading
  } = useFetch(() => {
    if (!currentAcademicYearId) return Promise.resolve({ drafts: [] });
    return finalDraftService.getFacultyHeadDrafts(currentAcademicYearId);
  }, [currentAcademicYearId]);

  const defenseSchedules = defenseData?.schedules || [];
  const groups = groupsData?.groups || [];
  const managedVenues = venuesData?.venues || [];
  
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

  // Filter drafts by current semester and advisor-approved status
  const approvedDrafts = useMemo(() => {
    const allDrafts = allDraftsData?.drafts || [];
    if (!allDrafts.length || !currentSemester) return [];
    
    return allDrafts.filter(d => {
      const draftSemester = String(d.semester || '1');
      const isCurrentSemester = draftSemester === String(currentSemester);
      // Check for both 'approved' and 'advisor-approved' status
      const isApproved = d.advisorStatus === 'approved' || d.advisorStatus === 'advisor-approved';
      return isCurrentSemester && isApproved;
    });
  }, [allDraftsData?.drafts, currentSemester]);

  // Get approved draft group IDs for current semester
  const approvedDraftGroupIds = useMemo(() => {
    return new Set(approvedDrafts.map(d => d.groupId));
  }, [approvedDrafts]);

  // Get groups ready for defense (evaluators assigned AND final draft approved in current semester)
  const readyGroups = useMemo(() => {
    if (!groups.length || !currentAcademicYearId) return [];
    
    return groups.filter(g => {
      const hasApprovedDraftThisSemester = approvedDraftGroupIds.has(g.id);
      const isInCurrentYear = g.academicYearId === currentAcademicYearId;
      const hasEvaluators = g.Evaluators && g.Evaluators.length > 0;
      return isInCurrentYear && hasApprovedDraftThisSemester && hasEvaluators;
    });
  }, [groups, approvedDraftGroupIds, currentAcademicYearId]);
  
  const unscheduledGroups = useMemo(() => {
    if (!readyGroups.length || !defenseSchedules.length) return readyGroups;
    return readyGroups.filter(g => !defenseSchedules.find(s => s.groupId === g.id));
  }, [readyGroups, defenseSchedules]);

  // Calculate distinct evaluator panels (committees)
  const uniquePanelsCount = useMemo(() => {
    if (!unscheduledGroups.length) return 0;
    return new Set(
      unscheduledGroups.map(g => g.Evaluators?.map(e => e.id).sort().join('-')).filter(Boolean)
    ).size;
  }, [unscheduledGroups]);

  const [showAutoModal, setShowAutoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [modalUnscheduledGroups, setModalUnscheduledGroups] = useState([]);
  const [autoConfig, setAutoConfig] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    duration: 45,
    venues: managedVenues.slice(0, 2).map(v => v.name)
  });
  const [newVenueName, setNewVenueName] = useState('');

  // Open auto schedule modal with current unscheduled groups
  const handleOpenAutoModal = () => {
    if (!unscheduledGroups || unscheduledGroups.length === 0) {
      toast.info('No groups are currently ready for defense scheduling');
      return;
    }
    setModalUnscheduledGroups(unscheduledGroups);
    setShowAutoModal(true);
  };

  // Update venues in autoConfig when managedVenues changes
  useEffect(() => {
    if (managedVenues.length > 0 && autoConfig.venues.length === 0) {
      setAutoConfig(prev => ({
        ...prev,
        venues: managedVenues.slice(0, 2).map(v => v.name)
      }));
    }
  }, [managedVenues]);

  const venueOptions = managedVenues.map(v => ({ value: v.name, label: v.name }));

  const handleQuickAddVenue = async () => {
    if (!newVenueName.trim()) return;
    
    try {
      const result = await academicService.addVenue(newVenueName.trim());
      if (result.success) {
        toast.success('Venue added successfully!');
        await refetchVenues();
        // Auto-select the new venue
        setAutoConfig(prev => ({
          ...prev,
          venues: [...prev.venues, newVenueName.trim()]
        }));
        setNewVenueName('');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to add venue');
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      if (!defenseSchedules || defenseSchedules.length === 0) {
        toast.error('No defense schedules to export');
        return;
      }

      // Sanitize schedules for PDF to resolve section names in groupName
      const sanitizedSchedules = defenseSchedules.map(s => {
        const group = groups.find(g => g.id === s.groupId);
        const sectionId = group?.Members?.[0]?.section;
        const resolvedSection = (sectionId && sectionNameMap[sectionId]) ? sectionNameMap[sectionId] : (sectionId || 'N/A');
        
        return {
          ...s,
          groupName: sanitizeStr(s.groupName || ''),
          time: formatTime(s.time),
          section: resolvedSection,
          members: group?.Members || []
        };
      });

      const doc = pdfService.generateFacultyDefenseSchedulePDF(
        sanitizedSchedules,
        academicYear?.current || 'N/A',
        currentSemester
      );
      
      const filename = `Defense_Schedule_${academicYear?.current?.replace('/', '-') || 'Export'}_Sem${currentSemester}_${new Date().toISOString().split('T')[0]}`;
      pdfService.downloadPDF(doc, filename);
      toast.success(`✅ Defense schedule PDF exported! (${defenseSchedules.length} defenses)`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('❌ Failed to export PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  const handleAutoSchedule = async () => {
    // Use the groups that were captured when modal opened
    if (!modalUnscheduledGroups || modalUnscheduledGroups.length === 0) {
      toast.info('No eligible groups available for scheduling in the current semester');
      setShowAutoModal(false);
      return;
    }

    if (autoConfig.venues.length === 0) {
      toast.error('Please select at least one venue');
      return;
    }

    // Validate Start Time: 7AM-11AM or 12PM-6PM
    const [hours, minutes] = autoConfig.startTime.split(':').map(Number);
    const startMins = hours * 60 + (minutes || 0);
    
    const morningStart = 7 * 60;    // 07:00
    const morningEnd = 11 * 60;      // 11:00
    const afternoonStart = 12 * 60;  // 12:00
    const afternoonEnd = 18 * 60;    // 18:00

    if (!((startMins >= morningStart && startMins <= morningEnd) || 
          (startMins >= afternoonStart && startMins <= afternoonEnd))) {
      toast.error('Invalid Start Time. Please choose a time between 7:00 AM - 11:00 AM or 12:00 PM - 6:00 PM.');
      return;
    }

    setLoading(true);
    try {
      // Find venue IDs from names
      const selectedVenues = managedVenues.filter(v => autoConfig.venues.includes(v.name));
      if (selectedVenues.length === 0) {
        toast.error('Could not find selected venues.');
        return;
      }

      // Pass the group IDs directly to backend - frontend already filtered by semester
      const payload = {
        startDate: autoConfig.startDate,
        startTime: autoConfig.startTime,
        duration: autoConfig.duration,
        venueIds: selectedVenues.map(v => v.id),
        groupIds: modalUnscheduledGroups.map(g => g.id)  // Pass eligible group IDs
      };

      const response = await defenseService.generateDefenseSchedule(payload);

      toast.success(response.message || `Successfully scheduled ${response.schedules?.length || 0} defenses! Emails will be sent to group members, evaluators, and department heads.`);
      setShowAutoModal(false);
      await refetchDefenses();
      await refetchGroups();
    } catch (error) {
      console.error('Auto-schedule error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to auto-schedule defenses';
      
      if (error.error) {
        if (error.error.includes('Could not schedule all groups')) {
          errorMessage = 'Scheduling conflict: Some groups could not be scheduled. Try adding more venues or extending the date range.';
        } else if (error.error.includes('Venue is already booked')) {
          errorMessage = 'Venue conflict: The selected venue is already booked for the requested time slot.';
        } else if (error.error.includes('evaluator is already busy')) {
          errorMessage = 'Evaluator conflict: An evaluator has overlapping defense schedules.';
        } else if (error.error.includes('No eligible groups')) {
          errorMessage = 'No groups are ready for defense scheduling in the current semester.';
        } else {
          errorMessage = error.error;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'groupName',
      label: 'Group',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{sanitizeStr(value)}</div>
          {row.groupNumber && <div className="text-xs text-gray-500">#{row.groupNumber}</div>}
        </div>
      )
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const sectionId = row.members?.[0]?.section;
        return (sectionId && sectionNameMap[sectionId]) ? sectionNameMap[sectionId] : (sectionId || 'N/A');
      },
    },
    { 
      key: 'members', 
      label: 'Group Members',
      render: (members) => {
        if (!members || members.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {members.map(member => (
              <span key={member.id}>{member.name}</span>
            ))}
          </div>
        );
      }
    },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'department', label: 'Department' },
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

  const pendingColumns = [
    { 
      key: 'name', 
      label: 'Group',
      render: (name) => sanitizeStr(name)
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, group) => {
        const sectionId = group?.Members?.[0]?.section;
        return (sectionId && sectionNameMap[sectionId]) ? sectionNameMap[sectionId] : (sectionId || 'N/A');
      }
    },
    { 
      key: 'approvedTitle', 
      label: 'Project Title', 
      render: (title) => {
        if (!title) return 'N/A';
        try {
          const parsedTitle = typeof title === 'string' ? JSON.parse(title) : title;
          return parsedTitle.title || title;
        } catch {
          return title;
        }
      }
    },
    { key: 'department', label: 'Department' },
    { 
      key: 'Advisor',
      label: 'Advisor',
      render: (_, group) => group.Advisor?.name || <span className="text-gray-400 italic">N/A</span>
    },
    { 
      key: 'Evaluators', 
      label: 'Assigned Evaluators',
      render: (_, group) => {
        const evaluators = group.Evaluators;
        if (!evaluators || evaluators.length === 0) return '-';
        return (
          <div className="flex flex-col gap-1">
            {evaluators.map(e => (
              <span key={e.id} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs w-fit">
                {e.name}
              </span>
            ))}
          </div>
        );
      }
    }
  ];

  if (defenseLoading || groupsLoading || venuesLoading || allDraftsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading defense schedules..." />;
  }

  return (
    <div className="space-y-6">
      {/* Stunning Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-2xl">
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
                <Calendar className="w-4 h-4" />
                <span>Faculty Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Defense Schedule</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
                Defense Schedule
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                disabled={defenseSchedules.length === 0 || exportLoading}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                <Download className="w-5 h-5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handleOpenAutoModal}
                disabled={unscheduledGroups.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold"
              >
                <Sparkles className="w-5 h-5" />
                <span>Auto Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="group bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{defenseSchedules.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Scheduled Defenses</div>
          <div className="text-xs text-gray-500 mt-2">All scheduled defenses</div>
        </div>
        <div className="group bg-white rounded-xl border-l-4 border-green-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{unscheduledGroups.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Ready for Defense</div>
          <div className="text-xs text-gray-500 mt-2">
            {currentSemester === '2' ? 'Semester 2 groups' : 'Groups ready'}
          </div>
        </div>
      </div>

      {/* Pending Scheduling Table */}
      {unscheduledGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Pending Scheduling</h2>
                <p className="text-sm text-white/90">{unscheduledGroups.length} group{unscheduledGroups.length !== 1 ? 's' : ''} waiting for defense dates</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable columns={pendingColumns} data={unscheduledGroups} pageSize={5} />
          </div>
        </div>
      )}

      {/* Schedules Cards */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Scheduled Defenses</h2>
                <p className="text-sm text-white/70 mt-0.5">{defenseSchedules.length} defense{defenseSchedules.length !== 1 ? 's' : ''} scheduled</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {defenseSchedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Defense Schedules</h3>
              <p className="text-gray-500">No defense schedules have been created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {defenseSchedules.map((schedule, index) => {
                const members = schedule.members || [];
                const evaluators = schedule.evaluators || [];

                return (
                  <div
                    key={schedule.id}
                    className="group relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                  >
                    {/* Card Header */}
                    <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-lg">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{sanitizeStr(schedule.groupName)}</h3>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                          <span className="text-xs font-medium text-white">{formatTime(schedule.time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 space-y-4">
                      {/* Project Title */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">Project Title</span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium leading-relaxed pl-6">
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
                          <p className="text-sm font-medium text-gray-900 pl-6">{formatDate(schedule.date)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-700">Venue</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 pl-6">{schedule.venue}</p>
                        </div>
                      </div>

                      {/* Department */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-700">Department</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 pl-6">{schedule.department}</p>
                      </div>

                      {/* Group Members */}
                      {members.length > 0 && (
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
                                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full text-sm font-medium text-gray-800 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
                              >
                                {member.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evaluators */}
                      {evaluators.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Evaluators ({evaluators.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-6">
                            {evaluators.map(evaluator => (
                              <span
                                key={evaluator.id}
                                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-sm font-medium text-gray-800 hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
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

      {/* Auto Schedule Modal */}
      <Modal
        isOpen={showAutoModal}
        onClose={() => setShowAutoModal(false)}
        title="Auto-Generate Schedules"
        size="lg"
        onConfirm={handleAutoSchedule}
        confirmText="Generate Schedules"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Automated Scheduling</p>
                <p className="text-sm text-blue-800 mt-1">
                  This will automatically assign dates, times, and venues to all {modalUnscheduledGroups.length} unscheduled groups.
                </p>

                {/* Capacity Analysis */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-blue-800">Groups to Schedule:</span>
                    <span className="font-medium text-blue-900">{modalUnscheduledGroups.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-blue-800">Distinct Evaluator Panels:</span>
                    <span className="font-medium text-blue-900">{uniquePanelsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">Selected Venues:</span>
                    <span className={`font-medium ${autoConfig.venues.length < uniquePanelsCount ? 'text-orange-600' : 'text-green-600'}`}>
                      {autoConfig.venues.length}
                    </span>
                  </div>

                  {autoConfig.venues.length < uniquePanelsCount ? (
                    <div className="flex items-start gap-2 mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-100">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <p>
                        For optimal parallel scheduling, you need at least <strong>{uniquePanelsCount}</strong> venues.
                        Current selection may require sequential slots, extending the total duration.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <p>Sufficient venues selected for full parallel evaluation.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <InputField
            label="Start Date"
            type="date"
            value={autoConfig.startDate}
            onChange={(e) => setAutoConfig({...autoConfig, startDate: e.target.value})}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Start Time"
              type="time"
              value={autoConfig.startTime}
              onChange={(e) => setAutoConfig({...autoConfig, startTime: e.target.value})}
              required
              helpText="Valid hours: 7:00 AM - 11:00 AM or 12:00 PM - 6:00 PM"
            />
            <InputField
              label="Duration (mins)"
              type="number"
              value={autoConfig.duration}
              onChange={(e) => setAutoConfig({...autoConfig, duration: parseInt(e.target.value) || 45})}
              min="15"
              max="120"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Venues</label>
            <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {venueOptions.map((venue) => (
                <label key={venue.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfig.venues.includes(venue.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAutoConfig(prev => ({...prev, venues: [...prev.venues, venue.value]}));
                      } else {
                        setAutoConfig(prev => ({...prev, venues: prev.venues.filter(v => v !== venue.value)}));
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{venue.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select multiple venues to schedule concurrent defenses.</p>
          </div>

          {/* Quick Add Venue */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Need more venues?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                placeholder="Enter new venue name..."
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={handleQuickAddVenue} 
                icon={PlusCircle} 
                disabled={!newVenueName.trim() || loading}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Once scheduled, all group members and evaluators will be notified automatically.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DefenseSchedule;