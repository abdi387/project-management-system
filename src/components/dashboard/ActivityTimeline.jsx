// src/components/dashboard/ActivityTimeline.jsx
import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Users,
  MessageSquare,
  Upload,
  Calendar,
  X,
  ArrowRight,
  Shield
} from 'lucide-react';
import { getRelativeTime } from '../../utils/dateUtils';

const ActivityTimeline = ({ activities = [], onActivityClick, onRemoveActivity }) => {
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
      case 'file-text':
        return { icon: FileText, color: 'bg-indigo-100 text-indigo-600' };
      case 'calendar':
        return { icon: Calendar, color: 'bg-pink-100 text-pink-600' };
      case 'user-plus':
        return { icon: Users, color: 'bg-blue-100 text-blue-600' };
      case 'check-circle':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-600' };
      case 'evaluation':
        return { icon: Shield, color: 'bg-indigo-100 text-indigo-600' };
      case 'info':
        return { icon: Clock, color: 'bg-gray-100 text-gray-600' };
      default:
        return { icon: Clock, color: 'bg-gray-100 text-gray-600' };
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        <h3 className="text-base font-bold text-gray-900 mb-4 tracking-wide">Recent Activity</h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6" style={{ fontFamily: 'Times New Roman, serif' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 tracking-wide">Recent Activity</h3>
        {activities.length > 0 && activities[0]?.academicYear && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
              {activities[0].academicYear}
            </span>
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-medium">
              {activities[0].semester}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const { icon: Icon, color } = getActivityIcon(activity.type);
          const hasLink = activity.link && onActivityClick;

          const ActivityContent = (
            <>
              <div className={`shrink-0 w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                  {activity.academicYear && activity.semester && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {activity.academicYear} • {activity.semester}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate mt-1">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {getRelativeTime(activity.timestamp)}
                </p>
              </div>

              {onRemoveActivity && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveActivity(activity.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Remove activity"
                  aria-label="Remove activity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {hasLink && (
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
              )}
            </>
          );

          return (
            <div
              key={activity.id || index}
              onClick={() => hasLink ? onActivityClick(activity) : undefined}
              className={`flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0 group transition-colors -mx-2 px-2 rounded-lg ${hasLink ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
              {ActivityContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
