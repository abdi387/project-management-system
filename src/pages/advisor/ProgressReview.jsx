import React, { useState, useMemo } from 'react';
import { MessageSquare, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { progressService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import TextArea from '../../components/common/TextArea';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import { buildProgressReportFileLink } from '../../utils/fileUrlUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName } from '../../utils/sectionDisplay';

const ProgressReview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();
  const currentSemester = academicYear?.semester || '1';
  const currentAcademicYearId = academicYear?.id;

  // Fetch reports for this advisor (filtered by academic year)
  const {
    data: reportsData,
    loading: reportsLoading,
    refetch: refetchReports
  } = useFetch(() => progressService.getProgressReportsByAdvisor(user.id));

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

  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter reports by current academic year and semester (semester-aware)
  const allReports = reportsData?.reports || [];
  const reports = useMemo(() => {
    if (!currentAcademicYearId || !currentSemester) {
      console.warn('[ProgressReview] Missing academic year or semester info');
      return [];
    }

    console.log('[ProgressReview] Filtering reports:', {
      totalReports: allReports.length,
      currentAcademicYearId,
      currentSemester,
      reports: allReports.map(r => ({
        id: r.id,
        title: r.title,
        reportAcademicYearId: r.Group?.academicYearId || r.academicYearId,
        reportSemester: r.semester || r.Group?.semester,
        status: r.status
      }))
    });

    const filtered = allReports.filter(report => {
      // STRICT filter: Must have academicYearId and it must match current year
      const reportAcademicYearId = report.Group?.academicYearId || report.academicYearId;
      const reportSemester = String(report.semester || report.Group?.semester || '1');
      const currentSemesterStr = String(currentSemester);
      
      const yearMatches = reportAcademicYearId === currentAcademicYearId;
      const semesterMatches = reportSemester === currentSemesterStr;
      
      console.log(`[ProgressReview] Report "${report.title}":`, {
        reportAcademicYearId,
        currentAcademicYearId,
        yearMatches,
        reportSemester,
        currentSemesterStr,
        semesterMatches,
        included: yearMatches && semesterMatches
      });
      
      return yearMatches && semesterMatches;
    }).map(report => {
      if (!report.Group) return report;

      // Extract section ID and manually fix the Group name string
      let sectionId = report.Group.section || report.Group.Members?.[0]?.section;
      let groupName = report.Group.name || '';
      
      if (!sectionId && groupName) {
        const match = groupName.match(/\(Sec\s*(section-[a-z0-9-]+)\)/i);
        if (match) sectionId = match[1];
      }

      // Direct replacement in the name string to ensure it's fixed
      if (sectionId && sectionNameMap && sectionNameMap[sectionId]) {
        groupName = groupName.replace(sectionId, sectionNameMap[sectionId]);
      }

      return {
        ...report,
        Group: {
          ...report.Group,
          name: groupName,
          section: sectionId
        }
      };
    });

    console.log('[ProgressReview] Filtered reports count:', filtered.length);
    return filtered;
  }, [allReports, currentSemester, currentAcademicYearId, sectionsData]);

  const pendingReports = reports.filter(r => r.status === 'pending');
  const reviewedReports = reports.filter(r => r.status === 'reviewed');

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter feedback');
      return;
    }

    setLoading(true);
    try {
      await progressService.addFeedback(selectedReport.id, feedback);

      toast.success('Feedback submitted successfully!');
      setShowModal(false);
      setFeedback('');
      setSelectedReport(null);
      await refetchReports();

      // Broadcast update to other pages (like dashboard) - works in same tab
      window.dispatchEvent(new CustomEvent('progress-reviews-refresh'));
      // Also set localStorage for cross-tab updates and mount-time checks
      localStorage.setItem('advisor-dashboard-refresh', Date.now().toString());
      localStorage.setItem('progress-reviews-refresh', Date.now().toString());
    } catch (error) {
      toast.error(error.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (reportsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading reports..." />;
  }

  return (
    <PageContainer
      title=""
      subtitle=""
    >
      {/* Pending Reviews */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Reviews ({pendingReports.length})
        </h2>

        {pendingReports.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-500">All caught up! No pending reviews.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReports.map((report) => (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatGroupDisplayName(report.Group, sectionNameMap)} • {report.Group?.department}
                    </p>
                    <p className="text-sm text-gray-400">
                      Submitted: {formatDate(report.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge status={report.isOverdue ? 'overdue' : 'pending'} />
                </div>

                <p className="text-gray-600 mb-4">{report.description}</p>

                <div className="flex items-center gap-3">
                  {report.fileUrl && (
                    <a
                      href={buildProgressReportFileLink(report.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      View Document
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowModal(true);
                    }}
                    icon={MessageSquare}
                    disabled={isReadOnly}
                  >
                    Add Feedback
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Reports */}
      {reviewedReports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Reviewed ({reviewedReports.length})
          </h2>
          <div className="space-y-4">
            {reviewedReports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500">{formatGroupDisplayName(report.Group, sectionNameMap)}</p>
                  </div>
                  <StatusBadge status="reviewed" />
                </div>

                <div className="bg-green-50 rounded-lg p-3 mt-3">
                  <p className="text-sm text-green-800 font-medium mb-1">Your Feedback:</p>
                  <p className="text-sm text-green-700">{report.feedback}</p>
                  <p className="text-xs text-green-600 mt-2">
                    Reviewed on {formatDate(report.reviewedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFeedback('');
          setSelectedReport(null);
        }}
        title="Provide Feedback"
        onConfirm={handleSubmitFeedback}
        confirmText="Submit Feedback"
        loading={loading}
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{selectedReport.title}</h4>
              <p className="text-sm text-gray-500 mt-1">{selectedReport.description}</p>
            </div>

            <TextArea
              label="Your Feedback"
              name="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback on the student's progress..."
              rows={5}
              required
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default ProgressReview;