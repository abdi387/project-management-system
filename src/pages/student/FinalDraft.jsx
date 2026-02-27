// src/pages/student/FinalDraft.jsx
import React, { useState } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const FinalDraft = () => {
  const { user } = useAuth();
  const { getGroupByStudentId, getFinalDraftByGroup, submitFinalDraft, getProposalByGroupId, academicYear, isReadOnly } = useProject();
  const { notifyFinalDraftSubmission } = useNotification();
  
  const group = getGroupByStudentId(user?.id);
  const proposal = group ? getProposalByGroupId(group.id) : null;
  const finalDraft = group ? getFinalDraftByGroup(group.id) : null;
  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: group?.approvedTitle || '',
    fileUrl: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.fileUrl.trim()) {
      toast.error('Please provide a file URL');
      return;
    }

    setLoading(true);
    try {
      submitFinalDraft(group.id, formData);
      
      // Notify Advisor
      notifyFinalDraftSubmission(group.advisorId, group.name, formData.title);

      toast.success('Final draft submitted successfully!');
      setShowSubmitModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Check prerequisites
  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Final Draft</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Group Assigned</h2>
          <p className="text-yellow-700">
            You need to be assigned to a group to submit a final draft.
          </p>
        </div>
      </div>
    );
  }

  if (proposal?.status !== 'approved') {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Final Draft</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Proposal Not Approved</h2>
          <p className="text-yellow-700">
            Your project proposal must be approved before you can submit a final draft.
          </p>
        </div>
      </div>
    );
  }

  if (!group.advisorId) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Final Draft</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Advisor Assigned</h2>
          <p className="text-yellow-700">
            You need an assigned advisor before you can submit your final draft.
          </p>
        </div>
      </div>
    );
  }

  // If final draft already submitted
  if (finalDraft) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Final Draft</h1>
          <p className="text-sm text-gray-500">Semester {academicYear.semester} Submission</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{finalDraft.title}</h2>
                <p className="text-gray-500 mt-1">
                  Submitted on {formatDate(finalDraft.submittedAt)}
                </p>
              </div>
            </div>

            {/* Approval Status */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className={`p-4 rounded-lg border-2 ${
                finalDraft.advisorStatus === 'approved' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-yellow-500 bg-yellow-50'
              }`}>
                <div className="flex items-center gap-3">
                  {finalDraft.advisorStatus === 'approved' ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <Clock className="w-8 h-8 text-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">Advisor Approval</h3>
                    <StatusBadge 
                      status={finalDraft.advisorStatus} 
                      size="sm" 
                    />
                  </div>
                </div>
                {finalDraft.advisorApprovedAt && (
                  <p className="text-sm text-gray-500 mt-2">
                    Approved on {formatDate(finalDraft.advisorApprovedAt)}
                  </p>
                )}
              </div>
            </div>

            {/* File Link */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Submitted Document</h3>
              <a 
                href={finalDraft.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <FileText className="w-5 h-5" />
                View Document
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Status Messages */}
          {finalDraft.advisorStatus === 'approved' && (
            <div className="bg-green-500 p-4">
              <div className="flex items-center gap-3 text-white">
                <CheckCircle className="w-6 h-6" />
                <p className="font-medium">
                  Congratulations! Your final draft has been fully approved. 
                  Please wait for defense scheduling.
                </p>
              </div>
            </div>
          )}

          {finalDraft.advisorStatus === 'pending' && (
            <div className="bg-yellow-500 p-4">
              <div className="flex items-center gap-3 text-white">
                <Clock className="w-6 h-6" />
                <p className="font-medium">
                  Your final draft is under review by your advisor.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Submit new final draft
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Final Draft</h1>
        <p className="text-sm text-gray-500">Semester {academicYear.semester}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Submit Your Final Project?
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Submit your completed project documentation. Once submitted, it will be 
            reviewed by your advisor and then forwarded to your department head.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <h3 className="font-medium text-gray-900 mb-1">Project Title</h3>
            <p className="text-blue-600">{group.approvedTitle}</p>
          </div>

          <Button onClick={() => setShowSubmitModal(true)} icon={Upload} size="lg" disabled={isReadOnly}>
            Submit Final Draft
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Approval Process</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Submit your final draft document</li>
          <li>Your advisor reviews and approves the draft</li>
          <li>Your project is ready for defense scheduling</li>
        </ol>
      </div>

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Final Draft"
        onConfirm={handleSubmit}
        confirmText="Submit Draft"
        loading={loading}
      >
        <div className="space-y-4">
          <InputField
            label="Project Title"
            name="title"
            value={group.approvedTitle}
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
            Make sure the link is accessible to your advisor and department head.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default FinalDraft;