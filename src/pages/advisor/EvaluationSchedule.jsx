// src/pages/advisor/EvaluationSchedule.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/dateUtils';

const EvaluationSchedule = () => {
  const { user, users } = useAuth();
  const { getDefenseSchedules, academicYear, groups } = useProject();

  // 1. Get all groups where user is an evaluator
  const myEvaluationGroups = (groups || []).filter(g => 
    g.evaluators?.some(e => e.id === user?.id)
  );

  // 2. Get schedules for the current semester
  const allSchedules = getDefenseSchedules();
  const semesterSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);

  // 3. Merge group info with schedule info
  const evaluationDuties = myEvaluationGroups.map(group => {
    const schedule = semesterSchedules.find(s => s.groupId === group.id);
    
    // Only show if scheduled in this semester
    if (!schedule) return null;

    const evaluators = group.evaluators.map(e => e.name).join(', ');
    return {
      groupId: group.id,
      groupName: group.name,
      projectTitle: group.approvedTitle,
      department: group.department,
      members: group.members,
      date: formatDate(schedule.date),
      time: schedule.time,
      venue: schedule.venue, 
      evaluators: evaluators || 'None'
    };
  }).filter(Boolean);

  const columns = [
    { key: 'groupName', label: 'Group' },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        if (!row.members || row.members.length === 0) return 'N/A';
        const firstMember = users.find(u => u.id === row.members[0]);
        return firstMember?.section || 'N/A';
      }
    },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'department', label: 'Department' },
    {
      key: 'members',
      label: 'Group Members',
      render: (memberIds) => {
        if (!memberIds || memberIds.length === 0) return '-';
        const memberNames = (memberIds || []).map(id => (users || []).find(u => u.id === id)?.name).filter(Boolean);
        return memberNames.join(', ');
      }
    },
    { key: 'date', label: 'Date'},
    { key: 'time', label: 'Time' },
    { key: 'venue', label: 'Venue' },
    { key: 'evaluators', label: 'Evaluators' }
  ];

  return (

    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Evaluation Schedule</h1>
      <DataTable 
        columns={columns}
        data={evaluationDuties}
        searchable
        emptyMessage="No evaluation schedules found."
      />

    </div>
  );
};

export default EvaluationSchedule;