import React, { useEffect, useState, useMemo } from 'react';
import { UserCheck, FileText, Download, Users, CheckCircle, Clock, Mail, Eye, FolderOpen, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, academicService, sectionService } from '../../services';
import pdfService from '../../services/pdfService';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const ClaimedProjects = () => {
  const { user } = useAuth();
  const { academicYear: contextAcademicYear } = useProtectedRoute();
  const department = user?.department;
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch active academic year to get ID
  const { 
    data: activeYearData, 
    loading: activeYearLoading,
    error: activeYearError
  } = useFetch(() => academicService.getCurrentAcademicYear(), []);
  
  const activeYear = activeYearData?.academicYear;
  const academicYearId = activeYear?.id;

  // Fetch groups with advisors – try with academic year first, then fallback to without
  const { 
    data: groupsData, 
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useFetch(() => {
    // If we have a valid academic year ID, use it; otherwise fetch all years
    const params = { department };
    if (academicYearId) {
      params.academicYearId = academicYearId;
    }
    console.log('Fetching groups with params:', params);
    return groupService.getGroups(params);
  }, [department, academicYearId]);

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

  const groups = groupsData?.groups || [];
  const claimedGroups = groups.filter(g => g.advisorId);

  const handleExportPDF = () => {
    try {
      if (claimedGroups.length === 0) {
        toast.error('No claimed projects to export');
        return;
      }

      const doc = pdfService.generateClaimedProjectsPDF(claimedGroups, department, []);
      pdfService.downloadPDF(doc, `Claimed_Projects_${department}_${new Date().toISOString().split('T')[0]}`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const activeGroupCount = claimedGroups.filter(g => g.progressStatus === 'in-progress' || g.progressStatus === 'completed').length;
  const uniqueAdvisors = new Set(claimedGroups.map(g => g.advisorId)).size;

  if (activeYearLoading || groupsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading claimed projects..." />;
  }

  if (groupsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Projects</h2>
          <p className="text-gray-600 mb-6">{groupsError.message || 'There was a problem loading claimed projects.'}</p>
          <Button onClick={() => refetchGroups()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer
        actionButton={
          <Button
            variant="primary"
            size="lg"
            onClick={handleExportPDF}
            icon={Download}
            disabled={claimedGroups.length === 0}
            className="shadow-lg hover:shadow-xl transition-all"
          >
            Export PDF ({claimedGroups.length})
          </Button>
        }
      >
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-lg p-6 md:p-8 mb-6 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
          </div>

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Claimed Projects
                </h1>
                <p className="text-white/80 mt-1">
                  {activeYear?.yearName} • Semester {activeYear?.semester}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Users className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">{claimedGroups.length} project{claimedGroups.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Total Claimed - Emerald */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Total Claimed</p>
            <p className="text-2xl font-bold">{claimedGroups.length}</p>
            <p className="text-xs text-white/70 mt-1">Projects claimed by advisors</p>
          </div>

          {/* Active Advisors - Teal */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Active Advisors</p>
            <p className="text-2xl font-bold">{uniqueAdvisors}</p>
            <p className="text-xs text-white/70 mt-1">Unique advisors assigned</p>
          </div>

          {/* In Progress - Cyan */}
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">In Progress</p>
            <p className="text-2xl font-bold">{activeGroupCount}</p>
            <p className="text-xs text-white/70 mt-1">Active projects underway</p>
          </div>
        </div>

        {/* Claimed Projects Grid - Vertical Card Layout */}
        {claimedGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {claimedGroups.map((group, index) => {
              const members = group.Members || [];
              const advisor = group.Advisor;
              const section = getMemberSectionName(members[0], sectionNameMap);
              const groupDisplayName = formatGroupDisplayName(group, sectionNameMap);
              const projectTitle = group.approvedTitle;

              // Parse project title
              let displayTitle = 'N/A';
              try {
                if (typeof projectTitle === 'string') {
                  displayTitle = JSON.parse(projectTitle).title || projectTitle;
                } else if (projectTitle) {
                  displayTitle = projectTitle;
                }
              } catch {
                displayTitle = projectTitle || 'N/A';
              }

              // Progress status colors
              const progressColors = {
                'in-progress': {
                  border: 'border-amber-500',
                  header: 'from-amber-500 to-orange-600',
                  badge: 'bg-amber-100 text-amber-700'
                },
                'completed': {
                  border: 'border-green-500',
                  header: 'from-green-500 to-emerald-600',
                  badge: 'bg-green-100 text-green-700'
                },
                'not-started': {
                  border: 'border-gray-500',
                  header: 'from-gray-500 to-gray-600',
                  badge: 'bg-gray-100 text-gray-700'
                },
                default: {
                  border: 'border-teal-500',
                  header: 'from-teal-500 to-cyan-600',
                  badge: 'bg-teal-100 text-teal-700'
                }
              };

              const colors = progressColors[group.progressStatus] || progressColors.default;

              return (
                <div
                  key={group.id || index}
                  className={`group relative bg-white rounded-xl shadow-sm border-l-4 ${colors.border} hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1`}
                >
                  {/* Card Header */}
                  <div className={`bg-gradient-to-r ${colors.header} px-5 py-4 relative overflow-hidden`}>
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                    <div className="relative">
                      <h3 className="text-lg font-bold text-white mb-1">{groupDisplayName}</h3>
                      <div className="flex items-center gap-3 text-white/90 text-sm">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5" />
                          Section {section}
                        </span>
                        <span>•</span>
                        <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Project Title */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Project Title</p>
                      <p className="text-sm font-semibold text-gray-900">{displayTitle}</p>
                    </div>

                    {/* Advisor Section */}
                    {advisor && (
                      <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">Advisor</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {advisor.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{advisor.name}</p>
                            <p className="text-xs text-gray-600 truncate">{advisor.email}</p>
                          </div>
                          <Mail className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        </div>
                      </div>
                    )}

                    {/* Members Preview */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Team Members ({members.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {members.slice(0, 3).map((member, idx) => (
                          <div key={member.id || idx} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-xs ${
                              member.id === group.leaderId ? 'bg-blue-500' : 'bg-gray-400'
                            }`}>
                              {member.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
                              {member.name.split(' ')[0]}
                            </span>
                          </div>
                        ))}
                        {members.length > 3 && (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 border border-gray-200">
                            +{members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${colors.badge}`}>
                        {group.progressStatus || 'not-started'}
                      </span>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowDetailsModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 font-medium text-sm transition-all hover:shadow-md"
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
              <UserCheck className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Claimed Projects</h3>
            <p className="text-gray-500">No projects have been claimed by advisors yet.</p>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 rounded-t-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{formatGroupDisplayName(selectedGroup, sectionNameMap)}</h2>
                    <p className="text-white/90">Section {getMemberSectionName(selectedGroup.Members?.[0], sectionNameMap)} • {selectedGroup.Members?.length || 0} members</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Eye className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Project Title */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Project Title</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {(() => {
                      try {
                        return typeof selectedGroup.approvedTitle === 'string'
                          ? JSON.parse(selectedGroup.approvedTitle).title || selectedGroup.approvedTitle
                          : selectedGroup.approvedTitle || 'N/A';
                      } catch {
                        return selectedGroup.approvedTitle || 'N/A';
                      }
                    })()}
                  </p>
                </div>

                {/* Advisor */}
                {selectedGroup.Advisor && (
                  <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">Advisor</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                        {selectedGroup.Advisor.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-gray-900">{selectedGroup.Advisor.name}</p>
                        <p className="text-sm text-gray-600">{selectedGroup.Advisor.email}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedGroup.Advisor.department}</p>
                      </div>
                      <Mail className="w-6 h-6 text-teal-500" />
                    </div>
                  </div>
                )}

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
                                <span className="text-gray-600">Section: <span className="font-medium">{getMemberSectionName(member)}</span></span>
                                <span className="text-gray-600">CGPA: <span className={`font-bold ${parseFloat(member.cgpa) >= 3.5 ? 'text-green-600' : parseFloat(member.cgpa) >= 3.0 ? 'text-blue-600' : 'text-amber-600'}`}>{member.cgpa || 'N/A'}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Status */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Progress Status</h3>
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold capitalize ${
                    selectedGroup.progressStatus === 'completed' ? 'bg-green-100 text-green-700' :
                    selectedGroup.progressStatus === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedGroup.progressStatus || 'not-started'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default ClaimedProjects;
