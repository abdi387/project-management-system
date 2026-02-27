// src/components/dashboard/ActivityTimeline.jsx
import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Users,
  MessageSquare,
  Upload
} from 'lucide-react';
import { getRelativeTime } from '../../utils/dateUtils';

const ActivityTimeline = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'approval':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-600' };
      case 'submission':
        return { icon: Upload, color: 'bg-blue-100 text-blue-600' };
      case 'feedback':
        return { icon: MessageSquare, color: 'bg-purple-100 text-purple-600' };
      case 'group':
        return { icon: Users, color: 'bg-teal-100 text-teal-600' };
      case 'warning':
        return { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-600' };
      case 'document':
        return { icon: FileText, color: 'bg-indigo-100 text-indigo-600' };
      default:
        return { icon: Clock, color: 'bg-gray-100 text-gray-600' };
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const { icon: Icon, color } = getActivityIcon(activity.type);
          
          return (
            <div key={activity.id || index} className="flex gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {getRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;