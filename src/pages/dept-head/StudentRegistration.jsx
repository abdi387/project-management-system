// src/pages/dept-head/StudentRegistration.jsx
import React, { useState } from 'react';
import { UserPlus, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const StudentRegistration = () => {
  const { user, getPendingStudents, approveStudent, rejectStudent, getUsersByDepartment } = useAuth();
  const { notifyRegistrationApproval } = useNotification();

  const pendingStudents = getPendingStudents(user?.department);
  const allDeptStudents = getUsersByDepartment(user?.department).filter(u => u.role === 'student');
  const approvedStudents = allDeptStudents.filter(s => s.status === 'active');

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      approveStudent(selectedStudent.id);
      notifyRegistrationApproval(selectedStudent.id, true);
      toast.success(`${selectedStudent.name} has been approved!`);
      setShowApproveModal(false);
      setSelectedStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      rejectStudent(selectedStudent.id);
      notifyRegistrationApproval(selectedStudent.id, false);
      toast.success(`${selectedStudent.name} has been rejected.`);
      setShowRejectModal(false);
      setSelectedStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const pendingColumns = [
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'email', label: 'Email' },
    { key: 'section', label: 'Section' },
    { 
      key: 'cgpa', 
      label: 'CGPA',
      render: (value) => value?.toFixed(2)
    },
    { 
      key: 'createdAt', 
      label: 'Applied On',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="success"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStudent(row);
              setShowApproveModal(true);
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStudent(row);
              setShowRejectModal(true);
            }}
          >
            Reject
          </Button>
        </div>
      )
    }
  ];

  const approvedColumns = [
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'email', label: 'Email' },
    { key: 'section', label: 'Section' },
    { 
      key: 'cgpa', 
      label: 'CGPA',
      render: (value) => value?.toFixed(2)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} size="sm" />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Registration</h1>
          <p className="text-gray-500">{user?.department} Department</p>
        </div>
      </div>

      {/* Pending Registrations */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Registrations</h2>
              <p className="text-sm text-gray-500">{pendingStudents.length} student(s) awaiting approval</p>
            </div>
          </div>
        </div>
        
        {pendingStudents.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending registrations</p>
          </div>
        ) : (
          <DataTable
            columns={pendingColumns}
            data={pendingStudents}
            searchable
            pageSize={5}
          />
        )}
      </div>

      {/* Approved Students */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Registered Students</h2>
              <p className="text-sm text-gray-500">{approvedStudents.length} active student(s)</p>
            </div>
          </div>
        </div>
        
        <DataTable
          columns={approvedColumns}
          data={approvedStudents}
          searchable
          pageSize={10}
        />
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedStudent(null);
        }}
        title="Approve Registration"
        onConfirm={handleApprove}
        confirmText="Approve"
        confirmVariant="success"
        loading={loading}
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{selectedStudent.name}</h4>
              <p className="text-sm text-gray-500">{selectedStudent.studentId}</p>
              <p className="text-sm text-gray-500">{selectedStudent.email}</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm">Section: {selectedStudent.section}</span>
                <span className="text-sm">CGPA: {selectedStudent.cgpa?.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to approve this student's registration? 
              They will be able to log in and access the system.
            </p>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedStudent(null);
        }}
        title="Reject Registration"
        onConfirm={handleReject}
        confirmText="Reject"
        confirmVariant="danger"
        loading={loading}
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{selectedStudent.name}</h4>
              <p className="text-sm text-gray-500">{selectedStudent.studentId}</p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                This action cannot be undone. The student will be notified of the rejection.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentRegistration;