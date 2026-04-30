import React, { useState, useMemo } from 'react';
import { FileText, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { finalDraftService, sectionService } from '../../services';
import { buildProgressReportFileLink } from '../../utils/fileUrlUtils';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName } from '../../utils/sectionDisplay';

const FinalDraftApproval = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();
  const currentSemester = academicYear?.semester || '1';

  // Fetch pending drafts
  const {
    data: draftsData,
    loading: draftsLoading,
    error: draftsError,
    refetch: refetchDrafts
  } = useFetch(() => finalDraftService.getPendingAdvisorDrafts());

  // Fetch sections to resolve section names
  const {
    data: sectionsData,
    loading: sectionsLoading
  } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      // Fallback to sectionsData if it's an array, or sectionsData.sections if it's the standard response object
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter drafts by current semester and academic year (semester-aware)
  const drafts = useMemo(() => {
    const allDrafts = draftsData?.drafts || [];
    const filtered = allDrafts.filter(draft =>
      (draft.academicYearId === academicYear?.id || draft.Group?.academicYearId === academicYear?.id) &&
      (String(draft.semester) === currentSemester ||
       (currentSemester === '1' && (!draft.semester || String(draft.semester) === '1')) ||
       (currentSemester === '2' && String(draft.semester) === '2'))
    );

    // Ensure Group object has section ID and fixed name for display
    return filtered.map(draft => {
      if (!draft.Group) return draft;
      
      let sectionId = draft.Group.section || draft.Group.Members?.[0]?.section;
      let groupName = draft.Group.name || '';

      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      // Direct replacement in the name string to ensure it's fixed before rendering
      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }
      
      return {
        ...draft,
        Group: {
          ...draft.Group,
          name: groupName,
          section: sectionId
        }
      };
    });
  }, [draftsData, currentSemester, academicYear?.id, sectionsData]);

  const pendingDrafts = drafts.filter(d => d.advisorStatus === 'pending');
  const reviewedDrafts = drafts.filter(d => d.advisorStatus !== 'pending');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await finalDraftService.approveByAdvisor(selectedDraft.id);

      toast.success('Final draft approved successfully!');
      setShowApproveModal(false);
      setSelectedDraft(null);
      await refetchDrafts();

      // Broadcast update to other pages (like dashboard) - works in same tab
      window.dispatchEvent(new CustomEvent('final-drafts-refresh'));
      // Also set localStorage for cross-tab updates and mount-time checks
      localStorage.setItem('advisor-dashboard-refresh', Date.now().toString());
      
      // Navigate back to dashboard to see updated counts
      navigate('/advisor');
    } catch (error) {
      toast.error(error.error || 'Failed to approve draft');
    } finally {
      setLoading(false);
    }
  };

  if (draftsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading drafts..." />;
  }

  if (draftsError) {
    return (
      <PageContainer title="">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Drafts</h2>
          <p className="text-red-700">{draftsError}</p>
          <Button onClick={() => refetchDrafts()} className="mt-4">
            Try Again
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title=""
      subtitle=""
    >
      {/* Pending Approvals */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Approval ({pendingDrafts.length})
        </h2>

        {pendingDrafts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No final drafts pending approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDrafts.map((item) => (
              <div key={item.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatGroupDisplayName(item.Group, sectionNameMap)} • {item.Group?.department}
                    </p>
                    <p className="text-sm text-gray-400">
                      Submitted: {formatDate(item.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge status="pending" />
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <a
                    href={buildProgressReportFileLink(item.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <FileText className="w-4 h-4" />
                    View Document
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setSelectedDraft(item);
                      setShowApproveModal(true);
                    }}
                    icon={CheckCircle}
                    disabled={isReadOnly}
                  >
                    Approve Draft
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Drafts */}
      {reviewedDrafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Reviewed Drafts ({reviewedDrafts.length})
          </h2>
          <div className="space-y-4">
            {reviewedDrafts.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  item.advisorStatus === 'approved' ? 'bg-green-50 border-green-200' :
                  item.advisorStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatGroupDisplayName(item.Group, sectionNameMap)} • {item.Group?.department}
                    </p>
                    <p className="text-sm text-gray-400">
                      Reviewed: {formatDate(item.advisorApprovedAt || item.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={item.advisorStatus} />
                </div>
                <a
                  href={buildProgressReportFileLink(item.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  View Document
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedDraft(null);
        }}
        title="Approve Final Draft"
        onConfirm={handleApprove}
        confirmText="Confirm Approval"
        confirmVariant="success"
        loading={loading}
      >
        {selectedDraft && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{selectedDraft.title}</h4>
              <p className="text-sm text-gray-500">{formatGroupDisplayName(selectedDraft.Group, sectionNameMap)}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">Final Approval</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Upon approval, this project will be marked as complete.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default FinalDraftApproval;