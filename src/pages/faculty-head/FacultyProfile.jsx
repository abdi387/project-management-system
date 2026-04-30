import React, { useState } from 'react';
import { Camera, Building, Users, Calendar, Award, Shield, Mail, Phone, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService, groupService, defenseService, academicService } from '../../services';
import uploadService from '../../services/uploadService';
import useFetch from '../../hooks/useFetch';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Helper function to get full image URL
const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `http://localhost:5001${path}`;
  return path;
};

const FacultyProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();
  const { academicYear } = useProtectedRoute();

  // Fetch faculty-wide stats
  const { 
    data: groupsData, 
    loading: groupsLoading 
  } = useFetch(() => groupService.getGroups({ academicYearId: academicYear?.id }), [academicYear?.id]);

  const { 
    data: defenseData,
    loading: defenseLoading 
  } = useFetch(() => defenseService.getDefenseSchedules({ semester: academicYear?.semester }), [academicYear?.semester]);

  const { 
    data: settingsData,
    loading: settingsLoading 
  } = useFetch(() => academicService.getSystemSettings());

  const groups = groupsData?.groups || [];
  const schedules = defenseData?.schedules || [];
  const settings = settingsData?.settings || {};

  // Calculate statistics
  const totalGroups = groups.length;
  const completedProjects = groups.filter(g => g.finalDraftStatus === 'fully-approved').length;
  const scheduledDefenses = schedules.length;
  const departments = ['Computer Science', 'Information Technology', 'Information Systems'];

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

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
      console.log('Uploading profile picture for faculty head...');
      
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

  if (groupsLoading || defenseLoading || settingsLoading) {
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

      {/* Role Information */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          Role Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-sm text-indigo-600">Position</p>
                <p className="font-semibold text-indigo-900">Faculty Head</p>
              </div>
            </div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-sm text-indigo-600">Academic Year</p>
                <p className="font-semibold text-indigo-900">{academicYear?.current || 'Not Set'}</p>
              </div>
            </div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-sm text-indigo-600">Semester</p>
                <p className="font-semibold text-indigo-900">Semester {academicYear?.semester || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Faculty Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{totalGroups}</p>
            <p className="text-sm text-gray-600">Total Groups</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{completedProjects}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{scheduledDefenses}</p>
            <p className="text-sm text-gray-600">Defenses</p>
          </div>
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-3xl font-bold text-teal-600">3</p>
            <p className="text-sm text-gray-600">Departments</p>
          </div>
        </div>
      </div>

      {/* Departments Managed */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Departments Under Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {departments.map((dept, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{dept}</p>
                <p className="text-sm text-gray-500">Department</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">+251 46 120 6579</span>
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
              src={previewUrl || (user?.profilePicture ? getFullImageUrl(user.profilePicture) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=fff&size=150&bold=true`)}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
            />
            <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-3 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
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

export default FacultyProfile;