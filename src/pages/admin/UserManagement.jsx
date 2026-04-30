import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  ArrowLeft,
  GraduationCap,
  Briefcase,
  School,
  UserCog,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  AlertCircle,
  Info,
  Sparkles,
  Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService, academicService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { user: currentUser, users: contextUsers, addUser, updateUser, deleteUser } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch all users
  const { 
    data: usersData, 
    loading: usersLoading,
    refetch: refetchUsers
  } = useFetch(() => userService.getUsers());

  // Fetch system settings for dynamic password validation
  const {
    data: settingsData
  } = useFetch(() => academicService.getSystemSettings());

  // Fetch sections dynamically
  const {
    data: sectionsData
  } = useFetch(() => sectionService.getAllSections());

  const passwordMinLength = parseInt(settingsData?.settings?.password_min_length || 6, 10);

  // Dynamic sections from database (only active, unique by name)
  const allDynamicSections = sectionsData?.sections
    ?.filter(s => s.isActive)
    .reduce((unique, section) => {
      // Only add if this section name isn't already in the array
      if (!unique.some(s => s.label === `Section ${section.name}` && s.department === section.department)) {
        unique.push({
          value: section.id,
          label: `Section ${section.name}`,
          department: section.department
        });
      }
      return unique;
    }, []) || [];

  // Filter sections based on selected department
  const getSectionsForDepartment = (department) => {
    if (!department) return [];
    return allDynamicSections
      .filter(s => s.department === department)
      .map(s => ({ value: s.value, label: s.label }));
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    status: 'active',
    // Student specific fields
    studentId: '',
    cgpa: '',
    section: '',
    gender: ''
  });

  // Get filtered sections for current form (memoized to prevent recalculation)
  const filteredSections = useMemo(() => {
    return getSectionsForDepartment(formData.department);
  }, [formData.department]);

  const [errors, setErrors] = useState({});

  const users = usersData?.users || contextUsers || [];

  const roles = [
    { value: 'student', label: 'Student' },
    { value: 'advisor', label: 'Advisor' },
    { value: 'dept-head', label: 'Department Head' },
    { value: 'faculty-head', label: 'Faculty Head' },
    { value: 'admin', label: 'Admin' }
  ];

  const departments = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Information Systems', label: 'Information Systems' }
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesDept = departmentFilter === 'all' || user.department === departmentFilter;
    
    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  const exportUsersToCSV = () => {
    const toastId = toast.loading('Preparing export...');
    try {
      // Export the current filtered list. If no filters are active, 
      // filteredUsers equals all users automatically.
      const dataToExport = filteredUsers;
      const exportCount = dataToExport.length;

      if (exportCount === 0) {
        toast.error('No users found matching current filters to export.', { id: toastId });
        return;
      }

      const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Student ID', 'Section', 'CGPA', 'Gender', 'Joined'];
      const rows = dataToExport.map(user => [
        user.name ?? '',
        user.email ?? '',
        user.role ?? '',
        user.department ?? '',
        user.status ?? '',
        user.studentId ?? '',
        // Resolve human-readable section name from ID
        sectionsData?.sections?.find(s => s.id === user.section)?.name || user.section || 'N/A',
        user.cgpa ?? '',
        user.gender ?? '',
        user.createdAt ? new Date(user.createdAt).toLocaleString() : ''
      ]);

      // Add UTF-8 BOM (\ufeff) to help Excel recognize the encoding immediately
      const csvContent = '\ufeff' + [headers, ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user_list_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportCount} user${exportCount === 1 ? '' : 's'} successfully.`, { id: toastId });
    } catch (error) {
      toast.error('Failed to export users. Please try again.', { id: toastId });
      console.error('Export CSV error:', error);
    }
  };

  // Download CSV Template for Import
  const downloadTemplate = () => {
    const headers = ['Name', 'Email', 'Role', 'Password', 'Department', 'Status', 'Student ID', 'CGPA', 'Section', 'Gender'];
    const example = ['John Doe', 'john@example.com', 'student', `Pass${passwordMinLength}Word`, 'Computer Science', 'active', '1234/20', '3.8', 'A', 'male'];
    
    const csvContent = [headers, example]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'user_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded. Please follow the column format.');
  };

  // Handle CSV Import processing
  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported for bulk import.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length <= 1) {
        toast.error('The file is empty or only contains headers.');
        return;
      }

      // CSV parsing to handle quotes and commas correctly
      const parseCSVLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else cur += char;
        }
        result.push(cur.trim());
        return result;
      };

      const rawHeaders = parseCSVLine(lines[0]);
      const cleanHeaders = rawHeaders.map(h => h.toLowerCase().replace(/ /g, '').replace(/_/g, ''));
      const dataRows = lines.slice(1);

      setShowImportModal(false);
      const toastId = toast.loading(`Processing import for ${dataRows.length} users...`);
      setLoading(true);

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const values = parseCSVLine(dataRows[i]);
        const userObj = {};
        
        cleanHeaders.forEach((header, index) => {
          const val = values[index];
          if (!val) return;
          
          const cleanVal = val.trim();
          switch(header) {
            case 'name': userObj.name = cleanVal; break;
            case 'email': userObj.email = cleanVal.toLowerCase(); break;
            case 'role': 
              // Normalize roles to match internal keys
              let role = cleanVal.toLowerCase().replace(/ /g, '-');
              if (role === 'dept-head' || role === 'department-head' || role === 'head') role = 'dept-head';
              if (role === 'faculty-head' || role === 'dean') role = 'faculty-head';
              userObj.role = role; 
              break;
            case 'password': userObj.password = cleanVal; break;
            case 'department': 
              // Try to find a matching department from the valid options
              const matchedDept = departments.find(d => d.value.toLowerCase() === cleanVal.toLowerCase());
              userObj.department = matchedDept ? matchedDept.value : cleanVal; 
              break;
            case 'status': userObj.status = cleanVal.toLowerCase() || 'active'; break;
            case 'studentid': userObj.studentId = cleanVal; break;
            case 'cgpa': userObj.cgpa = parseFloat(cleanVal); break;
            case 'section': userObj.section = cleanVal.toUpperCase(); break;
            case 'gender': userObj.gender = cleanVal.toLowerCase(); break;
            default: break;
          }
        });

        // Enforce role-based field logic (matching manual addition)
        if (userObj.role === 'admin' || userObj.role === 'faculty-head') {
          delete userObj.department;
        }
        
        if (userObj.role !== 'student') {
          delete userObj.studentId;
          delete userObj.cgpa;
          delete userObj.section;
          delete userObj.gender;
        } else {
          // Ensure default values if missing
          if (!userObj.status) userObj.status = 'active';
          
          // Clean gender string to match role logic
          if (userObj.gender && !['male', 'female'].includes(userObj.gender)) {
            delete userObj.gender;
          }
        }

        // Resolve section mapping for students
        if (userObj.role === 'student' && userObj.section && sectionsData?.sections) {
          const foundSection = sectionsData.sections.find(s => 
            (s.id === userObj.section || s.name === userObj.section) && 
            s.department === (userObj.department || '')
          );
          if (foundSection) userObj.section = foundSection.id;
        }

        try {
          const result = await addUser(userObj);
          if (result.success) successCount++;
          else {
            failureCount++;
            errors.push(`Row ${i + 2} (${userObj.email || 'No Email'}): ${result.error}`);
          }
        } catch (err) {
          failureCount++;
          errors.push(`Row ${i + 2}: Technical error occurred.`);
        }
      }

      setLoading(false);
      toast.dismiss(toastId);

      if (successCount > 0) {
        toast.success(`Import complete! ${successCount} users added.`);
        await refetchUsers();
      }

      if (failureCount > 0) {
        toast.error(`${failureCount} users failed. Details in console.`, { duration: 6000 });
        console.group('Bulk Import Errors');
        errors.forEach(err => console.error(err));
        console.groupEnd();
      }
      
      event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Clear section when department changes
      if (name === 'department') {
        updated.section = '';
      }
      return updated;
    });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleGenderChange = (value) => {
    setFormData(prev => ({ ...prev, gender: value }));
    if (errors.gender) {
      setErrors(prev => ({ ...prev, gender: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      department: '',
      status: 'active',
      studentId: '',
      cgpa: '',
      section: '',
      gender: ''
    });
    setErrors({});
  };

  const validateForm = (isEdit = false) => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full Name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email format';
    } else {
      // Check if email is already taken by another user in the local list
      const isEmailTaken = users.some(u => 
        u.email?.toLowerCase() === formData.email.trim().toLowerCase() && 
        u.id !== (isEdit ? selectedUser?.id : null)
      );
      if (isEmailTaken) {
        newErrors.email = 'This email is already in use by another user';
      }
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < passwordMinLength) {
      newErrors.password = `Password must be at least ${passwordMinLength} characters`;
    }

    if (!formData.role) newErrors.role = 'Role is required';

    // Department is required for student, advisor, and dept-head
    if ((formData.role === 'advisor' || formData.role === 'dept-head' || formData.role === 'student') && !formData.department) {
      newErrors.department = 'Department is required';
    }

    // Student-specific validations
    if (formData.role === 'student') {
      if (!formData.studentId.trim()) {
        newErrors.studentId = 'Student ID is required';
      } else if (!/^\d{4}\/\d{2}$/.test(formData.studentId)) {
        newErrors.studentId = 'Invalid format (e.g., 1234/14)';
      } else {
        // Check if Student ID is already taken by another student
        const isIdTaken = users.some(u => 
          u.studentId?.toLowerCase() === formData.studentId.trim().toLowerCase() && 
          u.id !== (isEdit ? selectedUser?.id : null)
        );
        if (isIdTaken) {
          newErrors.studentId = 'This Student ID is already registered';
        }
      }

      if (!formData.cgpa) {
        newErrors.cgpa = 'CGPA is required';
      } else {
        const cgpaValue = parseFloat(formData.cgpa);
        if (isNaN(cgpaValue) || cgpaValue < 2.0 || cgpaValue > 4.0) {
          newErrors.cgpa = 'CGPA must be between 2.0 and 4.0';
        }
      }

      if (!formData.section) {
        newErrors.section = 'Section is required';
      }

      if (!formData.gender) {
        newErrors.gender = 'Gender is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const result = await addUser(formData);
      if (result.success) {
        toast.success('User added successfully!');
        setShowAddModal(false);
        resetForm();
        await refetchUsers();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error.error || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!validateForm(true)) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const updates = { ...formData };
      if (!updates.password) delete updates.password;

      // Remove fields that are not applicable for the selected role
      if (updates.role !== 'student') {
        delete updates.studentId;
        delete updates.cgpa;
        delete updates.section;
        delete updates.gender;
      }

      if (updates.role === 'admin' || updates.role === 'faculty-head') {
        delete updates.department;
      }

      // Remove any empty string values so enums/nullable fields are not set to invalid values
      Object.keys(updates).forEach((key) => {
        if (updates[key] === '') {
          delete updates[key];
        }
      });

      const result = await updateUser(selectedUser.id, updates);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      await refetchUsers();
    } catch (error) {
      toast.error(error.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      const result = await deleteUser(selectedUser.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('User deleted successfully!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      await refetchUsers();
    } catch (error) {
      toast.error(error.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    
    // Resolve section ID if user.section currently contains a name (e.g., 'A') 
    // instead of an ID, to avoid foreign key constraint errors on update.
    let resolvedSection = user.section || '';
    if (resolvedSection && sectionsData?.sections) {
      const foundSection = sectionsData.sections.find(s => 
        (s.id === resolvedSection || s.name === resolvedSection) && 
        s.department === (user.department || '')
      );
      if (foundSection) {
        resolvedSection = foundSection.id;
      }
    }

    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      status: user.status,
      studentId: user.studentId || '',
      cgpa: user.cgpa || '',
      section: resolvedSection,
      gender: user.gender || ''
    });
    setErrors({});
    setShowEditModal(true);
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {row.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
            {row.studentId && <div className="text-xs text-gray-400">ID: {row.studentId}</div>}
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (value, row) => (
        <div>
          <span className="capitalize text-sm font-medium text-gray-900">
            {value?.replace('-', ' ')}
          </span>
          {row.department && (
            <div className="text-xs text-gray-500">{row.department}</div>
          )}
          {row.section && (
            <div className="text-xs text-gray-500">
              Section: {sectionsData?.sections?.find(s => s.id === row.section)?.name || row.section}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} size="sm" />
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
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
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            disabled={isReadOnly}
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          {row.role !== 'admin' && row.id !== currentUser?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                setShowDeleteModal(true);
              }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              disabled={isReadOnly}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  if (usersLoading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  return (
    <PageContainer>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            icon={Plus}
            disabled={isReadOnly}
          >
            Add User
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            icon={Upload}
            disabled={isReadOnly}
          >
            Bulk Import
          </Button>
        </div>
        <Button variant="outline" icon={Download} onClick={exportUsersToCSV}>
          Export List
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <InputField
              placeholder="Search by name, email, or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <SelectDropdown
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              ...roles
            ]}
          />
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              ...statuses
            ]}
          />
        </div>
        <div className="mt-3">
          <SelectDropdown
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments
            ]}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-blue-600">Students</p>
          <p className="text-2xl font-bold text-blue-700">
            {users.filter(u => u.role === 'student').length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-purple-600">Advisors</p>
          <p className="text-2xl font-bold text-purple-700">
            {users.filter(u => u.role === 'advisor').length}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700">
            {users.filter(u => u.status === 'active').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">
            {users.filter(u => u.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredUsers}
          searchable={false}
          pageSize={10}
          emptyMessage="No users found."
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
        size="lg"
        onConfirm={handleAddUser}
        confirmText="Add User"
        loading={loading}
      >
        <div className="space-y-6">
          {/* Email Notification Notice - Enhanced */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">Email Notification</p>
                <p className="text-sm text-blue-100 mt-1 leading-relaxed">
                  An email will be automatically sent to the user with their login credentials and instructions to reset their password.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Basic Information */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative group">
                <InputField
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />
              </div>
              <div className="relative group">
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <div className="relative group">
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                />
              </div>
              <div className="relative group">
                <SelectDropdown
                  label="Role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  error={errors.role}
                  options={roles}
                  required
                />
              </div>
            </div>
          </div>

          {/* Department field for non-admin roles */}
          {(formData.role === 'advisor' || formData.role === 'dept-head' || formData.role === 'student') && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Department Assignment</h3>
              </div>
              <SelectDropdown
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                error={errors.department}
                options={departments}
                required
              />
            </div>
          )}

          {/* Student-specific fields - ONLY show when role is student */}
          {formData.role === 'student' && (
            <>
              {/* Student Information Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Student Information</h3>
                    <p className="text-sm text-gray-600">Enter academic details for the student</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative group">
                    <InputField
                      label="Student ID"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      error={errors.studentId}
                      placeholder="1234/14"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <InputField
                      label="CGPA"
                      name="cgpa"
                      type="number"
                      step="0.01"
                      min="2.0"
                      max="4.0"
                      value={formData.cgpa}
                      onChange={handleChange}
                      error={errors.cgpa}
                      placeholder="3.5"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div className="relative group">
                    <SelectDropdown
                      label="Section"
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      error={errors.section}
                      options={filteredSections}
                      placeholder={formData.department ? "Select Section" : "Select Department First"}
                      disabled={!formData.department || filteredSections.length === 0}
                      required
                    />
                    {formData.department && filteredSections.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No sections configured for {formData.department}
                      </p>
                    )}
                  </div>

                  {/* Gender Radio Buttons - Enhanced */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 h-[50px] items-center bg-white px-4 rounded-xl border-2 border-gray-200 shadow-sm hover:border-amber-400 transition-all duration-300">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={formData.gender === 'male'}
                            onChange={() => handleGenderChange('male')}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Male</span>
                      </label>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={() => handleGenderChange('female')}
                          className="w-5 h-5 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors">Female</span>
                      </label>
                    </div>
                    {errors.gender && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-5 shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Important Note</p>
                    <p className="text-sm text-indigo-100 mt-1 leading-relaxed">
                      All student fields are required. The student will be able to log in immediately with status 'active'.
                    </p>
                  </div>
                </div>
              </div>
            </>
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
        size="lg"
        onConfirm={handleEditUser}
        confirmText="Save Changes"
        loading={loading}
      >
        <div className="space-y-6">
          {/* Section: Basic Information */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <UserCog className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative group">
                <InputField
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />
              </div>
              <div className="relative group">
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />
              </div>
            </div>

            <div className="mt-5 relative group">
              <InputField
                label="New Password (leave blank to keep current)"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div className="relative group">
                <SelectDropdown
                  label="Role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  error={errors.role}
                  options={roles}
                  required
                />
              </div>
              <div className="relative group">
                <SelectDropdown
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={statuses}
                  required
                />
              </div>
            </div>
          </div>

          {/* Department field for non-admin roles */}
          {(formData.role === 'advisor' || formData.role === 'dept-head' || formData.role === 'student') && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Department Assignment</h3>
              </div>
              <SelectDropdown
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                error={errors.department}
                options={departments}
              />
            </div>
          )}

          {/* Student-specific fields - ONLY show when role is student */}
          {formData.role === 'student' && (
            <>
              {/* Student Information Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Student Information</h3>
                    <p className="text-sm text-gray-600">Edit academic details for the student</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative group">
                    <InputField
                      label="Student ID"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      error={errors.studentId}
                      placeholder="1234/14"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <InputField
                      label="CGPA"
                      name="cgpa"
                      type="number"
                      step="0.01"
                      min="2.0"
                      max="4.0"
                      value={formData.cgpa}
                      onChange={handleChange}
                      error={errors.cgpa}
                      placeholder="3.5"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div className="relative group">
                    <SelectDropdown
                      label="Section"
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      error={errors.section}
                      options={filteredSections}
                      placeholder={formData.department ? "Select Section" : "Select Department First"}
                      disabled={!formData.department || filteredSections.length === 0}
                      required
                    />
                    {formData.department && filteredSections.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No sections configured for {formData.department}
                      </p>
                    )}
                  </div>

                  {/* Gender Radio Buttons - Enhanced */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 h-[50px] items-center bg-white px-4 rounded-xl border-2 border-gray-200 shadow-sm hover:border-amber-400 transition-all duration-300">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={formData.gender === 'male'}
                            onChange={() => handleGenderChange('male')}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Male</span>
                      </label>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={() => handleGenderChange('female')}
                          className="w-5 h-5 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors">Female</span>
                      </label>
                    </div>
                    {errors.gender && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        variant="danger"
        loading={loading}
      />

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk User Import"
        showFooter={false}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex gap-4">
              <div className="p-3 bg-blue-100 rounded-lg h-fit">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">Import Instructions</h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  To import users in bulk, please upload a CSV file with the following headers:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Name', 'Email', 'Role', 'Password', 'Department', 'Student ID', 'CGPA', 'Section', 'Gender'].map(h => (
                    <span key={h} className="px-2 py-1 bg-white border border-blue-200 rounded text-xs font-mono text-blue-700">
                      {h}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-4 italic">
                  * Roles must be: student, advisor, dept-head, faculty-head, or admin.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-10 hover:border-blue-400 transition-colors bg-gray-50 group cursor-pointer relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <Upload className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mb-4 transition-colors" />
            <p className="text-lg font-semibold text-gray-700">Click or Drag CSV file to upload</p>
            <p className="text-sm text-gray-500 mt-1">Maximum file size: 5MB</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button onClick={downloadTemplate} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

    </PageContainer>
  );
};

export default UserManagement;