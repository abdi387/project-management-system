import React, { useState, useEffect } from 'react';
import { Camera, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, userService, academicService } from '../../services';
import useFetch from '../../hooks/useFetch';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AdvisorProfile = () => {
  const navigate = useNavigate();
  const { user, updateOwnProfile } = useAuth();
  const { isReadOnly, systemSettings } = useProtectedRoute();

  // Fetch current academic year to filter groups
  const {
    data: currentYearData,
    loading: yearLoading
  } = useFetch(() => academicService.getCurrentAcademicYear(), []);

  // Fetch advisor's groups (filtered by current academic year)
  const {
    data: groupsData,
    loading: groupsLoading
  } = useFetch(() => {
    const currentYearId = currentYearData?.academicYear?.id;
    return groupService.getGroups({ advisorId: user.id, academicYearId: currentYearId });
  }, [user.id, currentYearData]);

  // Fetch fresh settings on mount to ensure we have the latest value
  const {
    data: settingsData
  } = useFetch(() => academicService.getSystemSettings(), []);

  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize profile picture from user context (only when it actually changes)
  useEffect(() => {
    const newPic = user?.profilePicture || '';
    setProfilePicture(prev => {
      // Only update if it's actually different to avoid re-renders
      return prev !== newPic ? newPic : prev;
    });
  }, [user?.profilePicture]);

  const groups = groupsData?.groups || [];
  // Merge context settings with freshly fetched settings (fresh takes priority)
  const freshSettings = settingsData?.settings || systemSettings || {};
  // support both the newer and legacy keys; academic backend prefers "maximum_groups_per_advisor"
  const maxGroups = parseInt(freshSettings.maximum_groups_per_advisor ?? freshSettings.max_groups_per_advisor) || 3;
  const currentGroupCount = groups.length;
  const availableSlots = Math.max(0, maxGroups - currentGroupCount);

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
      const result = await updateOwnProfile({ profilePicture });
      if (result.success) {
        toast.success('Profile picture updated successfully!');
        setShowEditModal(false);
      } else {
        toast.error(result.error || 'Failed to update profile picture');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentAbbreviation = (department) => {
    if (!department) return 'N/A';
    const words = department.split(' ');
    if (words.length > 1) {
      return words.map(word => word[0]).join('');
    }
    return department.slice(0, 3).toUpperCase();
  };

  if (groupsLoading || yearLoading) {
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
        user={user}
        editable={!isReadOnly}
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
            <p className="text-3xl font-bold text-purple-600">{availableSlots}</p>
            <p className="text-sm text-gray-600">Available Slots</p>
          </div>
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-3xl font-bold text-teal-600">{getDepartmentAbbreviation(user?.department)}</p>
            <p className="text-sm text-gray-600">Department</p>
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
    </PageContainer>
  );
};

export default AdvisorProfile;