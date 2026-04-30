import React from 'react';
import { Clock, PowerOff, AlertCircle } from 'lucide-react';

const SemesterStatusBanner = ({ academicYear, isReadOnly }) => {
  if (!academicYear) return null;

  const getPhaseDetails = () => {
    if (academicYear.status === 'terminated') {
      return {
        phase: 'Academic Year Terminated',
        description: 'The academic year has ended. The system is in read-only mode. You can view your data but cannot make changes.',
        icon: PowerOff,
        color: 'red',
      };
    }

    if (academicYear.status === 'pending_setup') {
      return {
        phase: 'System Setup Pending',
        description: 'The academic year has not been set up yet. Please contact the Faculty Head.',
        icon: AlertCircle,
        color: 'yellow',
      };
    }

    if (academicYear.semester === '1') {
      return {
        phase: 'Semester 1: Documentation Phase',
        description: 'Focus on project proposals, group formation, and advisor assignment.',
        icon: Clock,
        color: 'blue',
      };
    }

    if (academicYear.semester === '2') {
      return {
        phase: 'Semester 2: Implementation Phase',
        description: 'Focus on final year project implementation progress such as front-end, back-end,database and etc...',
        icon: Clock,
        color: 'teal',
      };
    }

    return null;
  };

  const phaseDetails = getPhaseDetails();
  if (!phaseDetails) return null;

  const colorClasses = {
    red: 'bg-red-50 border-red-500 text-red-800',
    blue: 'bg-blue-50 border-blue-500 text-blue-800',
    teal: 'bg-teal-50 border-teal-500 text-teal-800',
    yellow: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  };

  const Icon = phaseDetails.icon;

  return (
    <div className={`border-l-4 p-4 rounded-r-lg shadow-sm ${colorClasses[phaseDetails.color]}`} style={{ fontFamily: 'Times New Roman, serif' }}>
      <div className="flex items-start gap-4">
        <Icon className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <p className="font-bold">
              {phaseDetails.phase}
            </p>
            {academicYear.current && (
              <span className="text-sm font-normal bg-white/50 px-2 py-0.5 rounded-full">
                {academicYear.current}
              </span>
            )}
            {isReadOnly && (
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                Read Only
              </span>
            )}
          </div>
          <p className="text-sm mt-1 opacity-90">
            {phaseDetails.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SemesterStatusBanner;
