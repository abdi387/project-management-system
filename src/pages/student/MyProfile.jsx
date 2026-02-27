// src/pages/student/MyProfile.jsx
import React, { useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileCard from '../../components/common/ProfileCard';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const MyProfile = () => {
  const { user, updateUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you would upload to a server
      // For demo, we'll use a data URL
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

      {/* Read-only Information Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800">Note</h3>
        <p className="text-sm text-yellow-700 mt-1">
          Personal information such as name, student ID, CGPA, department, and section 
          are managed by the system and cannot be edited. Only your profile picture can be updated.
        </p>
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
              src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3b82f6&color=fff&size=150`}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
            />
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-3 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
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

export default MyProfile;