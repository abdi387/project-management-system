// src/pages/admin/AdminProfile.jsx
import React, { useState } from 'react';
import { Camera, Shield, Users, Settings, Server, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const AdminProfile = () => {
  const { user, users, updateUser } = useAuth();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [loading, setLoading] = useState(false);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      updateUser(user.id, { profilePicture });
      toast.success('Profile picture updated successfully!');
      setShowEditModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      
      <ProfileCard 
        user={user} 
        editable 
        onEdit={() => setShowEditModal(true)} 
      />

      {/* Admin Role Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-700" />
          Administrator Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-gray-300" />
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="font-semibold">System Administrator</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-gray-300" />
              <div>
                <p className="text-sm text-gray-400">Access Level</p>
                <p className="font-semibold">Full Access</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">System Status</p>
                <p className="font-semibold text-green-400">Operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{userStats.students}</p>
            <p className="text-sm text-gray-500">Students</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{userStats.advisors}</p>
            <p className="text-sm text-gray-500">Advisors</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{userStats.deptHeads}</p>
            <p className="text-sm text-gray-500">Dept Heads</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{userStats.facultyHead}</p>
            <p className="text-sm text-gray-500">Faculty Head</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">1</p>
            <p className="text-sm text-gray-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-700" />
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
        onClose={() => setShowEditModal(false)}
        title="Update Profile Picture"
        onConfirm={handleSave}
        confirmText="Save Changes"
        loading={loading}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <img
              src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=374151&color=fff&size=150`}
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
            Recommended size: 150x150 pixels
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProfile;