import React from 'react';
import { Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/dateUtils';

const DeptDefenseSchedule = () => {
  const { user, users } = useAuth();
  const { getDefenseSchedules, groups, academicYear } = useProject();

  const department = user?.department;

  // Filter schedules for this department and current semester
  const schedules = getDefenseSchedules().filter(s => 
    s.department === department && (s.semester || 1) === academicYear.semester
  );

  const columns = [
    { key: 'groupName', label: 'Group' },
    { 
      key: 'members', 
      label: 'Group Members',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return group?.members?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '-';
      }
    },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'time', label: 'Time' },
    { key: 'venue', label: 'Venue' },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (evaluators) => evaluators?.map(e => e.name).join(', ') || '-'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Defense Schedule</h1>
          <p className="text-gray-500">{department} Department</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Total Scheduled: {schedules.length}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={schedules}
          searchable
          pageSize={10}
          emptyMessage="No defense schedules found for this department."
        />
      </div>
    </div>
  );
};

export default DeptDefenseSchedule;