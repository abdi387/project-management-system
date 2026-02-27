// src/pages/dept-head/DeptProfile.jsx
import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const DeptProfile = () => {
  const { user, updateUser } = useAuth();
  const { getStatsByDepartment } = useProject();
  
  const stats = getStatsByDepartment(user?.department);
  
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

      {/* Department Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.totalGroups}</p>
            <p className="text-sm text-gray-600">Total Groups</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.approvedProposals}</p>
            <p className="text-sm text-gray-600">Approved Proposals</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingProposals}</p>
            <p className="text-sm text-gray-600">Pending Proposals</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{stats.groupsWithAdvisor}</p>
            <p className="text-sm text-gray-600">With Advisor</p>
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
              src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=14b8a6&color=fff&size=150`}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
            />
            <label className="absolute bottom-0 right-0 bg-teal-600 text-white p-3 rounded-full cursor-pointer hover:bg-teal-700 transition-colors shadow-lg">
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

export default DeptProfile;