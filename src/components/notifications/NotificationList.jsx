import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, AlertCircle, Info, Clock, FileText, Calendar, HelpCircle, UserPlus, MessageSquare } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const NotificationList = ({ notifications, onClose }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotification();

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="bg-gray-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900">No notifications</p>
        <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
      </div>
    );
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Explicitly prevent navigation for registration notifications
    if (['registration-approved', 'registration-rejected'].includes(notification.type)) {
      return;
    }

    if (notification.link) {
      navigate(notification.link);
      if (onClose) onClose();
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation(); // Prevent triggering the click on the container
    deleteNotification(id);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'proposal-approved':
      case 'draft-approved':
      case 'registration-approved':
      case 'project-claim':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'proposal-rejected':
      case 'registration-rejected':
      case 'overdue':
      case 'defense-schedule':
      case 'evaluators-assigned-group':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'defense-duty':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'progress-feedback':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'evaluator-assigned':
      case 'draft-escalation':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'new-registration':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'proposal-submission':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'system-support':
        return <HelpCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-h-100 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => handleNotificationClick(notification)}
          className={`relative p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group ${
            notification.link && !['registration-approved', 'registration-rejected'].includes(notification.type) ? 'cursor-pointer' : 'cursor-default'
          } ${!notification.read ? 'bg-red-50/50' : 'bg-white'}`}
        >
          <div className="flex gap-3">
            <div className="mt-1 shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className={`text-sm ${!notification.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`} >
                  {notification.title}
                </p>
              </div>
              <p className={`text-xs mt-0.5 line-clamp-2 ${!notification.read ? 'text-gray-800' : 'text-gray-500'}`}>
                {notification.message}
              </p>
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(notification.createdAt).toLocaleDateString()} • {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!notification.read && (
               <div className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-red-500" />
            )}
          </div>
            
          <button
            onClick={(e) => handleDelete(e, notification.id)}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            title="Remove notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationList;