import React, { useState } from 'react';
import { Camera, Building, Users, FileText, CheckCircle, Clock, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService } from '../../services';
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

const DeptProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();
  const department = user?.department;

  // Fetch department stats
  const { 
    data: groupsData, 
    loading: groupsLoading 
  } = useFetch(() => groupService.getGroups({ 
    department, 
    academicYearId: academicYear?.id 
  }), [department, academicYear?.id]);

  const { 
    data: proposalsData,
    loading: proposalsLoading 
  } = useFetch(() => proposalService.getProposalsByDepartment(department), [department]);

  const groups = groupsData?.groups || [];
  const proposals = proposalsData?.proposals || [];

  const stats = {
    totalGroups: groups.length,
    approvedProposals: proposals.filter(p => p.status === 'approved').length,
    pendingProposals: proposals.filter(p => p.status === 'pending').length,
    groupsWithAdvisor: groups.filter(g => g.advisorId).length,
    completedProjects: groups.filter(g => g.finalDraftStatus === 'fully-approved').length
  };

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
      // Upload the file
      const response = await uploadService.uploadProfilePicture(selectedFile);
      
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

  if (groupsLoading || proposalsLoading) {
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
        editable={!isReadOnly}
        onEdit={() => setShowEditModal(true)}
      />

      {/* Department Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-teal-600" />
          Department Overview - {department}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-3xl font-bold text-teal-600">{stats.completedProjects}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <Users className="w-8 h-8 text-blue-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Student Management</h3>
          <p className="text-sm text-gray-600 mt-1">Approve registrations and view students</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
          <FileText className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Proposal Evaluation</h3>
          <p className="text-sm text-gray-600 mt-1">Review and approve project proposals</p>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-lg p-4 border border-teal-100">
          <CheckCircle className="w-8 h-8 text-teal-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Progress Monitoring</h3>
          <p className="text-sm text-gray-600 mt-1">Track group progress and final drafts</p>
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
              src={previewUrl || (user?.profilePicture ? getFullImageUrl(user.profilePicture) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=14b8a6&color=fff&size=150&bold=true`)}
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

export default DeptProfile;