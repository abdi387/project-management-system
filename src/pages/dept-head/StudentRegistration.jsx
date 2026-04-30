import React, { useMemo, useState } from 'react';
import { UserPlus, CheckCircle, AlertCircle, Users, GraduationCap, Mail, BookOpen, Award, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { sectionService, userService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, resolveSectionName } from '../../utils/sectionDisplay';

const StudentRegistration = () => {
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();
  const department = user?.department;

  // Fetch pending students
  const {
    data: pendingData,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPending
  } = useFetch(() => userService.getPendingStudents(department), [department]);

  // Fetch all department students
  const {
    data: studentsData,
    loading: studentsLoading,
    error: studentsError,
    refetch: refetchStudents
  } = useFetch(() => userService.getUsers({
    role: 'student',
    department,
    status: 'active'
  }), [department]);

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(department, true),
    [department],
    !!department
  );

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const pendingStudents = pendingData?.students || [];
  const approvedStudents = studentsData?.users || [];
  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );
  const getStudentSectionName = (student) =>
    student?.Section?.name || (student?.section ? resolveSectionName(student.section, sectionNameMap) : 'N/A');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await userService.approveStudent(selectedStudent.id);
      toast.success(`${selectedStudent.name} has been approved!`);
      setShowApproveModal(false);
      setSelectedStudent(null);
      // Refetch both pending and students lists to update automatically
      await Promise.all([refetchPending(), refetchStudents()]);
    } catch (error) {
      toast.error(error.error || 'Failed to approve student');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await userService.rejectStudent(selectedStudent.id);
      toast.success(`${selectedStudent.name} has been rejected.`);
      setShowRejectModal(false);
      setSelectedStudent(null);
      // Refetch pending list to update automatically
      await refetchPending();
    } catch (error) {
      toast.error(error.error || 'Failed to reject student');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Safe rendering of CGPA
  const formatCGPA = (cgpa) => {
    if (cgpa === null || cgpa === undefined) return 'N/A';
    
    // If it's a number, format it
    if (typeof cgpa === 'number') {
      return cgpa.toFixed(2);
    }
    
    // If it's a string, try to parse it
    if (typeof cgpa === 'string') {
      const parsed = parseFloat(cgpa);
      if (!isNaN(parsed)) {
        return parsed.toFixed(2);
      }
    }
    
    return 'N/A';
  };

  const pendingColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (value) => <span className="font-medium">{value}</span>
    },
    { key: 'studentId', label: 'Student ID' },
    { key: 'email', label: 'Email' },
    { key: 'section', label: 'Section', render: (value, row) => getStudentSectionName(row) },
    { key: 'gender', label: 'Gender' },
    {
      key: 'cgpa',
      label: 'CGPA',
      // FIXED: Using safe formatting function
      render: (value) => formatCGPA(value)
    },
    {
      key: 'createdAt',
      label: 'Applied On',
      render: (value) => value ? formatDate(value) : 'N/A'
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
            disabled={isReadOnly}
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
            disabled={isReadOnly}
          >
            Reject
          </Button>
        </div>
      )
    }
  ];

  const approvedColumns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (value) => <span className="font-medium">{value}</span>
    },
    { key: 'studentId', label: 'Student ID' },
    { key: 'email', label: 'Email' },
    { key: 'section', label: 'Section', render: (value, row) => getStudentSectionName(row) },
    {
      key: 'cgpa',
      label: 'CGPA',
      // FIXED: Using safe formatting function
      render: (value) => formatCGPA(value)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} size="sm" />
    }
  ];

  // Show loading state
  if (pendingLoading || studentsLoading) {
    return <LoadingSpinner fullScreen text="Loading registrations..." />;
  }

  // Show error state
  if (pendingError || studentsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl p-10 max-w-md text-center">
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-100/50 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <div className="inline-flex p-4 bg-gradient-to-br from-red-100 to-rose-100 rounded-full mb-6 shadow-xl">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Error Loading Data</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">There was a problem loading the registrations. Please try again.</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Hero Stats Banner - Compact */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-5 mb-6 shadow-lg">
        {/* Decorative Background Elements */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg shadow">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Registration Management</h2>
                <p className="text-violet-100 text-xs">Manage student registrations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Pending</p>
              <p className="text-2xl font-bold text-white">{pendingStudents.length}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Approved</p>
              <p className="text-2xl font-bold text-white">{approvedStudents.length}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Department</p>
              <p className="text-sm font-bold text-white mt-0.5">{department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Registrations - Compact */}
      <div className="relative group mb-6">
        {/* Glowing Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur"></div>

        <div className="relative bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          {/* Section Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 px-4 py-3 border-b border-orange-100">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-md shadow-orange-200">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                {pendingStudents.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                    {pendingStudents.length}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Pending Registrations</h2>
                <p className="text-xs text-gray-600">
                  {pendingStudents.length === 0
                    ? 'All caught up! No pending approvals'
                    : `${pendingStudents.length} student${pendingStudents.length > 1 ? 's' : ''} awaiting review`}
                </p>
              </div>
            </div>
          </div>

          {pendingStudents.length === 0 ? (
            <div className="relative p-10 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50"></div>
              <div className="relative">
                <div className="inline-flex p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4 shadow-md">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">All Clear!</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">No pending registrations. New applications will appear here.</p>
              </div>
            </div>
          ) : (
            <DataTable
              columns={pendingColumns}
              data={pendingStudents}
              searchable
              pageSize={10}
            />
          )}
        </div>
      </div>

      {/* Approved Students - Compact Card Grid */}
      <div className="relative group">
        {/* Glowing Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur"></div>

        <div className="relative bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          {/* Section Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 px-4 py-3 border-b border-teal-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg shadow-md shadow-teal-200">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Registered Students</h2>
                <p className="text-xs text-gray-600">
                  {approvedStudents.length} active student{approvedStudents.length !== 1 ? 's' : ''} in {department}
                </p>
              </div>
            </div>
          </div>

          {approvedStudents.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No registered students yet.</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Student Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {approvedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="group/card relative bg-gradient-to-br from-white to-slate-50 rounded-lg border border-gray-200 p-3 hover:shadow-lg hover:border-emerald-300 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {/* Status Dot */}
                    <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>

                    <div className="flex items-start gap-3 mb-2">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {student.name?.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{student.name}</h3>
                        <p className="text-[11px] text-gray-500 font-mono">{student.studentId}</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                          <span>Section {getStudentSectionName(student)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-semibold text-gray-900">{formatCGPA(student.cgpa)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <StatusBadge status={student.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
        confirmText="Approve Student"
        confirmVariant="success"
        loading={loading}
      >
        {selectedStudent && (
          <div className="space-y-5">
            {/* Student Info Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-5 border border-green-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200/40 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {selectedStudent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900">{selectedStudent.name}</h4>
                    <p className="text-sm text-gray-600">{selectedStudent.studentId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedStudent.email}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">Section</p>
                    <p className="text-sm font-medium text-gray-900">{getStudentSectionName(selectedStudent)}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-100 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">CGPA</p>
                    <p className="text-lg font-bold text-gray-900">{formatCGPA(selectedStudent.cgpa)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Approval Action</p>
                <p className="text-sm text-blue-700">
                  This student will be notified and granted full system access upon approval.
                </p>
              </div>
            </div>
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
        confirmText="Reject Application"
        confirmVariant="danger"
        loading={loading}
      >
        {selectedStudent && (
          <div className="space-y-5">
            {/* Student Info Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-xl p-5 border border-red-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-200/40 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {selectedStudent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{selectedStudent.name}</h4>
                    <p className="text-sm text-gray-600">{selectedStudent.studentId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl p-5 border border-amber-200">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
              <div className="relative flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">Important Notice</p>
                  <p className="text-sm text-amber-800">
                    This action cannot be undone. The student will receive a notification about this rejection and will need to reapply if they wish to register.
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

export default StudentRegistration;
