import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Settings, Play, AlertCircle, Users, RefreshCw, CheckCircle, Eye, UserCheck, Award, GraduationCap, Layers, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService, groupService, academicService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import DataTable from '../../components/common/DataTable';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import GroupDetailsModal from '../../components/common/GroupDetailsModal';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName, resolveSectionName } from '../../utils/sectionDisplay';

const GroupGeneration = () => {
  const { user } = useAuth();
  const { isReadOnly, academicYear: contextAcademicYear } = useProtectedRoute();
  const department = user?.department;
  const isSemester1 = contextAcademicYear?.semester === '1';

  // Use ref to track mounted state
  const isMounted = useRef(true);

  // State
  const [maxPerGroup, setMaxPerGroup] = useState(4);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingNewStudents, setCheckingNewStudents] = useState(false);
  const [groupsGenerated, setGroupsGenerated] = useState(false);
  const [newStudents, setNewStudents] = useState([]);
  const [allTimeGroupedStudentIds, setAllTimeGroupedStudentIds] = useState(new Set());

  // Get active academic year ID
  const { data: activeYearData } = useFetch(() => academicService.getCurrentAcademicYear(), []);
  const academicYearId = activeYearData?.academicYear?.id;

  // Set isMounted ref
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Memoized fetch functions
  const fetchStudents = useCallback(() => 
    userService.getUsers({ 
      role: 'student', 
      department, 
      status: 'active' 
    }), [department]);

  const fetchGroups = useCallback(() => 
    groupService.getGroups({ 
      department, 
      academicYearId 
    }), [department, academicYearId]);

  // Fetch data
  const { 
    data: studentsData, 
    loading: studentsLoading,
    refetch: refetchStudents 
  } = useFetch(fetchStudents, [department], true);

  const { 
    data: groupsData, 
    loading: groupsLoading,
    refetch: refetchGroups 
  } = useFetch(fetchGroups, [department, academicYearId], true);

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(department, true),
    [department],
    !!department
  );

  const students = studentsData?.users || [];
  const existingGroups = groupsData?.groups || [];
  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );

  // Load all students who have EVER been in a group (across all time)
  useEffect(() => {
    const loadAllTimeGroupedStudents = async () => {
      try {
        // Fetch ALL groups (not just current academic year) to get historical data
        const response = await groupService.getGroups({ department });
        const allGroups = response?.groups || [];
        
        const allGroupedIds = new Set(
          allGroups.flatMap(g => g.Members?.map(m => m.id) || [])
        );
        
        if (isMounted.current) {
          setAllTimeGroupedStudentIds(allGroupedIds);
          console.log('All-time grouped student IDs:', Array.from(allGroupedIds));
        }
      } catch (error) {
        console.error('Error loading all-time grouped students:', error);
      }
    };

    loadAllTimeGroupedStudents();
  }, [department]);

  // Get currently grouped student IDs (current academic year only)
  const currentlyGroupedIds = useMemo(() => 
    new Set(existingGroups.flatMap(g => g.Members?.map(m => m.id) || [])),
  [existingGroups]);

  // Available students (not in any group in current academic year)
  const availableStudents = useMemo(() => 
    students.filter(s => !currentlyGroupedIds.has(s.id)),
  [students, currentlyGroupedIds]);

  // Truly new students (never been in ANY group, ever)
  const trulyNewStudents = useMemo(() => 
    students.filter(s => !allTimeGroupedStudentIds.has(s.id)),
  [students, allTimeGroupedStudentIds]);

  // Group by section
  const availableStudentsBySection = useMemo(() => {
    const sections = {};
    availableStudents.forEach(student => {
      const section = student.section
        ? resolveSectionName(student.section, sectionNameMap)
        : 'Uncategorized';
      if (!sections[section]) sections[section] = [];
      sections[section].push(student);
    });
    
    // Sort by CGPA within each section
    Object.keys(sections).forEach(section => {
      sections[section].sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0));
    });
    
    return sections;
  }, [availableStudents, sectionNameMap]);

  const newStudentsBySection = useMemo(() => {
    const sections = {};
    trulyNewStudents.forEach(student => {
      const section = student.section
        ? resolveSectionName(student.section, sectionNameMap)
        : 'Uncategorized';
      if (!sections[section]) sections[section] = [];
      sections[section].push(student);
    });
    
    // Sort by CGPA within each section
    Object.keys(sections).forEach(section => {
      sections[section].sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0));
    });
    
    return sections;
  }, [trulyNewStudents, sectionNameMap]);

  // Calculate stats
  const numberOfGroups = availableStudents.length > 0 
    ? Math.ceil(availableStudents.length / maxPerGroup) 
    : 0;
  
  const averageSize = availableStudents.length > 0 && numberOfGroups > 0
    ? (availableStudents.length / numberOfGroups).toFixed(1) 
    : '0.0';

  const hasAvailableStudents = availableStudents.length > 0;
  const hasTrulyNewStudents = trulyNewStudents.length > 0;

  const handleGenerateGroups = async () => {
    setLoading(true);
    try {
      const response = await groupService.generateGroups(department, maxPerGroup);
      
      if (response.success && isMounted.current) {
        // Get the newly grouped student IDs
        const newlyGroupedIds = response.groups.flatMap(g => g.Members?.map(m => m.id) || []);
        
        // Update all-time grouped students
        setAllTimeGroupedStudentIds(prev => {
          const updated = new Set(prev);
          newlyGroupedIds.forEach(id => updated.add(id));
          return updated;
        });

        setGroupsGenerated(true);

        toast.success(`Successfully created ${response.groups.length} groups!`);
        setShowConfirmModal(false);
        
        await refetchGroups();
      } else {
        toast.error(response.error || 'Failed to generate groups');
      }
    } catch (error) {
      console.error('Generate groups error:', error);
      toast.error(error.error || error.message || 'Failed to generate groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckForNewStudents = async () => {
    setCheckingNewStudents(true);
    try {
      // Refresh data
      await Promise.all([
        refetchStudents(),
        refetchGroups()
      ]);
      
      // Get updated all-time grouped students
      const response = await groupService.getGroups({ department });
      const allGroups = response?.groups || [];
      const allGroupedIds = new Set(
        allGroups.flatMap(g => g.Members?.map(m => m.id) || [])
      );
      
      if (isMounted.current) {
        setAllTimeGroupedStudentIds(allGroupedIds);
        
        // Find students who have NEVER been in any group
        const freshStudents = studentsData?.users || [];
        const brandNewStudents = freshStudents.filter(s => !allGroupedIds.has(s.id));
        
        console.log('Brand new students (never grouped):', brandNewStudents.length);
        
        if (brandNewStudents.length > 0) {
          setNewStudents(brandNewStudents);
          toast.success(`${brandNewStudents.length} brand new students found!`);
        } else {
          setNewStudents([]);
          toast('No brand new students available.');
        }
      }
    } catch (error) {
      console.error('Check for new students error:', error);
      toast.error('Failed to check for new students.');
    } finally {
      setCheckingNewStudents(false);
    }
  };

  const handleViewGroupDetails = (group) => {
    setSelectedGroup(group);
    setShowGroupDetailsModal(true);
  };

  const formatCGPA = useCallback((value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? 'N/A' : numValue.toFixed(2);
  }, []);

  // Memoized columns
  const groupColumns = useMemo(() => [
    {
      key: 'name',
      label: 'Group Name',
      render: (value, row) => formatGroupDisplayName(row, sectionNameMap)
    },
    {
      key: 'section',
      label: 'Section',
      render: (value, row) => getMemberSectionName(row.Members?.[0], sectionNameMap)
    },
    {
      key: 'department',
      label: 'Department',
      render: (value, row) => row.department || department || 'N/A'
    },
    {
      key: 'members',
      label: 'Members',
      render: (_, row) => {
        const members = row.Members || [];
        if (members.length === 0) return '0';
        return members.map(m => m.name).join(', ');
      }
    },
    {
      key: 'leaderId',
      label: 'Leader',
      render: (leaderId, row) => {
        const leader = row.Members?.find(m => m.id === leaderId);
        return leader?.name || 'N/A';
      }
    },
    {
      key: 'advisorId',
      label: 'Advisor',
      render: (advisorId, row) => {
        const advisor = row.Advisor;
        return advisor ? (
          <div>
            <div className="font-medium text-gray-900">{advisor.name}</div>
            <div className="text-xs text-gray-500">{advisor.department}</div>
          </div>
        ) : (
          <span className="text-gray-400 italic">Not Assigned</span>
        );
      }
    },
    {
      key: 'proposalStatus',
      label: 'Proposal',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'approved' ? 'bg-green-100 text-green-800' :
          status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status || 'Not Submitted'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewGroupDetails(row)}
          icon={Eye}
        >
          View
        </Button>
      )
    }
  ], [department, sectionNameMap]);

  const studentColumns = useMemo(() => [
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'Student ID' },
    {
      key: 'section',
      label: 'Section',
      render: (value) => value ? resolveSectionName(value, sectionNameMap) : 'N/A'
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'
    },
    {
      key: 'cgpa',
      label: 'CGPA',
      render: (value) => {
        const formattedCGPA = formatCGPA(value);
        const numericValue = parseFloat(value) || 0;
        
        return (
          <span className={`font-medium ${
            numericValue >= 3.5 ? 'text-green-600' :
            numericValue >= 3.0 ? 'text-blue-600' :
            numericValue >= 2.5 ? 'text-yellow-600' :
            'text-gray-600'
          }`}>
            {formattedCGPA}
          </span>
        );
      }
    }
  ], [formatCGPA, sectionNameMap]);

  const isFormDisabled = !hasAvailableStudents || groupsGenerated || isReadOnly;

  if (studentsLoading || groupsLoading) {
    return <LoadingSpinner fullScreen text="Loading data..." />;
  }

  if (!isSemester1) {
    return (
      <PageContainer title="Group Formation" subtitle="Only available in Semester 1">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Not Available</h2>
          <p className="text-yellow-700">
            Group formation is only available in Semester 1. You are currently in Semester {contextAcademicYear?.semester}.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-2xl shadow-2xl mb-8 p-8 md:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full translate-y-36 -translate-x-36"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white rounded-full"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Group Formation
            </h1>
          </div>
          <p className="text-blue-100 text-lg ml-14">
            Automatically create balanced project groups based on sections and CGPA
          </p>
        </div>
      </div>

      {/* Group Formation Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 border border-gray-100 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl opacity-50 -translate-y-32 translate-x-32 pointer-events-none"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Automated Group Formation</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Groups are formed with students from the same section based on CGPA
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Configuration */}
            <div className={`bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200 ${isFormDisabled ? 'opacity-75' : ''}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                <h3 className="font-bold text-gray-900">Configuration</h3>
              </div>
              <InputField
                label="Maximum Students per Group"
                type="number"
                value={maxPerGroup}
                onChange={(e) => setMaxPerGroup(parseInt(e.target.value) || 1)}
                min={2}
                max={10}
                disabled={isFormDisabled}
              />
              <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Students from the same section will be grouped together based on CGPA.
              </p>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
                <h3 className="font-bold text-gray-900">Preview</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Available Students:</span>
                  <span className="font-bold text-blue-600 text-lg">{availableStudents.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Groups to Create:</span>
                  <span className="font-bold text-purple-600 text-lg">{hasAvailableStudents ? numberOfGroups : 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Avg. Group Size:</span>
                  <span className="font-bold text-amber-600 text-lg">{hasAvailableStudents ? averageSize : '0.0'}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
                <h3 className="font-bold text-gray-900">Generate Groups</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4 min-h-[48px]">
                {!hasAvailableStudents && !groupsGenerated
                  ? 'No students available for grouping.'
                  : groupsGenerated
                    ? 'Groups generated successfully!'
                    : 'Create groups from available students.'}
              </p>

              {!groupsGenerated ? (
                <Button
                  onClick={() => setShowConfirmModal(true)}
                  icon={Play}
                  disabled={isFormDisabled || availableStudents.length < maxPerGroup}
                  fullWidth
                >
                  Generate Groups
                </Button>
              ) : (
                <Button
                  onClick={handleCheckForNewStudents}
                  icon={RefreshCw}
                  variant="outline"
                  loading={checkingNewStudents}
                  fullWidth
                >
                  Check for New Students
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Students Section */}
      {hasAvailableStudents && !groupsGenerated && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Students by Section
          </h2>
          <div className="space-y-8">
            {Object.keys(availableStudentsBySection).sort().map(section => (
              <div key={section}>
                <h3 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                  Section {section} ({availableStudentsBySection[section].length} students)
                </h3>
                <DataTable
                  columns={studentColumns}
                  data={availableStudentsBySection[section]}
                  pageSize={5}
                  searchable
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand New Students Section */}
      {groupsGenerated && newStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-amber-100">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">
            🆕 Brand New Students (Never Grouped Before) - {newStudents.length}
          </h2>
          <div className="space-y-8">
            {Object.keys(newStudentsBySection).sort().map(section => (
              <div key={section}>
                <h3 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                  Section {section} ({newStudentsBySection[section].length} students)
                </h3>
                <DataTable
                  columns={studentColumns}
                  data={newStudentsBySection[section]}
                  pageSize={5}
                  searchable
                />
              </div>
            ))}
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => setGroupsGenerated(false)}
                variant="primary"
              >
                Group These New Students
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No New Students Message */}
      {groupsGenerated && newStudents.length === 0 && !checkingNewStudents && (
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border-2 border-green-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-green-900 mb-2">All Students Have Been Grouped</h3>
              <p className="text-gray-600">
                Every student in {department} department has been in a group at some point.
                No brand new students available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Groups Section */}
      {existingGroups.length > 0 && (
        <div className="relative">
          {/* Decorative Background */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-purple-100/20 to-pink-100/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Section Header */}
          <div className="relative mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {groupsGenerated ? 'All Groups' : 'Existing Groups'}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {existingGroups.length} group{existingGroups.length !== 1 ? 's' : ''} formed in {department} department
                </p>
              </div>
            </div>
          </div>

          {/* Groups Grid - Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {existingGroups.map((group, index) => {
              const members = group.Members || [];
              const leader = members.find(m => m.id === group.leaderId);
              const advisor = group.Advisor;
              const section = getMemberSectionName(members[0], sectionNameMap);
              const groupDisplayName = formatGroupDisplayName(group, sectionNameMap);
              
              // Color coding based on proposal status
              const statusColors = {
                approved: {
                  border: 'border-green-200',
                  header: 'from-green-500 to-emerald-600',
                  shadow: 'shadow-green-100',
                  badge: 'bg-green-100 text-green-800 border-green-200'
                },
                pending: {
                  border: 'border-amber-200',
                  header: 'from-amber-500 to-orange-600',
                  shadow: 'shadow-amber-100',
                  badge: 'bg-amber-100 text-amber-800 border-amber-200'
                },
                rejected: {
                  border: 'border-red-200',
                  header: 'from-red-500 to-rose-600',
                  shadow: 'shadow-red-100',
                  badge: 'bg-red-100 text-red-800 border-red-200'
                },
                default: {
                  border: 'border-gray-200',
                  header: 'from-blue-500 to-indigo-600',
                  shadow: 'shadow-blue-100',
                  badge: 'bg-gray-100 text-gray-800 border-gray-200'
                }
              };

              const colors = statusColors[group.proposalStatus] || statusColors.default;

              return (
                <div
                  key={group.id || index}
                  className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border ${colors.border} overflow-hidden transition-all duration-500 hover:-translate-y-2`}
                >
                  {/* Glowing Border Effect on Hover */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${colors.header} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur`}></div>

                  <div className="relative">
                    {/* Card Header */}
                    <div className={`bg-gradient-to-r ${colors.header} px-5 py-4 relative overflow-hidden`}>
                      {/* Decorative Circles */}
                      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

                      <div className="relative flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{groupDisplayName}</h3>
                          <div className="flex items-center gap-3 text-white/90 text-sm">
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              {section}
                            </span>
                            <span>•</span>
                            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Proposal Status Badge */}
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${colors.badge} backdrop-blur-sm shadow-sm`}>
                          {group.proposalStatus || 'Not Submitted'}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Advisor Section */}
                      {advisor && (
                        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">Advisor</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                              {advisor.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{advisor.name}</p>
                              <p className="text-xs text-gray-600">{advisor.department}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Members List - VERTICAL LAYOUT */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Members ({members.length})
                          </p>
                          {leader && (
                            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              Leader: {leader.name.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Vertical Members List */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                          {members.map((member, memberIndex) => {
                            const isLeader = member.id === group.leaderId;
                            
                            return (
                              <div
                                key={member.id || memberIndex}
                                className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                                  isLeader
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300'
                                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                }`}
                              >
                                <div className="p-3">
                                  <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0 ${
                                      isLeader
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                                    }`}>
                                      {member.name?.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Member Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-bold truncate ${
                                            isLeader ? 'text-blue-900' : 'text-gray-900'
                                          }`}>
                                            {member.name}
                                          </p>
                                          <p className="text-xs text-gray-600 mt-0.5">
                                            {member.studentId}
                                          </p>
                                        </div>

                                        {/* Leader Badge */}
                                        {isLeader && (
                                          <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm flex-shrink-0">
                                            Leader
                                          </span>
                                        )}
                                      </div>

                                      {/* Member Details Row */}
                                      <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span className="text-gray-600">
                                          Gender: <span className="font-medium text-gray-800">{member.gender || 'N/A'}</span>
                                        </span>
                                        <span className="text-gray-600">
                                          CGPA: <span className={`font-bold ${
                                            parseFloat(member.cgpa) >= 3.5 ? 'text-green-600' :
                                            parseFloat(member.cgpa) >= 3.0 ? 'text-blue-600' :
                                            parseFloat(member.cgpa) >= 2.5 ? 'text-yellow-600' :
                                            'text-gray-700'
                                          }`}>
                                            {formatCGPA(member.cgpa)}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* View Details Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewGroupDetails(group)}
                        icon={Eye}
                        className="w-full mt-2 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
                      >
                        View Full Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Group Generation"
        onConfirm={handleGenerateGroups}
        confirmText="Generate Groups"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Group Formation Summary</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {availableStudents.length} students will be grouped</li>
              <li>• {numberOfGroups} groups will be created</li>
              <li>• Maximum {maxPerGroup} students per group</li>
              <li>• Students from same section will be grouped together</li>
              <li>• Top CGPA students will be assigned as group leaders</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Groups will be saved to the database. This action cannot be undone through the UI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <GroupDetailsModal
        isOpen={showGroupDetailsModal}
        onClose={() => setShowGroupDetailsModal(false)}
        group={selectedGroup}
        formatCGPA={formatCGPA}
      />
    </PageContainer>
  );
};

export default GroupGeneration;
