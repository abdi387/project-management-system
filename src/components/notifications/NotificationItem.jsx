// src/components/notifications/NotificationItem.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle, 
  X,
  XCircle, 
  AlertTriangle, 
  MessageSquare,
  Calendar,
  Users,
  FileText,
  HelpCircle,
  UserPlus
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { getRelativeTime } from '../../utils/dateUtils';

const NotificationItem = ({ notification, onClose }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotification();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'project-claim':
        return { icon: Users, color: 'text-blue-500 bg-blue-50' };
      case 'proposal-approved':
        return { icon: CheckCircle, color: 'text-green-500 bg-green-50' };
      case 'proposal-rejected':
        return { icon: XCircle, color: 'text-red-500 bg-red-50' };
      case 'progress-feedback':
        return { icon: MessageSquare, color: 'text-purple-500 bg-purple-50' };
      case 'overdue':
        return { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-50' };
      case 'draft-approved':
        return { icon: FileText, color: 'text-teal-500 bg-teal-50' };
      case 'defense-schedule':
      case 'evaluators-assigned-group':
        return { icon: AlertTriangle, color: 'text-red-500 bg-red-50' };
      case 'evaluator-assigned':
        return { icon: Users, color: 'text-cyan-500 bg-cyan-50' };
      case 'registration-approved':
        return { icon: CheckCircle, color: 'text-green-500 bg-green-50' };
      case 'registration-rejected':
        return { icon: XCircle, color: 'text-red-500 bg-red-50' };
      case 'draft-escalation':
        return { icon: FileText, color: 'text-indigo-500 bg-indigo-50' };
      case 'new-registration':
        return { icon: UserPlus, color: 'text-blue-500 bg-blue-50' };
      case 'proposal-submission':
        return { icon: FileText, color: 'text-purple-500 bg-purple-50' };
      case 'system-support':
        return { icon: HelpCircle, color: 'text-orange-500 bg-orange-50' };
      default:
        return { icon: Bell, color: 'text-gray-500 bg-gray-50' };
    }
  };

  const { icon: Icon, color } = getNotificationIcon(notification.type);

  const handleClick = () => {
    markAsRead(notification.id);

    // Explicitly prevent navigation for registration notifications
    if (['registration-approved', 'registration-rejected'].includes(notification.type)) {
      return;
    }

    if (notification.link) {
      navigate(notification.link);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        relative flex items-start gap-3 px-4 py-3 transition-colors group
        hover:bg-gray-50
        ${notification.link && !['registration-approved', 'registration-rejected'].includes(notification.type) ? 'cursor-pointer' : 'cursor-default'}
        ${!notification.read ? 'bg-red-50/50' : ''}
      `}
    >
      <div className={`shrink-0 p-2 rounded-full ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.read ? 'font-bold' : 'font-medium'} text-gray-900`}>
          {notification.title}
        </p>
        <p className="text-sm text-gray-500 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>
      
      {!notification.read && (
        <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500" />
      )}

      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default NotificationItem;