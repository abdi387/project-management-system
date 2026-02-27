// src/components/common/SemesterStatusBanner.jsx
import React from 'react';
import { Clock, PowerOff } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

const SemesterStatusBanner = () => {
  const { academicYear } = useProject();

  if (!academicYear) return null;

  const getPhaseDetails = () => {
    if (academicYear.status === 'terminated') {
      return {
        phase: 'Cycle Terminated',
        description: 'The academic year has ended. The system is in a read-only state for most roles.',
        icon: PowerOff,
        color: 'red',
      };
    }
    if (academicYear.semester === 1) {
      return {
        phase: 'Semester 1: Documentation Phase',
        icon: Clock,
        color: 'blue',
      };
    }
    if (academicYear.semester === 2) {
      return {
        phase: 'Semester 2: Implementation Phase',
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
  };

  const Icon = phaseDetails.icon;

  return (
    <div className={`border-l-4 p-4 rounded-r-lg shadow-sm ${colorClasses[phaseDetails.color]}`}>
      <div className="flex items-center gap-4">
        <Icon className="w-6 h-6" />
        <div>
          <p className="font-bold">
            {phaseDetails.phase} <span className="font-normal text-sm">({academicYear.current})</span>
          </p>
          <p className="text-sm">{phaseDetails.description}</p>
        </div>
      </div>
    </div>
  );
};

export default SemesterStatusBanner;