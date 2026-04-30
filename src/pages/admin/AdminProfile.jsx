import React, { useState } from 'react';
import { Camera, Shield, Users, Settings, Server, Activity, Mail, Award, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService } from '../../services';
import uploadService from '../../services/uploadService';
import useFetch from '../../hooks/useFetch';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

// Helper function to get full image URL
const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `http://localhost:5001${path}`;
  return path;
};

const AdminProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();

  // Fetch all users for statistics
  const { 
    data: usersData, 
    loading: usersLoading 
  } = useFetch(() => userService.getUsers(), []);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  const users = usersData?.users || [];

  // Calculate user statistics
  const userStats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    advisors: users.filter(u => u.role === 'advisor').length,
    deptHeads: users.filter(u => u.role === 'dept-head').length,
    facultyHead: users.filter(u => u.role === 'faculty-head').length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    inactive: users.filter(u => u.status === 'inactive').length
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Uploading profile picture for admin...');
      
      // Upload the file
      const response = await uploadService.uploadProfilePicture(selectedFile);
      
      console.log('Upload response:', response);
      
      // Update the user in context with the response data
      if (response && response.user) {
        // Update context
        updateUser(user.id, { profilePicture: response.imageUrl });
        
        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem('fypUser') || '{}');
        storedUser.profilePicture = response.imageUrl;
        localStorage.setItem('fypUser', JSON.stringify(storedUser));
        
        // Force image refresh
        setImageKey(Date.now());
        
        toast.success('Profile picture updated successfully!');
        setShowEditModal(false);
        setSelectedFile(null);
        setPreviewUrl('');
        
        // Refresh user data from server
        setTimeout(() => {
          refreshUser();
        }, 500);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.error || 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  if (usersLoading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />;
  }

  return (
    <PageContainer title="">
      {/* Change Password Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => navigate('/auth/change-password')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <Key className="w-4 h-4" />
          <span>Change Password</span>
        </button>
      </div>

      <ProfileCard
        key={imageKey}
        user={user}
        editable
        onEdit={() => setShowEditModal(true)}
      />

      {/* Admin Role Information */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-700" />
          Administrator Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-gray-300" />
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="font-semibold">System Administrator</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-300" />
              <div>
                <p className="text-sm text-blue-400">Access Level</p>
                <p className="font-semibold">Full Access</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-300" />
              <div>
                <p className="text-sm text-green-400">System Status</p>
                <p className="font-semibold text-green-300">Operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-700" />
          User Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{userStats.total}</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{userStats.active}</p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{userStats.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-3xl font-bold text-gray-600">{userStats.inactive}</p>
            <p className="text-sm text-gray-600">Inactive</p>
          </div>
        </div>
      </div>

      {/* Users by Role */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-blue-600">{userStats.students}</p>
            <p className="text-sm text-gray-500">Students</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-purple-600">{userStats.advisors}</p>
            <p className="text-sm text-gray-500">Advisors</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-teal-600">{userStats.deptHeads}</p>
            <p className="text-sm text-gray-500">Dept Heads</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-indigo-600">{userStats.facultyHead}</p>
            <p className="text-sm text-gray-500">Faculty Head</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-gray-600">1</p>
            <p className="text-sm text-gray-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Admin Responsibilities */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-gray-700" />
          Admin Responsibilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">User Management</h3>
              <p className="text-sm text-gray-500">Add, edit, activate, and deactivate system users</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Role Assignment</h3>
              <p className="text-sm text-gray-500">Assign roles to faculty head, dept heads, and advisors</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">System Maintenance</h3>
              <p className="text-sm text-gray-500">Manage system settings and perform maintenance tasks</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">System Monitoring</h3>
              <p className="text-sm text-gray-500">Monitor system health and user activities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Picture Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedFile(null);
          setPreviewUrl('');
        }}
        title="Update Profile Picture"
        onConfirm={handleSave}
        confirmText="Upload"
        loading={loading}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <img
              src={previewUrl || (user?.profilePicture ? getFullImageUrl(user.profilePicture) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=374151&color=fff&size=150&bold=true`)}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
            />
            <label className="absolute bottom-0 right-0 bg-gray-700 text-white p-3 rounded-full cursor-pointer hover:bg-gray-800 transition-colors shadow-lg">
              <Camera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Click the camera icon to upload a new profile picture.<br />
            Max file size: 5MB<br />
            Supported formats: JPG, PNG, GIF
          </p>
          {selectedFile && (
            <div className="text-center">
              <p className="text-xs text-green-600">
                ✓ Selected: {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                Size: {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default AdminProfile;