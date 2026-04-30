import React, { useState, useMemo } from 'react';
import { FileText, Download, AlertCircle, RefreshCw, Eye, Users, CheckCircle, Clock, FolderOpen, Mail, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { academicService, sectionService } from '../../services';
import api from '../../services/apiConfig';
import pdfService from '../../services/pdfService';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import ErrorAlert from '../../components/common/ErrorAlert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildProgressReportFileLink } from '../../utils/fileUrlUtils';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const DeptFinalDrafts = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const department = user?.department;
  const [fetchError, setFetchError] = useState(null);

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const {
    data: activeYearData,
    loading: activeYearLoading,
    error: activeYearError,
  } = useFetch(() => academicService.getCurrentAcademicYear(), []);

  const academicYearId = academicYear?.id || activeYearData?.academicYear?.id;
  const currentSemester = academicYear?.semester || '1';

  const {
    data: draftsData,
    loading: draftsLoading,
    error: draftsErrorRaw,
    refetch: refetchDrafts
  } = useFetch(async () => {
    // Pass both academicYearId and semester to the backend
    const response = await api.get(`/final-drafts/department/${department}?academicYearId=${academicYearId}&semester=${currentSemester}`);
    return response.data;
  }, [department, academicYearId, currentSemester], !!(department && academicYearId));

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

  const draftsError = useMemo(() => {
    return draftsErrorRaw?.message || draftsErrorRaw?.error || draftsErrorRaw
  }, [draftsErrorRaw])

  // Filter drafts by current semester for semester-aware display
  // Backend already filters by academicYearId and semester, this is just for extra safety
  const allDrafts = useMemo(() => draftsData?.drafts || [], [draftsData]);
  const drafts = useMemo(() => {
    return allDrafts.filter(draft => {
      // Check draft's academicYearId if available
      if (draft.academicYearId && academicYearId) {
        if (draft.academicYearId !== academicYearId) return false;
      }
      
      // Check semester (compare as strings)
      const draftSemester = String(draft.semester || '1');
      const currentSemesterStr = String(currentSemester);
      return draftSemester === currentSemesterStr;
    });
  }, [allDrafts, currentSemester, academicYearId]);

  const handleExportPDF = () => {
    try {
      if (drafts.length === 0) {
        toast.error('No approved drafts to export');
        return;
      }
      const doc = pdfService.generateFinalDraftsPDF(drafts, department);
      const filename = `Approved_Drafts_${department?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      pdfService.downloadPDF(doc, filename);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const handleRowClick = (draft) => {
    setSelectedDraft(draft);
    setShowDetailsModal(true);
  };

  if (!department) {
    return (
      <PageContainer title="Final Draft Supervision">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          {fetchError && (
            <div className="mb-4">
              <ErrorAlert message={fetchError} />
            </div>
          )}
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Department Assigned</h2>
          <p className="text-yellow-700">Your user account is not associated with any department.</p>
        </div>
      </PageContainer>
    );
  }

  if (activeYearLoading || draftsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading final drafts..." />;
  }

  if (activeYearError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Academic Year</h2>
          {fetchError && (
            <div className="mb-4">
              <ErrorAlert message={fetchError} />
            </div>
          )}
          <p className="text-gray-600 ">
            Could not determine the current academic year. This is required to load drafts.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      </div>
    );
  }

  if (draftsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          {fetchError && (
            <div className="mb-4">
              <ErrorAlert message={fetchError} />
            </div>
          )}
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Drafts</h2>
          <p className="text-gray-600 mb-6">
            {typeof draftsError === 'string' ? draftsError : 'There was a problem loading final drafts. Please check the console for more details.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            <Button variant="outline" onClick={() => refetchDrafts()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const approvedCount = drafts.filter(d => d.advisorStatus === 'approved').length;
  const pendingCount = drafts.filter(d => d.advisorStatus === 'pending').length;
  const uniqueGroups = new Set(drafts.map(d => d.Group?.id)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer
        actionButton={
          <Button
            variant="primary"
            size="lg"
            onClick={handleExportPDF}
            icon={Download}
            disabled={drafts.length === 0}
            className="shadow-lg hover:shadow-xl transition-all"
          >
            Export PDF ({drafts.length})
          </Button>
        }
      >
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl shadow-lg p-6 md:p-8 mb-6 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
          </div>

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Final Draft Supervision
                </h1>
                <p className="text-white/80 mt-1">
                  {activeYearData?.academicYear?.yearName || 'N/A'} • Semester {currentSemester}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FolderOpen className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Total Drafts - Purple */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <Award className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Total Drafts</p>
            <p className="text-2xl font-bold">{drafts.length}</p>
            <p className="text-xs text-white/70 mt-1">Submitted final drafts</p>
          </div>

          {/* Approved - Emerald */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <Award className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Approved</p>
            <p className="text-2xl font-bold">{approvedCount}</p>
            <p className="text-xs text-white/70 mt-1">Approved by advisor</p>
          </div>

          {/* Pending - Amber */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <Award className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">Pending</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-white/70 mt-1">Awaiting approval</p>
          </div>
        </div>

        {/* Drafts Grid - Vertical Card Layout */}
        {drafts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {drafts.map((draft, index) => {
              const group = draft.Group;
              const members = group?.Members || [];
              const advisor = group?.Advisor;
              const section = getMemberSectionName(members[0], sectionNameMap);
              const isApproved = draft.advisorStatus === 'approved';

              return (
                <div
                  key={draft.id || index}
                  className={`group relative bg-white rounded-xl shadow-sm border-l-4 ${
                    isApproved ? 'border-emerald-500' : 'border-amber-500'
                  } hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 cursor-pointer`}
                  onClick={() => handleRowClick(draft)}
                >
                  {/* Card Header */}
                  <div className={`bg-gradient-to-r ${
                    isApproved ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-orange-600'
                  } px-5 py-4 relative overflow-hidden`}>
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                    <div className="relative">
                      <h3 className="text-lg font-bold text-white mb-2 leading-tight line-clamp-2">
                        {draft.title || 'Untitled Project'}
                      </h3>
                      <div className="flex items-center gap-3 text-white/90 text-sm">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5" />
                          {formatGroupDisplayName(group, sectionNameMap) || 'Unknown Group'}
                        </span>
                        <span>•</span>
                        <span>Sec {section}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Advisor Section */}
                    {advisor && (
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Advisor</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {advisor.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{advisor.name}</p>
                            <p className="text-xs text-gray-600 truncate">{advisor.email}</p>
                          </div>
                          <Mail className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        </div>
                      </div>
                    )}

                    {/* Members Preview */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Team ({members.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {members.slice(0, 3).map((member, idx) => (
                          <div key={member.id || idx} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
                            <div className="w-6 h-6 rounded-md bg-gray-400 flex items-center justify-center text-white font-bold text-xs">
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

                    {/* Submission Date & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(draft.submittedAt)}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${
                        isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>

                    {/* Document Link */}
                    {draft.fileUrl && (
                      <a
                        href={buildProgressReportFileLink(draft.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 font-medium text-sm transition-all hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        View Document
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Final Drafts</h3>
            <p className="text-gray-500">No final drafts available for your department this semester.</p>
          </div>
        )}

        {/* Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Draft Submission Details"
          size="lg"
          showFooter={true}
          footerContent={
            <div className="flex justify-end items-center gap-3 w-full">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              {selectedDraft?.fileUrl && (
                <a
                  href={buildProgressReportFileLink(selectedDraft.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Open Document
                </a>
              )}
            </div>
          }
        >
          {selectedDraft && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Project Title</h3>
                <p className="text-xl font-bold text-gray-900 leading-tight">{selectedDraft.title || 'N/A'}</p>
              </div>

              {/* Final Draft Document Section */}
              {selectedDraft.fileUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Final Draft Document</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 mb-3">
                    <p className="text-sm text-gray-600 mb-2">Submitted Document URL:</p>
                    <a
                      href={buildProgressReportFileLink(selectedDraft.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                    >
                      {selectedDraft.fileUrl}
                    </a>
                  </div>
                  <a
                    href={buildProgressReportFileLink(selectedDraft.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Document
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-500 block mb-1">Group Name</span>
                  <p className="font-semibold text-gray-900">{formatGroupDisplayName(selectedDraft.Group, sectionNameMap) || 'Unknown'}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-500 block mb-1">Section</span>
                  <p className="font-semibold text-gray-900">
                    {getMemberSectionName(selectedDraft.Group?.Members?.[0], sectionNameMap)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-500 block mb-1">Advisor</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                      {selectedDraft.Group?.Advisor?.name?.charAt(0)}
                    </div>
                    <p className="font-semibold text-gray-900">{selectedDraft.Group?.Advisor?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-500 block mb-1">Submission Date</span>
                  <p className="font-semibold text-gray-900">{formatDate(selectedDraft.submittedAt)}</p>
                </div>
              </div>

              {selectedDraft.Group?.Members && selectedDraft.Group.Members.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" /> Group Members
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDraft.Group.Members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="font-medium text-sm text-gray-900">{member.name}</span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{member.studentId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </PageContainer>
    </div>
  );
};

export default DeptFinalDrafts;
