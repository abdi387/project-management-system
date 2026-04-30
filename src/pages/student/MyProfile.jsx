import React, { useMemo, useState } from 'react';
import { Camera, Mail, Building, Phone, Calendar, User, GraduationCap, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { sectionService, uploadService } from '../../services';
import useFetch from '../../hooks/useFetch';
import ProfileCard from '../../components/common/ProfileCard';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, resolveSectionName } from '../../utils/sectionDisplay';

// Helper function to get full image URL
const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `http://localhost:5001${path}`;
  return path;
};

// Helper function to safely format CGPA
const formatCGPA = (cgpa) => {
  if (cgpa === null || cgpa === undefined) return 'N/A';
  if (typeof cgpa === 'number') return cgpa.toFixed(2);
  if (typeof cgpa === 'string') {
    const parsed = parseFloat(cgpa);
    if (!isNaN(parsed)) return parsed.toFixed(2);
  }
  return 'N/A';
};

const MyProfile = () => {
  const navigate = useNavigate();
  const { user, updateOwnProfile, refreshUser } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(user?.department, true),
    [user?.department],
    !!user?.department
  );

  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );
  const studentSectionName = useMemo(
    () => (user?.section ? resolveSectionName(user.section, sectionNameMap) : 'N/A'),
    [user?.section, sectionNameMap]
  );

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
      console.log('Uploading profile picture for student...');
      
      // Upload the file
      const response = await uploadService.uploadProfilePicture(selectedFile);
      
      console.log('Upload response:', response);
      
      // Update the user in context with the response data
      if (response && response.user) {
        // Update own profile using the correct method
        const updateResult = await updateOwnProfile({ profilePicture: response.imageUrl });
        
        if (updateResult.success) {
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
        } else {
          toast.error(updateResult.error || 'Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.error || 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  // If no user data, show loading
  if (!user) {
    return <LoadingSpinner fullScreen text="Loading user data..." />;
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

      {/* Student Information Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Student Information
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Student ID */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-500">Student ID</p>
            <p className="text-xl font-bold text-blue-600 font-mono">
              {user?.studentId || 'N/A'}
            </p>
          </div>

          {/* CGPA */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-500">CGPA</p>
            <p className={`text-xl font-bold ${
              user?.cgpa >= 3.5 ? 'text-green-600' :
              user?.cgpa >= 3.0 ? 'text-blue-600' :
              user?.cgpa >= 2.5 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {formatCGPA(user?.cgpa)}
            </p>
          </div>

          {/* Section */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-500">Section</p>
            <p className="text-xl font-bold text-purple-600">
              {studentSectionName}
            </p>
          </div>

          {/* Year */}
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-sm text-gray-500">Year</p>
            <p className="text-xl font-bold text-teal-600">4th Year</p>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-600" />
          Personal Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">{user?.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Building className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium text-gray-900">{user?.department || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Joined</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(user?.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Gender</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user?.gender || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Read-only Information Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-yellow-600 text-lg">ℹ️</span>
          </div>
          <div>
            <h3 className="font-medium text-yellow-800">Note</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Personal information such as name, student ID, CGPA, department, and section
              are managed by the system and cannot be edited. Only your profile picture can be updated.
            </p>
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
              src={previewUrl || (user?.profilePicture ? getFullImageUrl(user.profilePicture) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Student')}&background=3b82f6&color=fff&size=150&bold=true`)}
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

export default MyProfile;
