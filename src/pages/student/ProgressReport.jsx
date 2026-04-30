import React, { useState, useEffect } from 'react';
import { Upload, FileText, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, progressService, proposalService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import TextArea from '../../components/common/TextArea';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import { buildProgressReportFileLink } from '../../utils/fileUrlUtils';
import toast from 'react-hot-toast';

const ProgressReport = () => {
  const { user } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();

  // Fetch group data
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
    refetch: refetchGroup
  } = useFetch(() => groupService.getGroupByStudentId(user.id), [user.id]);

  const group = groupData?.group;

  // Fetch proposal data, dependent on group
  const {
    data: proposalData,
    loading: proposalLoading,
  } = useFetch(() => group ? proposalService.getProposalByGroupId(group.id) : null, [group?.id]);
  const proposal = proposalData?.proposal;

  // Fetch progress reports, filtered by current academic year and semester
  const {
    data: reportsData,
    loading: reportsLoading,
    refetch: refetchReports,
  } = useFetch(() => group ? progressService.getProgressReportsByGroup(group.id) : null, [group?.id]);

  // Filter reports to show only those from the current academic year and semester
  const allReports = reportsData?.reports || [];
  const reports = allReports.filter(report =>
    report.academicYearId === academicYear?.id &&
    report.semester === academicYear?.semester
  );

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileName: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadingFile(true);

    try {
      const data = new FormData();
      data.append('file', file);
      const response = await progressService.uploadProgressFile(data);

      setUploadedFileName(response.originalName || response.filename);
      setFormData(prev => ({
        ...prev,
        fileUrl: response.filename,
        fileName: response.originalName || response.filename
      }));
    } catch (error) {
      const message = error.error || error.message || 'File upload failed';
      setUploadedFileName('');
      setFormData(prev => ({ ...prev, fileUrl: '', fileName: '' }));
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveUploadedFile = () => {
    setUploadedFileName('');
    setFormData(prev => ({ ...prev, fileUrl: '', fileName: '' }));
    setUploadError('');
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.fileUrl.trim()) {
      toast.error('Please fill in all required fields, including a document link or uploaded file.');
      return;
    }

    setSubmitting(true);
    try {
      // The backend requires a deadline, so we'll set one for 7 days from now.
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      await progressService.submitProgressReport({
        groupId: group.id,
        academicYearId: academicYear.id, // Pass the ID of the academic year
        semester: academicYear.semester, // Pass the current semester
        deadline: deadline.toISOString(), // Pass the calculated deadline
        ...formData
      });

      toast.success('Progress report submitted successfully!');
      setShowSubmitModal(false);
      setFormData({ title: '', description: '', fileUrl: '' });
      refetchReports(); // Refetch reports to update the list
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (groupLoading || proposalLoading || reportsLoading) {
    return <LoadingSpinner fullScreen text="Loading progress reports..." />;
  }

  // Show specific error messages based on what prerequisite is missing
  if (groupError) {
    return (
      <PageContainer title="Progress Reports">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Clock className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mb-3">Group Formation Pending</h2>
          <p className="text-blue-700 max-w-md mx-auto leading-relaxed">
            Your group is still being formed. Please wait for your department head to assign you to a group.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!group) {
    return (
      <PageContainer title="Progress Reports">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">No Group Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You need to be assigned to a group to submit progress reports. Please wait for your department head to form groups.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (proposalLoading) {
    return <LoadingSpinner fullScreen text="Loading proposal data..." />;
  }

  if (proposal?.status !== 'approved') {
    return (
      <PageContainer title="Progress Reports">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">Proposal Not Approved</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            Your project proposal must be approved before you can submit progress reports.
            Current status: <StatusBadge status={proposal?.status || 'not-submitted'} />
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!group.advisorId) {
    return (
      <PageContainer title="Progress Reports">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">No Advisor Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You need an assigned advisor before you can submit progress reports.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Show reports loading state
  if (reportsLoading) {
    return <LoadingSpinner fullScreen text="Loading reports..." />;
  }

  return (
    <PageContainer
      title="Progress Reports"
      subtitle="Track your project progress"
    >
      {/* Submit Button - Only show if there are existing reports and not read-only */}
      {!isReadOnly && reports.length > 0 && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowSubmitModal(true)} icon={Upload}>
            Submit New Report
          </Button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="relative overflow-hidden bg-white rounded-xl shadow-md text-center border border-gray-100 max-w-lg mx-auto">
          <div className="p-10">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">No Reports Yet</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Start by submitting your first progress report. Your advisor will review and provide feedback.
            </p>
            {!isReadOnly && (
              <Button onClick={() => setShowSubmitModal(true)} icon={Upload} size="lg">
                Submit First Report
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report.id} className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              {/* Subtle top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900">{report.title}</h3>
                      <StatusBadge
                        status={report.isOverdue ? 'overdue' : report.status}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Submitted on {formatDate(report.submittedAt)}
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed text-base">{report.description}</p>

                {report.fileUrl && (
                  <>
                    <a
                      href={buildProgressReportFileLink(report.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-5 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all duration-300 font-medium border border-blue-100 hover:shadow-md"
                    >
                      <FileText className="w-5 h-5" />
                      View Attached Document
                    </a>
                    {report.fileName && (
                      <p className="mt-2 text-sm text-gray-500">File name: {report.fileName}</p>
                    )}
                  </>
                )}
              </div>

              {report.feedback && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-t border-emerald-100 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-emerald-900">Advisor Feedback</h4>
                  </div>
                  <p className="text-emerald-800 mb-3 leading-relaxed">{report.feedback}</p>
                  <p className="text-sm text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Reviewed on {formatDate(report.reviewedAt)}
                  </p>
                </div>
              )}

              {!report.feedback && report.status === 'pending' && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-t border-amber-100 p-5">
                  <div className="flex items-center gap-3 text-amber-700">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Awaiting advisor review</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Progress Report"
        onConfirm={handleSubmit}
        confirmText="Submit Report"
        loading={submitting}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Title <span className="text-red-500">*</span></label>
            <InputField name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Week 3 Progress Report" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <TextArea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the progress made, challenges faced, and next steps..." rows={5} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document (optional)</label>
            <input
              id="progress-upload"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="progress-upload"
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 cursor-pointer hover:border-blue-300 hover:bg-blue-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </label>
            {uploadedFileName && (
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-700">
                <span>Uploaded file: <span className="font-medium">{uploadedFileName}</span></span>
                <button
                  type="button"
                  onClick={handleRemoveUploadedFile}
                  className="text-blue-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Optional. Upload a progress report file and its filename will be stored for advisor review. If you do not upload a file, you can provide a document URL below.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document URL {uploadedFileName ? '(optional)' : <span className="text-red-500">*</span>}
            </label>
            <InputField
              name="fileUrl"
              value={uploadedFileName ? formData.fileUrl : formData.fileUrl}
              onChange={handleChange}
              placeholder="https://drive.google.com/..."
              required={!uploadedFileName}
              disabled={uploadingFile}
            />
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default ProgressReport;
