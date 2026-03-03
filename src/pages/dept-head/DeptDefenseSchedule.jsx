// src/pages/dept-head/DeptDefenseSchedule.jsx

import React from 'react';
import { Calendar, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/dateUtils';
import { generateDefenseSchedulePDF, downloadPDF } from '../../utils/pdfGenerator';

const DeptDefenseSchedule = () => {
  const { user, users } = useAuth();
  const { getDefenseSchedules, groups, academicYear } = useProject();

  const department = user?.department;

  // Filter schedules for this department and current semester
  const schedules = getDefenseSchedules().filter(s => 
    s.department === department && (s.semester || 1) === academicYear.semester
  );

  const handleExportPDF = () => {
    const doc = generateDefenseSchedulePDF(schedules, department, users, groups);
    downloadPDF(doc, `Defense_Schedule_${department}`);
  };

  const columns = [
    { key: 'groupName', label: 'Group' },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return users.find(u => u.id === group?.members[0])?.section || 'N/A';
      },
    },
    { 
      key: 'members', 
      label: 'Group Members',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        if (!group?.members || group.members.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {group.members.map(id => {
              const member = users.find(u => u.id === id);
              return member ? <span key={id}>{member.name}</span> : null;
            })}
          </div>
        );
      }
    },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'time', label: 'Time' },
    { key: 'venue', label: 'Venue' },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (evaluators) => {
        if (!evaluators || evaluators.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {evaluators.map(e => <span key={e.id || e.name}>{e.name}</span>)}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Defense Schedule</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleExportPDF} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Total Scheduled: {schedules.length}
            </span>
          </div>
        </div>
        <p className="text-gray-500 mt-1">{department} Department</p>
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