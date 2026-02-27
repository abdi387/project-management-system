// src/components/common/StatusBadge.jsx
import React from 'react';

const StatusBadge = ({ status, size = 'md' }) => {
  const statusConfig = {
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
      label: 'Pending'
    },
    approved: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      label: 'Approved'
    },
    rejected: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
      label: 'Rejected'
    },
    active: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
      label: 'Active'
    },
    inactive: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
      label: 'Inactive'
    },
    overdue: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
      label: 'Overdue'
    },
    'in-progress': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
      label: 'In Progress'
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      label: 'Completed'
    },
    submitted: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
      label: 'Submitted'
    },
    reviewed: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      dot: 'bg-indigo-500',
      label: 'Reviewed'
    },
    'not-started': {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      label: 'Not Started'
    },
    'not-submitted': {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      label: 'Not Submitted'
    },
    'advisor-approved': {
      bg: 'bg-teal-100',
      text: 'text-teal-800',
      dot: 'bg-teal-500',
      label: 'Advisor Approved'
    },
    'fully-approved': {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
      label: 'Fully Approved'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${config.bg} ${config.text} ${sizes[size]}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;