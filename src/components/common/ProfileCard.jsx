import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../utils/dateUtils';

const ProfileCard = ({ user, editable = false, onEdit }) => {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Helper function to get full image URL
  const getFullImageUrl = (path) => {
    if (!path) return null;
    // Base64 data URLs are used as-is
    if (path.startsWith('data:image')) return path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `http://localhost:5001${path}`;
    return path;
  };

  // Get role-based color for avatar
  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'from-gray-700 to-gray-900';
      case 'faculty-head': return 'from-indigo-600 to-indigo-800';
      case 'dept-head': return 'from-teal-600 to-teal-800';
      case 'advisor': return 'from-purple-600 to-purple-800';
      case 'student': return 'from-blue-600 to-blue-800';
      default: return 'from-blue-600 to-blue-800';
    }
  };

  const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3b82f6&color=fff&size=128&bold=true`;

  // Update image URL only when profilePicture changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    
    if (user?.profilePicture) {
      const fullUrl = getFullImageUrl(user.profilePicture);
      setImageUrl(fullUrl);
    } else {
      setImageUrl(defaultImage);
      setImageLoaded(true);
    }
  }, [user?.profilePicture]);

  const handleImageError = () => {
    console.log('Image failed to load. URL attempted:', imageUrl);
    setImageError(true);
    setImageUrl(defaultImage);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    console.log('Image loaded successfully');
    setImageLoaded(true);
    setImageError(false);
  };

  const handleRetry = () => {
    setImageError(false);
    setImageLoaded(false);
    if (user?.profilePicture) {
      const fullUrl = getFullImageUrl(user.profilePicture);
      setImageUrl(`${fullUrl}?t=${Date.now()}`);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with gradient based on role */}
      <div className={`h-32 bg-gradient-to-r ${getRoleColor(user.role)}`} />

      {/* Profile Content */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Loading...</span>
                </div>
              )}
            </div>
            {imageError && user?.profilePicture && (
              <button
                onClick={handleRetry}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full shadow-lg hover:bg-yellow-600 whitespace-nowrap"
              >
                Retry Load
              </button>
            )}
            {editable && (
              <button
                onClick={onEdit}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                title="Change profile picture"
              >
                <User className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pt-20">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-500 capitalize">
                {user.role?.replace('-', ' ')}
              </p>
            </div>
            <StatusBadge status={user.status || 'active'} />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="truncate">{user.email}</span>
            </div>

            {user.department && (
              <div className="flex items-center gap-3 text-gray-600">
                <Building className="w-5 h-5 text-gray-400" />
                <span>{user.department}</span>
              </div>
            )}

            {user.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>
          </div>

          {/* Student-specific information removed as per previous request */}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;