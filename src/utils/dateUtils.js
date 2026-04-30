// src/utils/dateUtils.js

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const isOverdue = (deadline) => {
  if (!deadline) return false;
  return new Date() > new Date(deadline);
};

export const getDaysRemaining = (deadline) => {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateString);
  }
};

// Format "Last active" time with support for minutes, hours, days, and months
// Used to show when user's previous session ended (not current session)
export const formatLastActive = (dateString) => {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  // Calculate remaining after each unit
  const minutes = diffInMinutes % 60;
  const hours = diffInHours % 24;
  
  // Less than 1 minute
  if (diffInMinutes < 1) {
    return 'Just now';
  }
  
  // Less than 1 hour: show minutes
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  // Less than 24 hours: show hours and minutes
  if (diffInHours < 24) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${hours}h ago`;
  }
  
  // Less than 30 days: show days
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }
  
  // 30+ days: show months
  const months = Math.floor(diffInDays / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  
  // 12+ months: show years
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

// Alias for getRelativeTime - this fixes the import error
export const formatRelativeTime = getRelativeTime;

export const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Academic year typically starts in September
  if (month >= 8) { // September onwards
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

export const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

export const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};