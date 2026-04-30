import React, { useMemo, useState } from 'react';
import { Download, Users, UserCheck, CheckCircle, Award, Calendar, BookOpen, ChevronRight, TrendingUp, TrendingDown, Minus, FolderOpen, UserPlus, FileCheck, Eye, Mail, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, academicService, sectionService } from '../../services';
import pdfService from '../../services/pdfService';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

// Safe formatter for CGPA
const formatCGPA = (cgpa) => {
  if (cgpa === null || cgpa === undefined || cgpa === '') return 'N/A';
  if (typeof cgpa === 'number') return cgpa.toFixed(2);
  if (typeof cgpa === 'string') {
    const parsed = parseFloat(cgpa);
    if (!isNaN(parsed)) return parsed.toFixed(2);
  }
  return 'N/A';
};

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const GroupInformation = () => {
  const { user } = useAuth();
  const { academicYear: contextAcademicYear } = useProtectedRoute();
  const department = user?.department;

  // Fetch the active academic year to get the ID
  const { 
    data: activeYearData, 
    loading: activeYearLoading 
  } = useFetch(() => academicService.getCurrentAcademicYear(), []);

  const activeYear = activeYearData?.academicYear;
  const academicYearId = activeYear?.id;

  // Fetch groups with the correct academic year ID
  const { 
    data: groupsData, 
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useFetch(() => {
    if (!academicYearId) {
      return groupService.getGroups({ department });
    }
    return groupService.getGroups({ 
      department, 
      academicYearId: academicYearId 
    });
  }, [department, academicYearId]);

  const groups = groupsData?.groups || [];

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(department, true),
    [department],
    !!department
  );

  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );

  const handleExportPDF = () => {
    try {
      if (groups.length === 0) {
        toast.error('No groups to export');
        return;
      }

      const academicYearLabel = contextAcademicYear?.yearName || contextAcademicYear?.current || '';
      console.log('Generating PDF with:', { groupsCount: groups.length, department, academicYearLabel });
      const doc = pdfService.generateGroupInformationStunningPDF(groups, department, academicYearLabel);
      pdfService.downloadPDF(doc, `Group_Information_${department}_${new Date().toISOString().split('T')[0]}`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(`Failed to export PDF: ${error.message || 'Unknown error'}`);
    }
  };

  // Helper functions for formatting data
  const formatProjectTitle = (title) => {
    if (!title) return <span className="text-sm text-gray-400 italic">No title approved</span>;
    try {
      if (typeof title === 'string' && (title.startsWith('{') || title.startsWith('['))) {
        const parsed = JSON.parse(title);
        return <span className="text-sm text-gray-900 font-medium">{parsed.title || JSON.stringify(parsed)}</span>;
      }
      return <span className="text-sm text-gray-900 font-medium">{title}</span>;
    } catch {
      return <span className="text-sm text-gray-900 font-medium">{title}</span>;
    }
  };

  const getGroupSection = (group) => {
    const firstMember = group.Members?.[0];
    return getMemberSectionName(firstMember, sectionNameMap);
  };

  const formatMembersList = (group) => {
    const members = group.Members || [];
    if (members.length === 0) return <span className="text-sm text-gray-400 italic">No members</span>;
    
    return (
      <div className="flex flex-col gap-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {member.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">{member.name}</span>
                {member.id === group.leaderId && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-medium shadow-sm">
                    👑 Leader
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>ID: {member.studentId}</span>
                <span className={`font-semibold ${
                  parseFloat(member.cgpa) >= 3.5 ? 'text-green-600' :
                  parseFloat(member.cgpa) >= 3.0 ? 'text-blue-600' :
                  parseFloat(member.cgpa) >= 2.5 ? 'text-yellow-600' :
                  'text-gray-500'
                }`}>
                  CGPA: {formatCGPA(member.cgpa)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const formatEvaluatorsList = (group) => {
    const evaluators = group.Evaluators || [];
    if (evaluators.length === 0) {
      return <span className="text-sm text-gray-400 italic">Not assigned yet</span>;
    }
    
    return (
      <div className="flex flex-col gap-2">
        {evaluators.map(evaluator => (
          <div key={evaluator.id} className="flex items-center gap-2 text-sm bg-purple-50 p-2 rounded-lg border border-purple-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {evaluator.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{evaluator.name}</div>
              <div className="text-xs text-gray-500 truncate">{evaluator.email}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Calculate statistics
  const totalGroups = groups.length;
  const groupsWithAdvisor = groups.filter(g => g.advisorId).length;
  const groupsWithEvaluators = groups.filter(g => g.Evaluators?.length > 0).length;
  const approvedProposals = groups.filter(g => g.proposalStatus === 'approved').length;
  const pendingProposals = groups.filter(g => g.proposalStatus === 'pending').length;
  const completedGroups = groups.filter(g => g.finalDraftStatus === 'fully-approved').length;

  // Calculate trends (mock data - you can replace with actual trend data)
  const advisorCoverage = totalGroups ? (groupsWithAdvisor / totalGroups) * 100 : 0;
  const completionRate = totalGroups ? (completedGroups / totalGroups) * 100 : 0;

  // Define columns for the DataTable with enhanced styling
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Group',
      render: (name, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
            {name?.replace('Group', '').trim() || 'G'}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{formatGroupDisplayName(row, sectionNameMap)}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {row.Members?.length || 0} members
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const section = getGroupSection(row);
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              {section}
            </div>
            <span className="font-medium text-gray-700">Section {section}</span>
          </div>
        );
      }
    },
    {
      key: 'members',
      label: 'Team Members',
      render: (_, row) => formatMembersList(row)
    },
    {
      key: 'advisorId',
      label: 'Advisor',
      render: (_, row) => {
        const advisor = row.Advisor;
        return advisor ? (
          <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
              {advisor.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{advisor.name}</div>
              <div className="text-xs text-gray-500">{advisor.email}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
              ?
            </div>
            <span className="text-sm text-gray-400 italic">Unassigned</span>
          </div>
        );
      }
    },
    {
      key: 'approvedTitle',
      label: 'Project',
      render: (title, row) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900 mb-1">
            {formatProjectTitle(title)}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <StatusBadge status={row.proposalStatus || 'pending'} size="sm" />
            <StatusBadge status={row.finalDraftStatus || 'not-submitted'} size="sm" />
          </div>
        </div>
      )
    },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (_, row) => formatEvaluatorsList(row)
    }
  ], [sectionNameMap]);

  // Loading state
  if (activeYearLoading || groupsLoading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-base">Loading group information...</p>
        </div>
      </div>
    );
  }

  // No active academic year
  if (!activeYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No Active Academic Year</h2>
          <p className="text-gray-600 mb-6">Please activate an academic year to view groups.</p>
          <Button onClick={() => window.location.reload()} className="shadow-lg">
            Refresh Page
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        {/* Export Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleExportPDF}
            icon={Download}
            disabled={totalGroups === 0}
            className="shadow-lg hover:shadow-xl transition-all"
          >
            Export PDF ({totalGroups})
          </Button>
        </div>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-lg p-5 md:p-6 mb-6 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
          </div>

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Group Information
                </h1>
                <p className="text-white/80 mt-1">
                  {activeYear?.yearName} • Semester {activeYear?.semester}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full ${activeYear?.status === 'active' ? 'bg-green-400' : 'bg-white/50'}`}></div>
              <span className="text-sm font-medium text-white capitalize">{activeYear?.status}</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Total Groups - Blue */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Total Groups</p>
            <p className="text-2xl font-bold">{totalGroups}</p>
            <p className="text-xs text-white/70 mt-1">Across all sections</p>
          </div>

          {/* With Advisor - Emerald */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white/90">{advisorCoverage.toFixed(0)}%</span>
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">With Advisor</p>
            <p className="text-2xl font-bold">{groupsWithAdvisor}</p>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${advisorCoverage}%` }}
              />
            </div>
          </div>

          {/* Approved Proposals - Purple */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white/90">{approvedProposals}/{totalGroups}</span>
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Approved Proposals</p>
            <p className="text-2xl font-bold">{approvedProposals}</p>
            <p className="text-xs text-white/70 mt-1">Pending: {pendingProposals}</p>
          </div>
        </div>

        {/* Groups Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Groups</h2>
              <p className="text-sm text-gray-500">
                {totalGroups} group{totalGroups !== 1 ? 's' : ''} • {groups.reduce((sum, g) => sum + (g.Members?.length || 0), 0)} total members
              </p>
            </div>
          </div>
        </div>

        {/* Groups Grid - Vertical Card Layout */}
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map((group, index) => {
              const members = group.Members || [];
              const advisor = group.Advisor;
              const evaluators = group.Evaluators || [];
              const section = getGroupSection(group);
              const leader = members.find(m => m.id === group.leaderId);
              const approvedTitle = group.approvedTitle;

              // Color based on proposal status
              const statusColors = {
                approved: {
                  border: 'border-green-500',
                  header: 'from-green-500 to-emerald-600',
                  badge: 'bg-green-100 text-green-700 border-green-200',
                  icon: 'bg-green-50 text-green-600'
                },
                pending: {
                  border: 'border-amber-500',
                  header: 'from-amber-500 to-orange-600',
                  badge: 'bg-amber-100 text-amber-700 border-amber-200',
                  icon: 'bg-amber-50 text-amber-600'
                },
                rejected: {
                  border: 'border-red-500',
                  header: 'from-red-500 to-rose-600',
                  badge: 'bg-red-100 text-red-700 border-red-200',
                  icon: 'bg-red-50 text-red-600'
                },
                default: {
                  border: 'border-indigo-500',
                  header: 'from-indigo-500 to-blue-600',
                  badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                  icon: 'bg-indigo-50 text-indigo-600'
                }
              };

              const colors = statusColors[group.proposalStatus] || statusColors.default;

              return (
                <div
                  key={group.id || index}
                  className={`group relative bg-white rounded-xl shadow-sm border-l-4 ${colors.border} hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1`}
                >
                  {/* Card Header */}
                  <div className={`bg-gradient-to-r ${colors.header} px-4 py-3 relative overflow-hidden`}>
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{formatGroupDisplayName(group, sectionNameMap)}</h3>
                        <div className="flex items-center gap-3 text-white/90 text-sm">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3.5 h-3.5" />
                            Section {section}
                          </span>
                          <span>•</span>
                          <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors.badge} capitalize`}>
                        {group.proposalStatus || 'pending'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-4">
                    {/* Members Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Members</h4>
                        {leader && (
                          <span className="text-xs text-indigo-600 font-medium">
                            Leader: {leader.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {members.map((member, memberIndex) => {
                          const isLeader = member.id === group.leaderId;
                          return (
                            <div
                              key={member.id || memberIndex}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                isLeader
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-gray-50 border-gray-100'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                  isLeader
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-400 text-white'
                                }`}>
                                  {member.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${
                                        isLeader ? 'text-blue-900' : 'text-gray-900'
                                      }`}>
                                        {member.name}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {member.studentId}
                                      </p>
                                    </div>
                                    {isLeader && (
                                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-md flex-shrink-0">
                                        Leader
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                                    <span className="text-gray-600">
                                      CGPA: <span className={`font-bold ${
                                        parseFloat(member.cgpa) >= 3.5 ? 'text-green-600' :
                                        parseFloat(member.cgpa) >= 3.0 ? 'text-blue-600' :
                                        parseFloat(member.cgpa) >= 2.5 ? 'text-amber-600' :
                                        'text-gray-600'
                                      }`}>
                                        {formatCGPA(member.cgpa)}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Advisor Section */}
                    {advisor && (
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Advisor</p>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {advisor.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{advisor.name}</p>
                            <p className="text-xs text-gray-600">{advisor.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Evaluators Section */}
                    {evaluators.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">Evaluators ({evaluators.length})</p>
                        <div className="space-y-2">
                          {evaluators.map((evaluator, evalIndex) => (
                            <div key={evaluator.id || evalIndex} className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {evaluator.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{evaluator.name}</p>
                                <p className="text-xs text-gray-600 truncate">{evaluator.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Details Button */}
                    <button
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowGroupModal(true);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all hover:shadow-md ${
                        group.proposalStatus === 'approved'
                          ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                          : group.proposalStatus === 'pending'
                          ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      View Full Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Found</h3>
            <p className="text-gray-500">No groups found in {department} department for the current academic year.</p>
          </div>
        )}

        {/* Group Details Modal */}
        {showGroupModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowGroupModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 rounded-t-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{formatGroupDisplayName(selectedGroup, sectionNameMap)}</h2>
                    <p className="text-white/90">Section {getGroupSection(selectedGroup)} • {selectedGroup.Members?.length || 0} members</p>
                  </div>
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Eye className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Members */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Team Members</h3>
                  <div className="space-y-2">
                    {selectedGroup.Members?.map((member, idx) => {
                      const isLeader = member.id === selectedGroup.leaderId;
                      return (
                        <div key={member.id || idx} className={`p-4 rounded-lg border-2 ${isLeader ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${isLeader ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}>
                              {member.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-lg font-bold text-gray-900">{member.name}</p>
                                {isLeader && (
                                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-md">
                                    Leader
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{member.studentId}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-600">Gender: <span className="font-medium">{member.gender || 'N/A'}</span></span>
                                <span className="text-gray-600">CGPA: <span className={`font-bold ${parseFloat(member.cgpa) >= 3.5 ? 'text-green-600' : parseFloat(member.cgpa) >= 3.0 ? 'text-blue-600' : 'text-amber-600'}`}>{formatCGPA(member.cgpa)}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advisor */}
                {selectedGroup.Advisor && (
                  <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                    <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-3">Advisor</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                        {selectedGroup.Advisor.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{selectedGroup.Advisor.name}</p>
                        <p className="text-sm text-gray-600">{selectedGroup.Advisor.email}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedGroup.Advisor.department}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evaluators */}
                {selectedGroup.Evaluators?.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                    <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider mb-3">Evaluators</h3>
                    <div className="space-y-3">
                      {selectedGroup.Evaluators.map((evaluator, idx) => (
                        <div key={evaluator.id || idx} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {evaluator.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{evaluator.name}</p>
                            <p className="text-sm text-gray-600">{evaluator.email}</p>
                          </div>
                          <Mail className="w-5 h-5 text-purple-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Status */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Project Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Proposal Status</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${
                        selectedGroup.proposalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        selectedGroup.proposalStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                        selectedGroup.proposalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedGroup.proposalStatus || 'not-submitted'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Final Draft</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${
                        selectedGroup.finalDraftStatus === 'fully-approved' ? 'bg-green-100 text-green-700' :
                        selectedGroup.finalDraftStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedGroup.finalDraftStatus || 'not-submitted'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default GroupInformation;
