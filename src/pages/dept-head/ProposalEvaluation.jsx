// src/pages/dept-head/ProposalEvaluation.jsx
import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import TextArea from '../../components/common/TextArea';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const ProposalEvaluation = () => {
  const { user, users } = useAuth();
  const { getProposalsByDepartment, getGroupsByDepartment, approveProposal, rejectProposal } = useProject();
  const { notifyProposalApproval, notifyProposalRejection } = useNotification();

  const proposals = getProposalsByDepartment(user?.department);
  const groups = getGroupsByDepartment(user?.department);
  
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const evaluatedProposals = proposals.filter(p => p.status !== 'pending');

  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const getGroupInfo = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    const members = group?.members.map(id => users.find(u => u.id === id)).filter(Boolean) || [];
    return { group, members };
  };

  const handleApprove = async () => {
    if (selectedTitleIndex === null) {
      toast.error('Please select a title to approve');
      return;
    }

    setLoading(true);
    try {
      approveProposal(selectedProposal.id, selectedTitleIndex);
      
      const { group } = getGroupInfo(selectedProposal.groupId);
      notifyProposalApproval(
        selectedProposal.groupId,
        selectedProposal.titles[selectedTitleIndex].title,
        group?.members || []
      );
      
      toast.success('Proposal approved successfully!');
      setShowApproveModal(false);
      setSelectedProposal(null);
      setSelectedTitleIndex(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionFeedback.trim()) {
      toast.error('Please provide feedback for rejection');
      return;
    }

    setLoading(true);
    try {
      rejectProposal(selectedProposal.id, rejectionFeedback);
      
      const { group } = getGroupInfo(selectedProposal.groupId);
      notifyProposalRejection(selectedProposal.groupId, group?.members || []);
      
      toast.success('Proposal rejected. Students will be notified to resubmit.');
      setShowRejectModal(false);
      setSelectedProposal(null);
      setRejectionFeedback('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposal Evaluation</h1>
          <p className="text-gray-500">{user?.department} Department</p>
        </div>
      </div>

      {/* Pending Proposals */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Proposals ({pendingProposals.length})
        </h2>

        {pendingProposals.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending proposals to evaluate</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingProposals.map((proposal) => {
              const { group, members } = getGroupInfo(proposal.groupId);
              
              return (
                <div 
                  key={proposal.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="bg-gray-50 p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-500" />
                        <div>
                          <h3 className="font-medium text-gray-900">{group?.name}</h3>
                          <p className="text-sm text-gray-500">
                            {members.length} members • Submitted {formatDate(proposal.submittedAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="pending" />
                    </div>
                  </div>

                  {/* Proposed Titles */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Proposed Project Titles</h4>
                    <div className="space-y-3">
                      {proposal.titles.map((title, index) => (
                        <div 
                          key={index}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                Option {index + 1}
                              </span>
                              <h5 className="font-medium text-gray-900 mt-1">{title.title}</h5>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                {title.domain}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{title.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    <Button
                      variant="danger"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setShowRejectModal(true);
                      }}
                      icon={XCircle}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setShowApproveModal(true);
                      }}
                      icon={CheckCircle}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Evaluated Proposals */}
      {evaluatedProposals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Evaluated Proposals ({evaluatedProposals.length})
          </h2>
          <div className="space-y-4">
            {evaluatedProposals.map((proposal) => {
              const { group } = getGroupInfo(proposal.groupId);
              
              return (
                <div 
                  key={proposal.id}
                  className={`p-4 rounded-lg border ${
                    proposal.status === 'approved' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{group?.name}</h3>
                      {proposal.status === 'approved' && proposal.approvedTitle && (
                        <p className="text-sm text-green-700 mt-1">
                          Approved: {proposal.approvedTitle.title}
                        </p>
                      )}
                      {proposal.status === 'rejected' && (
                        <p className="text-sm text-red-700 mt-1">
                          Rejected - Awaiting resubmission
                        </p>
                      )}
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedProposal(null);
          setSelectedTitleIndex(null);
        }}
        title="Approve Project Proposal"
        onConfirm={handleApprove}
        confirmText="Approve Selected"
        confirmVariant="success"
        loading={loading}
        size="lg"
      >
        {selectedProposal && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Select one of the proposed titles to approve:
            </p>
            
            <div className="space-y-3">
              {selectedProposal.titles.map((title, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedTitleIndex(index)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedTitleIndex === index
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedTitleIndex === index
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedTitleIndex === index && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{title.title}</h4>
                      <span className="text-sm text-purple-600">{title.domain}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTitleIndex !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  The group will be notified that "{selectedProposal.titles[selectedTitleIndex].title}" 
                  has been approved. This title will be available for advisors to claim.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedProposal(null);
          setRejectionFeedback('');
        }}
        title="Reject Proposal"
        onConfirm={handleReject}
        confirmText="Reject & Notify"
        confirmVariant="danger"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                The group will be notified to submit a new proposal with different project titles.
              </p>
            </div>
          </div>
          
          <TextArea
            label="Feedback for Students"
            name="feedback"
            value={rejectionFeedback}
            onChange={(e) => setRejectionFeedback(e.target.value)}
            placeholder="Explain why the proposal is being rejected and provide guidance for resubmission..."
            rows={4}
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default ProposalEvaluation;