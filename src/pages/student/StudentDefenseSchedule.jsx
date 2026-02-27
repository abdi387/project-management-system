import React from 'react';
import { Calendar, Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { formatDate } from '../../utils/dateUtils';

const StudentDefenseSchedule = () => {
  const { user } = useAuth();
  const { getGroupByStudentId, getDefenseSchedules, academicYear } = useProject();

  const group = getGroupByStudentId(user?.id);
  const defenseSchedules = getDefenseSchedules();
  const schedule = group ? defenseSchedules.find(s => s.groupId === group.id && (s.semester || 1) === academicYear.semester) : null;

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Defense Schedule</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Group Assigned</h2>
          <p className="text-yellow-700">
            You need to be assigned to a group to view defense schedules.
          </p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Defense Schedule</h1>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Not Scheduled Yet</h3>
          <p className="text-gray-500 mt-2">
            Your defense has not been scheduled by the department yet. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Defense Schedule</h1>
          <p className="text-sm text-gray-500">
            Details regarding your final project defense.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">{group.approvedTitle || 'Project Defense'}</h2>
          <p className="text-gray-500 text-sm mt-1">Group: {group.name}</p>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> Date
            </div>
            <p className="text-xl font-semibold text-gray-900">{formatDate(schedule.date)}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium uppercase tracking-wider">
              <Clock className="w-4 h-4" /> Time
            </div>
            <p className="text-xl font-semibold text-gray-900">{schedule.time}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium uppercase tracking-wider">
              <MapPin className="w-4 h-4" /> Venue
            </div>
            <p className="text-xl font-semibold text-gray-900">{schedule.venue}</p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium uppercase tracking-wider mb-3">
            <Users className="w-4 h-4" /> Evaluators
          </div>
          <div className="flex flex-wrap gap-3">
            {schedule.evaluators && schedule.evaluators.length > 0 ? (
              schedule.evaluators.map((evaluator, index) => (
                <div key={index} className="flex items-center gap-3 bg-indigo-50 text-indigo-900 px-4 py-3 rounded-lg border border-indigo-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    {evaluator.name.charAt(0)}
                  </div>
                  <span className="font-medium">{evaluator.name}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500 italic">No evaluators assigned yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDefenseSchedule;