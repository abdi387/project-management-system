// src/pages/admin/UserManagement.jsx
import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});

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

  // Include all users except pending students (who are managed by Dept Head)
  const managedUsers = users.filter(u => u.role !== 'student' || u.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage advisors, department heads, and faculty head</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={Plus}>
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={managedUsers}
          searchable
          pageSize={10}
        />
      </div>

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