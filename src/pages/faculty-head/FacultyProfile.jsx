// src/pages/faculty-head/FacultyProfile.jsx
import React, { useState } from 'react';
import { Camera, Building, Users, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const FacultyProfile = () => {
  const { user, updateUser } = useAuth();
  const { getFacultyStats, academicYear, getDefenseSchedules, groups } = useProject();
  
  const stats = getFacultyStats();
  const allSchedules = getDefenseSchedules();
  const defenseSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);

  // Semester 2 specific stats
  const submittedFinalDrafts = (groups || []).filter(g => g.finalDraftStatus && g.finalDraftStatus !== 'pending').length;
  const fullyApprovedDrafts = (groups || []).filter(g => g.finalDraftStatus === 'fully-approved').length;

  
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

      {/* Role Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          Role Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-indigo-600" />
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
                <p className="font-semibold text-indigo-900">{academicYear.current}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Faculty Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.totalGroups}</p>
            <p className="text-sm text-gray-600">Total Groups</p>
          </div>
          {academicYear.semester === 1 ? (
            <>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats.approvedProposals}</p>
                <p className="text-sm text-gray-600">Approved Proposals</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{stats.totalProposals}</p>
                <p className="text-sm text-gray-600">Total Proposals</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{fullyApprovedDrafts}</p>
                <p className="text-sm text-gray-600">Fully Approved</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{submittedFinalDrafts}</p>
                <p className="text-sm text-gray-600">Submitted Drafts</p>
              </div>
            </>
          )}
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-3xl font-bold text-teal-600">{stats.completedProjects}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">{defenseSchedules.length}</p>
            <p className="text-sm text-gray-600">Defenses</p>
          </div>
        </div>
      </div>

      {/* Departments Managed */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Departments Under Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Computer Science', 'Information Technology', 'Information Systems'].map((dept, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 flex items-center gap-3">
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
              src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=fff&size=150`}
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
            Recommended size: 150x150 pixels
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default FacultyProfile;