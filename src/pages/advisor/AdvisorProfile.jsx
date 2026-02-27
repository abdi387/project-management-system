// src/pages/advisor/AdvisorProfile.jsx
import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const AdvisorProfile = () => {
  const { user, updateUser } = useAuth();
  const { projectSettings, groups } = useProject();
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [loading, setLoading] = useState(false);

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

  // Calculate dynamic stats
  const currentGroupCount = groups.filter(g => g.advisorId === user?.id).length;
  const maxGroups = projectSettings?.maxGroupsPerAdvisor || 5;
  const availableSlots = Math.max(0, maxGroups - currentGroupCount);

  const getDepartmentAbbreviation = (department) => {
    if (!department) return 'N/A';
    const words = department.split(' ');
    if (words.length > 1) {
      return words.map(word => word[0]).join('');
    }
    return department.slice(0, 3).toUpperCase();
  };
  const departmentAbbreviation = getDepartmentAbbreviation(user?.department);

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

      {/* Advisor Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Advisor Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{currentGroupCount}</p>
            <p className="text-sm text-gray-600">Current Groups</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{maxGroups}</p>
            <p className="text-sm text-gray-600">Max Groups</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">
              {availableSlots}
            </p>
            <p className="text-sm text-gray-600">Available Slots</p>
          </div>
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-3xl font-bold text-teal-600">{departmentAbbreviation}</p>
            <p className="text-sm text-gray-600">Department</p>
          </div>
        </div>
      </div>

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
              src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=8b5cf6&color=fff&size=150`}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
            />
            <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-3 rounded-full cursor-pointer hover:bg-purple-700 transition-colors shadow-lg">
              <Camera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdvisorProfile;