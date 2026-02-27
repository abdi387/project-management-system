// src/pages/advisor/FinalDraftApproval.jsx
import React, { useState } from 'react';
import { FileText, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const FinalDraftApproval = () => {
  const { user } = useAuth();
  const { getGroupsByAdvisor, getFinalDraftByGroup, approveFinalDraftByAdvisor, groups } = useProject();
  const { notifyFinalDraftApproval } = useNotification();

  const myGroups = getGroupsByAdvisor(user?.id);
  
  const draftsToReview = myGroups
    .map(group => {
      const draft = getFinalDraftByGroup(group.id);
      if (draft && draft.advisorStatus === 'pending') {
        return { ...draft, group };
      }
      return null;
    })
    .filter(Boolean);

  const approvedDrafts = myGroups
    .map(group => {
      const draft = getFinalDraftByGroup(group.id);
      if (draft && draft.advisorStatus === 'approved') {
        return { ...draft, group };
      }
      return null;
    })
    .filter(Boolean);

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      approveFinalDraftByAdvisor(selectedDraft.id);
      notifyFinalDraftApproval(selectedDraft.groupId, selectedDraft.group.members, 'department');
      
      toast.success('Final draft approved successfully!');
      setShowApproveModal(false);
      setSelectedDraft(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Final Draft Approval</h1>

      {/* Pending Approvals */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Approval ({draftsToReview.length})
        </h2>

        {draftsToReview.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No final drafts pending approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {draftsToReview.map((item) => (
              <div 
                key={item.id}
                className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">
                      {item.group.name} • {item.group.department}
                    </p>
                    <p className="text-sm text-gray-400">
                      Submitted: {formatDate(item.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge status="pending" />
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <a 
                    href={item.fileUrl}
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
                  >
                    Approve Draft
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Already Approved */}
      {approvedDrafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Approved Drafts ({approvedDrafts.length})
          </h2>
          <div className="space-y-4">
            {approvedDrafts.map((item) => (
              <div 
                key={item.id}
                className="border border-green-200 bg-green-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.group.name}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Approved on {formatDate(item.advisorApprovedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="approved" />
                  </div>
                </div>
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
              <p className="text-sm text-gray-500">{selectedDraft.group.name}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">Final Approval</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Upon approval, this project will be marked as complete. The department head will be notified for their records. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FinalDraftApproval;