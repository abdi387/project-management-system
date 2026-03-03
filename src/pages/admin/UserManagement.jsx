// src/pages/admin/UserManagement.jsx

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, CheckCircle, XCircle, ArrowLeft, GraduationCap, Briefcase, School, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { users, addUser, updateUser, deleteUser } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('main'); // 'main', 'student-years', 'student', 'advisor', 'dept-head', 'faculty-head'
  const [yearPage, setYearPage] = useState(1);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedYear, setSelectedYear] = useState('');
  const [academicYearData, setAcademicYearData] = useState({ current: '', history: [] });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const yearsPerPage = 6;

  const roles = [
    { value: 'student', label: 'Student' },
    { value: 'advisor', label: 'Advisor' },
    { value: 'dept-head', label: 'Department Head' },
    { value: 'faculty-head', label: 'Faculty Head' }
  ];

  const departments = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Information Systems', label: 'Information Systems' }
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const updateAcademicYear = () => {
    const savedYear = localStorage.getItem('fypAcademicYear');
    if (savedYear) {
      try {
        const parsed = JSON.parse(savedYear);
        setAcademicYearData({
          current: parsed.current || '',
          history: Array.isArray(parsed.history) ? parsed.history : []
        });
      } catch (e) {
        console.error('Failed to parse academic year from storage', e);
        setAcademicYearData({ current: '', history: [] });
      }
    } else {
      setAcademicYearData({ current: '', history: [] });
    }
  };

  useEffect(() => {
    updateAcademicYear();
    window.addEventListener('storage', updateAcademicYear);
    return () => window.removeEventListener('storage', updateAcademicYear);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      department: '',
      status: 'active'
    });
    setErrors({});
  };

  const validateForm = (isEdit = false) => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email format.';
    }
    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.role) newErrors.role = 'Role is required';
    if ((formData.role === 'advisor' || formData.role === 'dept-head' || formData.role === 'student') && !formData.department) {
      newErrors.department = 'Department is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }
    setLoading(true);
    try {
      const result = addUser(formData);
      if (result.success) {
        toast.success('User added successfully!');
        setShowAddModal(false);
        resetForm();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!validateForm(true)) {
      toast.error('Please fix the errors in the form.');
      return;
    }
    setLoading(true);
    try {
      const updates = { ...formData };
      if (!updates.password) delete updates.password;
      
      updateUser(selectedUser.id, updates);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      deleteUser(selectedUser.id);
      toast.success('User deleted successfully!');
      setShowDeleteModal(false);
      setSelectedUser(null);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      status: user.status
    });
    setErrors({});
    setShowEditModal(true);
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { 
      key: 'role', 
      label: 'Role',
      render: (value) => (
        <span className="capitalize">{value?.replace('-', ' ')}</span>
      )
    },
    { key: 'department', label: 'Department', render: (v) => v || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} size="sm" />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          {row.role !== 'admin' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                setShowDeleteModal(true);
              }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  const getDisplayData = () => {
    let data = users;

    // Filter by View (Role)
    if (view === 'student') {
      data = data.filter(u => u.role === 'student' && u.status !== 'pending');
    } else if (view === 'advisor') {
      data = data.filter(u => u.role === 'advisor');
    } else if (view === 'dept-head') {
      data = data.filter(u => u.role === 'dept-head');
    } else if (view === 'faculty-head') {
      data = data.filter(u => u.role === 'faculty-head');
    } else {
      return [];
    }

    // Filter by Department
    if (selectedDept !== 'All' && view !== 'faculty-head') {
      data = data.filter(u => u.department === selectedDept);
    }

    return data;
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setSelectedDept('All');
    if (newView !== 'student') {
      setSelectedYear('');
    }
  };

  const renderDepartmentButtons = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => setSelectedDept('All')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedDept === 'All' 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }`}
      >
        All Departments
      </button>
      {departments.map((dept) => (
        <button
          key={dept.value}
          onClick={() => setSelectedDept(dept.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedDept === dept.value 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {dept.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>

          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage students, advisors, and faculty members</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={Plus}>
          Add User
        </Button>
      </div>

      {view === 'main' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => handleViewChange('advisor')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
              <School className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Advisors</h3>
            <p className="text-sm text-gray-500 mt-1">Manage faculty advisors</p>
          </button>

          <button 
            onClick={() => handleViewChange('dept-head')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Department Heads</h3>
            <p className="text-sm text-gray-500 mt-1">Manage department heads</p>
          </button>

          <button 
            onClick={() => handleViewChange('faculty-head')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
              <UserCog className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Faculty Head</h3>
            <p className="text-sm text-gray-500 mt-1">Manage faculty head</p>
          </button>

          <button 
            onClick={() => handleViewChange('student-years')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Students List
            </h3>
            <p className="text-sm text-gray-500 mt-1">View and manage registered students</p>
          </button>
        </div>
      ) : view === 'student-years' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('main')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Select Academic Year</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Year Button */}
            {academicYearData.current && (
              <button
                onClick={() => {
                  setSelectedYear(academicYearData.current);
                  setView('student');
                }}
                className="p-6 bg-white rounded-xl shadow-sm border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all text-left group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-2">
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Current</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{academicYearData.current}</h3>
                <p className="text-sm text-gray-500 mt-1">View students for current year</p>
              </button>
            )}

            {/* History Year Buttons */}
            {academicYearData.history.map((yearData, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedYear(yearData.current);
                  setView('student');
                }}
                className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all text-left"
              >
                <h3 className="text-xl font-bold text-gray-900">{yearData.current}</h3>
                <p className="text-sm text-gray-500 mt-1">Archived Year</p>
              </button>
            ))}

            {/* Fallback if no years exist */}
            {!academicYearData.current && academicYearData.history.length === 0 && (
              <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No academic years found. Please set up an academic year in Faculty Head settings.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView(view === 'student' ? 'student-years' : 'main')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 capitalize flex items-center gap-2">
              {view.replace('-', ' ')}s
              {view === 'student' && selectedYear && (
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {selectedYear}
                </span>
              )}
            </h2>
          </div>

          {/* Department Filters - Show for everyone except Faculty Head */}
          {view !== 'faculty-head' && renderDepartmentButtons()}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={getDisplayData()}
              searchable
              pageSize={10}
              emptyMessage={`No ${view.replace('-', ' ')}s found.`}
            />
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New User"
        onConfirm={handleAddUser}
        confirmText="Add User"
        loading={loading}
      >
        <div className="space-y-4">
          <InputField
            label="Full Name"
            name="name"
            value={formData.name}
            error={errors.name}
            onChange={handleChange}
            required
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="user@example.com"
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <SelectDropdown
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            error={errors.role}
            options={roles}
            required
          />
          {(formData.role === 'advisor' || formData.role === 'dept-head' || formData.role === 'student') && (
            <SelectDropdown
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              error={errors.department}
              options={departments}
              required
            />
          )}
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
          resetForm();
        }}
        title="Edit User"
        onConfirm={handleEditUser}
        confirmText="Save Changes"
        loading={loading}
      >
        <div className="space-y-4">
          <InputField
            label="Full Name"
            name="name"
            value={formData.name}
            error={errors.name}
            onChange={handleChange}
            required
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="user@example.com"
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Leave blank to keep current"
          />
          {(formData.role === 'advisor' || formData.role === 'dept-head' || formData.role === 'student') && (
            <SelectDropdown
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              error={errors.department}
              options={departments}
            />
          )}
          <SelectDropdown
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            error={errors.status}
            options={statuses}
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        onConfirm={handleDeleteUser}
        confirmText="Delete"
        confirmVariant="danger"
        loading={loading}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              This action cannot be undone. All data associated with this user will be permanently removed.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;