// src/pages/student/ProgressReport.jsx
import React, { useState } from 'react';
import { Upload, FileText, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import TextArea from '../../components/common/TextArea';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { formatDate, isOverdue, getDaysRemaining } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const ProgressReport = () => {
  const { user } = useAuth();
  const { getGroupByStudentId, getProgressReportsByGroup, submitProgressReport, academicYear, isReadOnly } = useProject();
  const { notifyProgressSubmission } = useNotification();
  
  const group = getGroupByStudentId(user?.id);
  const reports = group ? getProgressReportsByGroup(group.id) : [];
  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileUrl: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() ) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.fileUrl.trim()) {
      toast.error('Please provide a file URL.');
      return;
    }

    setLoading(true);
    try {
      // Set a deadline 7 days from now
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      submitProgressReport(group.id, {
        ...formData,
        deadline: deadline.toISOString()
      });

      // Notify Advisor
      notifyProgressSubmission(group.advisorId, group.name, formData.title);
      
      toast.success('Progress report submitted successfully!');
      setShowSubmitModal(false);
      setFormData({ title: '', description: '', fileUrl: '' });
    } finally {
      setLoading(false);
    }
  };

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Progress Reports</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Group Assigned</h2>
          <p className="text-yellow-700">
            You need to be assigned to a group to submit progress reports.
          </p>
        </div>
      </div>
    );
  }

  if (!group.advisorId) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Progress Reports</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Advisor Assigned</h2>
          <p className="text-yellow-700">
            You need an assigned advisor before you can submit progress reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Reports</h1>
          <p className="text-sm text-gray-500">Semester {academicYear.semester}</p>
        </div>
        {reports.length > 0 && (
          <Button onClick={() => setShowSubmitModal(true)} icon={Upload} disabled={isReadOnly}>
            Submit Report
          </Button>
        )}
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No Reports Yet</h2>
          <p className="text-gray-500 mb-4">
            Start by submitting your first progress report.
          </p>
          <Button onClick={() => setShowSubmitModal(true)} icon={Upload} disabled={isReadOnly}>
            Submit First Report
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted on {formatDate(report.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge 
                    status={report.isOverdue ? 'overdue' : report.status} 
                  />
                </div>
                
                <p className="text-gray-600 mb-4">{report.description}</p>
                
                {report.fileUrl && (
                  <a 
                    href={report.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <FileText className="w-4 h-4" />
                    View Attached File
                  </a>
                )}
              </div>
              
              {/* Feedback Section */}
              {report.feedback && (
                <div className="bg-green-50 border-t border-green-200 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Advisor Feedback</h4>
                  </div>
                  <p className="text-green-700">{report.feedback}</p>
                  <p className="text-sm text-green-600 mt-2">
                    Reviewed on {formatDate(report.reviewedAt)}
                  </p>
                </div>
              )}
              
              {!report.feedback && report.status === 'pending' && (
                <div className="bg-yellow-50 border-t border-yellow-200 p-4">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Clock className="w-5 h-5" />
                    <span>Awaiting advisor review</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit Report Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Progress Report"
        onConfirm={handleSubmit}
        confirmText="Submit Report"
        loading={loading}
      >
        <div className="space-y-4">
          <InputField
            label="Report Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Week 3 Progress Report"
            required
          />
          
          <TextArea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the progress made, challenges faced, and next steps..."
            rows={5}
            required
          />
          
          <InputField
            label="File URL"
            name="fileUrl"
            value={formData.fileUrl}
            onChange={handleChange}
            placeholder="https://drive.google.com/..."
            required
          />
          
          <p className="text-sm text-gray-500">
            A document link is required. Please provide a link to your document (e.g., Google Drive) and ensure it's accessible.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ProgressReport;