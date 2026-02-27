// src/components/common/ProfileCard.jsx
import React from 'react';
import { User, Mail, Building, Phone, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../utils/dateUtils';

const ProfileCard = ({ user, editable = false, onEdit }) => {
  const defaultImage = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=3b82f6&color=fff&size=128';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <div className="h-32 bg-linear-to-r from-blue-600 to-blue-800" />
      
      {/* Profile Content */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-6">
          <div className="relative">
            <img
              src={user?.profilePicture || defaultImage}
              alt={user?.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
            />
            {editable && (
              <button 
                onClick={onEdit}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
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
              <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 capitalize">{user?.role?.replace('-', ' ')}</p>
            </div>
            <StatusBadge status={user?.status || 'active'} />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>{user?.email}</span>
            </div>
            
            {user?.department && (
              <div className="flex items-center gap-3 text-gray-600">
                <Building className="w-5 h-5 text-gray-400" />
                <span>{user.department}</span>
              </div>
            )}
            
            {user?.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>Joined {formatDate(user?.createdAt)}</span>
            </div>
          </div>

          {/* Additional Info for Students */}
          {user?.role === 'student' && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Student ID</p>
                  <p className="font-semibold text-gray-900">{user.studentId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">CGPA</p>
                  <p className="font-semibold text-gray-900">{user.cgpa?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Section</p>
                  <p className="font-semibold text-gray-900">{user.section || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Year</p>
                  <p className="font-semibold text-gray-900">4th Year</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;