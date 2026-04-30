import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, finalDraftService, progressService, proposalService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import { buildProgressReportFileLink } from '../../utils/fileUrlUtils';
import toast from 'react-hot-toast';

const FinalDraft = () => {
  const { user } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();

  // Fetch group data
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
  } = useFetch(() => groupService.getGroupByStudentId(user.id), [user.id]);
  const group = groupData?.group;

  // Fetch proposal data, dependent on group
  const {
    data: proposalData,
    loading: proposalLoading,
  } = useFetch(() => group ? proposalService.getProposalByGroupId(group.id) : null, [group?.id]);
  const proposal = proposalData?.proposal;

  // Fetch final draft data, filtered by current academic year and semester
  const {
    data: draftData,
    loading: draftLoading,
    refetch: refetchDraft,
  } = useFetch(() => group ? finalDraftService.getFinalDraftByGroup(group.id) : null, [group?.id]);

  // Filter final drafts by academic year and semester
  const allDrafts = draftData?.drafts || [];

  // Get the current academic year's semester and ensure it's a string '1' or '2'
  const currentSemesterValue = academicYear?.semester;
  const currentAcademicYearSemester = currentSemesterValue === 2 || currentSemesterValue === '2' ? '2' : '1';

  console.log('FinalDraft Debug:', {
    academicYear,
    currentAcademicYearSemester,
    allDrafts: allDrafts.map(d => ({
      id: d.id,
      semester: d.semester,
      academicYearId: d.academicYearId,
      title: d.title
    }))
  });

  // Get ONLY the draft for the CURRENT semester
  const currentSemesterDraft = allDrafts.find(
    draft => {
      const draftSemester = draft.semester === 2 || draft.semester === '2' ? '2' : '1';
      return draft.academicYearId === academicYear?.id && draftSemester === currentAcademicYearSemester;
    }
  ) || null;

  // Current semester
  const currentSemester = currentAcademicYearSemester;

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    fileUrl: '',
    fileName: ''
  });
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Set title from approved proposal
  useEffect(() => {
    let titleToSet = '';
    // The group's approvedTitle is the most reliable source
    if (group?.approvedTitle) {
      try {
        // It might be a JSON string like '{"title":"My Project"}'
        const parsedTitle = JSON.parse(group.approvedTitle);
        titleToSet = parsedTitle.title || group.approvedTitle;
      } catch {
        // Or just a plain string
        titleToSet = group.approvedTitle;
      }
    }
    // Fallback to the proposal data if group title isn't set
    else if (proposal?.status === 'approved' && proposal.Titles) {
      const approvedTitleIndex = proposal.approvedTitleIndex || 0;
      const approvedTitleObject = proposal.Titles[approvedTitleIndex];
      if (approvedTitleObject) {
        titleToSet = approvedTitleObject.title;
      }
    }

    if (titleToSet) {
      setFormData(prev => ({ ...prev, title: titleToSet }));
    }
  }, [proposal, group?.approvedTitle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleResubmit = () => {
    setFormData(prev => ({ ...prev, fileUrl: '' })); // Clear old URL
    setUploadedFileName('');
    setUploadError('');
    setShowSubmitForm(true);
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
    if (!formData.fileUrl.trim()) {
      toast.error('Please provide a file URL');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        groupId: group.id,
        ...formData
      };

      // If resubmitting a rejected draft, we pass the draft ID to update it
      if (currentSemesterDraft?.id && currentSemesterDraft.advisorStatus === 'rejected') {
        payload.draftId = currentSemesterDraft.id;
      }
      await finalDraftService.submitFinalDraft(payload);

      toast.success('Final draft submitted successfully!');
      setShowSubmitModal(false);
      setShowSubmitForm(false); // Hide form after resubmission
      refetchDraft(); // Refetch the draft data to update the UI
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to submit final draft');
    } finally {
      setSubmitting(false);
    }
  };

  // Combined loading state
  if (groupLoading || (group && (proposalLoading || draftLoading))) {
    return <LoadingSpinner fullScreen text="Loading final draft information..." />;
  }

  // Check prerequisites
  if (!group) {
    return (
      <PageContainer title="Final Draft">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">No Group Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You need to be assigned to a group to submit a final draft.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Show loading while proposal is loading
  if (group && !proposal) {
    return (
      <PageContainer title="Final Draft">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">No Proposal Found</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You need to submit a proposal before submitting a final draft.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (proposal?.status !== 'approved') {
    return (
      <PageContainer title="Final Draft">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">Proposal Not Approved</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            Your project proposal must be approved before you can submit a final draft.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!group.advisorId) {
    return (
      <PageContainer title="Final Draft">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">No Advisor Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You need an assigned advisor before you can submit your final draft.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Check if draft is rejected (allows resubmission)
  const isRejected = currentSemesterDraft?.advisorStatus === 'rejected';
  const showingSubmitForm = showSubmitForm || isRejected;

  // Helper component to render the current semester's draft card
  const renderDraftCard = () => {
    if (!currentSemesterDraft || showingSubmitForm) {
      return null;
    }

    return (
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg mb-8 border border-gray-100">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 p-6">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              Semester {currentSemester} - Final Draft
            </h3>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Times New Roman, serif' }}>{currentSemesterDraft.title}</h2>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Submitted on {formatDate(currentSemesterDraft.submittedAt)}
              </p>
            </div>
            <StatusBadge status={currentSemesterDraft.advisorStatus || 'pending'} />
          </div>

          {/* Approval Status */}
          <div className={`grid grid-cols-1 gap-5 mb-8 p-6 rounded-xl border-2 transition-all ${
            currentSemesterDraft.advisorStatus === 'approved'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50'
              : currentSemesterDraft.advisorStatus === 'rejected'
              ? 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50'
              : 'border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50'
          }`}>
            <div className="flex items-center gap-4">
              {currentSemesterDraft.advisorStatus === 'approved' ? (
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
              ) : currentSemesterDraft.advisorStatus === 'rejected' ? (
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              ) : (
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900">Advisor Approval</h3>
                <StatusBadge
                  status={currentSemesterDraft.advisorStatus || 'pending'}
                  size="sm"
                />
              </div>
            </div>
            {currentSemesterDraft.advisorApprovedAt && (
              <p className="text-sm text-gray-600">
                Approved on {formatDate(currentSemesterDraft.advisorApprovedAt)}
              </p>
            )}
          </div>

          {/* File Link */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">Submitted Document</h3>
            <a
              href={buildProgressReportFileLink(currentSemesterDraft.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all duration-300 font-medium border border-blue-100 hover:shadow-md"
            >
              <FileText className="w-5 h-5" />
              View Document
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {currentSemesterDraft.fileName && (
              <p className="mt-2 text-sm text-gray-500">File name: {currentSemesterDraft.fileName}</p>
            )}
          </div>

          {/* Rejection Feedback Display */}
          {currentSemesterDraft.advisorStatus === 'rejected' && currentSemesterDraft.advisorFeedback && (
            <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="font-bold text-red-900">Advisor Feedback for Rejection</h4>
              </div>
              <p className="text-red-800 whitespace-pre-wrap leading-relaxed text-sm">
                {currentSemesterDraft.advisorFeedback}
              </p>
            </div>
          )}

          {/* Status Messages */}
          {currentSemesterDraft.advisorStatus === 'approved' && (
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-5 rounded-xl mt-6 shadow-md">
              <div className="flex items-center gap-4 text-white">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="font-bold text-lg">
                  Congratulations! Your final draft has been approved by your advisor.
                </p>
              </div>
            </div>
          )}

          {currentSemesterDraft.advisorStatus === 'rejected' && !isReadOnly && (
            <div className="bg-gradient-to-r from-red-500 to-rose-500 p-5 rounded-xl mt-6 shadow-md flex items-center justify-between">
              <div className="flex items-center gap-4 text-white">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="font-bold">
                  Your final draft was rejected. Please check the feedback and resubmit.
                </p>
              </div>
              <Button
                onClick={handleResubmit}
                variant="light"
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              >
                Resubmit Draft
              </Button>
            </div>
          )}

          {currentSemesterDraft.advisorStatus === 'pending' && (
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-5 rounded-xl mt-6 shadow-md">
              <div className="flex items-center gap-4 text-white">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="font-bold">
                  Your final draft is under review by your advisor.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper component to render submission card for current semester
  const renderSubmissionCard = () => {
    const isRejected = currentSemesterDraft?.advisorStatus === 'rejected';
    const showForm = showingSubmitForm;

    // If draft exists and is not rejected, don't show submission card
    if (currentSemesterDraft && !isRejected) {
      return null;
    }

    // If showing form for this semester
    if (showForm) {
      return (
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg mb-8 border-2 border-blue-200">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {isRejected
                  ? `Resubmit Final Draft for Semester ${currentSemester}`
                  : `Submit Final Draft for Semester ${currentSemester}`
                }
              </h3>
            </div>
            
            <div className="space-y-6">
              <InputField
                label="Project Title"
                name="title"
                value={formData.title}
                disabled
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document (optional)</label>
                <input
                  id="final-draft-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="final-draft-upload"
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
                  Optional. Upload a final draft document and its filename will be stored for advisor review. If you do not upload a file, you can provide a document URL below.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document URL {uploadedFileName ? '(optional)' : <span className="text-red-500">*</span>}
                </label>
                <InputField
                  name="fileUrl"
                  value={formData.fileUrl}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                  required={!uploadedFileName}
                  disabled={uploadingFile}
                />
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                Please provide a link to your final project document (Google Drive, Dropbox, etc.).
                Make sure the link is accessible to your advisor.
              </p>

              <div className="flex gap-4 pt-2">
                <Button
                  onClick={handleSubmit}
                  icon={Upload}
                  loading={submitting}
                  disabled={isReadOnly || !formData.fileUrl.trim()}
                >
                  {isRejected ? 'Resubmit Draft' : 'Submit Draft'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSubmitForm(false);
                    setFormData(prev => ({ ...prev, fileUrl: '' }));
                  }}
                  disabled={isReadOnly}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show submit button card
    return (
      <div className="relative overflow-hidden bg-white rounded-xl shadow-md mb-8 border border-gray-100 max-w-lg mx-auto">
        <div className="text-center py-8 px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 mb-6 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">Approved Project Title</h3>
            <p className="text-blue-700 font-bold text-sm" style={{ fontFamily: 'Times New Roman, serif' }}>
              {formData.title || 'Loading...'}
            </p>
          </div>

          {!isReadOnly && (
            <Button
              onClick={() => setShowSubmitForm(true)}
              icon={Upload}
              size="lg"
            >
              Submit Final Draft
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Submit new final draft
  return (
    <PageContainer
      title="Final Draft Submission"
      subtitle={`Semester ${currentSemester} - ${academicYear?.yearName || 'Current Academic Year'}`}
    >
      {/* Current Semester Draft Card (if submitted) */}
      {renderDraftCard()}

      {/* Current Semester Submission Card (if not submitted or rejected) */}
      {!currentSemesterDraft || currentSemesterDraft?.advisorStatus === 'rejected' ? renderSubmissionCard() : null}

      {/* Info Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-xl shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-3">Approval Process</h3>
            <ol className="text-sm text-blue-700 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">1</span>
                Submit your final draft document
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">2</span>
                Your advisor reviews and approves the draft
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">3</span>
                Your project is ready for defense scheduling
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => {
          setShowSubmitModal(false);
          if (!showingSubmitForm) {
            setShowSubmitForm(false);
          }
        }}
        title={isRejected ? `Resubmit Final Draft - Semester ${currentSemester}` : `Submit Final Draft - Semester ${currentSemester}`}
        onConfirm={handleSubmit}
        confirmText="Submit Draft"
        loading={submitting}
      >
        <div className="space-y-4">
          <InputField
            label="Project Title"
            name="title"
            value={formData.title}
            disabled
          />

          <InputField
            label="Document URL"
            name="fileUrl"
            value={formData.fileUrl}
            onChange={handleChange}
            placeholder="https://drive.google.com/..."
            required
          />

          <p className="text-sm text-gray-500">
            Please provide a link to your final project document (Google Drive, Dropbox, etc.).
            Make sure the link is accessible to your advisor.
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default FinalDraft;
