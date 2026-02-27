// src/pages/advisor/ProgressReview.jsx
import React, { useState } from 'react';
import { MessageSquare, FileText, ExternalLink, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import TextArea from '../../components/common/TextArea';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const ProgressReview = () => {
  const { user, users } = useAuth();
  const { getProgressReportsByAdvisor, addFeedbackToReport, groups } = useProject();
  const { notifyProgressFeedback } = useNotification();

  const reports = getProgressReportsByAdvisor(user?.id);
  const pendingReports = reports.filter(r => r.status === 'pending');
  const reviewedReports = reports.filter(r => r.status === 'reviewed');

  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const getGroupInfo = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return {
      name: group?.name || 'Unknown Group',
      department: group?.department || '',
      members: group?.members || []
    };
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter feedback');
      return;
    }

    setLoading(true);
    try {
      addFeedbackToReport(selectedReport.id, feedback);
      
      const groupInfo = getGroupInfo(selectedReport.groupId);
      notifyProgressFeedback(selectedReport.groupId, groupInfo.members);
      
      toast.success('Feedback submitted successfully!');
      setShowModal(false);
      setFeedback('');
      setSelectedReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Progress Review</h1>

      {/* Pending Reviews */}
      <div className="bg-white rounded-xl shadow-sm p-6">
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
            {pendingReports.map((report) => {
              const groupInfo = getGroupInfo(report.groupId);
              return (
                <div 
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500">
                        {groupInfo.name} • {groupInfo.department}
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
                        href={report.fileUrl}
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
                    >
                      Add Feedback
                    </Button>
                  </div>
                </div>
              );
            })}
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
            {reviewedReports.map((report) => {
              const groupInfo = getGroupInfo(report.groupId);
              return (
                <div 
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500">{groupInfo.name}</p>
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
              );
            })}
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
    </div>
  );
};

export default ProgressReview;