// src/pages/advisor/AdvisorEvaluations.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/dateUtils';

const AdvisorEvaluations = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, users } = useAuth();
  const { getDefenseSchedules, academicYear, groups } = useProject();

  // 1. Get all groups where user is an evaluator
  const myEvaluationGroups = (groups || []).filter(g => 
    g.evaluators?.some(e => e.id === user.id)
  );

  // 2. Get schedules for the current semester
  const allSchedules = getDefenseSchedules();
  const semesterSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);

  // 3. Merge group info with schedule info
  const combinedData = myEvaluationGroups.map(group => {
    const schedule = semesterSchedules.find(s => s.groupId === group.id);
    return {
      ...group, // Contains members, approvedTitle, etc.
      groupId: group.id,
      groupName: group.name,
      projectTitle: group.approvedTitle,
      date: schedule?.date,
      time: schedule?.time,
      venue: schedule?.venue,
      isScheduled: !!schedule
    };
  });

  // If a groupId is provided in the URL, filter for that specific duty.
  const dataToShow = groupId
    ? combinedData.filter(duty => duty.groupId === groupId)
    : combinedData;

  const columns = [
    {
      key: 'groupName',
      label: 'Group',
      render: (_, row) => (
        <span className="font-medium">{row.groupName || row.name || 'N/A'}</span>
      )
    },
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
      render: (_, row) => {
        // Access members from the row object directly if the key accessor doesn't pass it correctly
        const memberIds = row.members || [];
        if (!memberIds || memberIds.length === 0) return '-';
        
        const memberNames = memberIds.map(id => (users || []).find(u => u.id === id)?.name).filter(Boolean);
        
        return memberNames.length > 0 ? memberNames.join(', ') : 'Loading members...';
      }
    },
    {
      key: 'evaluators',
      label: 'Evaluation Committee',
      render: (evaluators) => (
        <div className="flex flex-wrap gap-x-2">
          {evaluators?.map(e => (
            <span key={e.id} className={`whitespace-nowrap ${e.id === user.id ? 'font-bold text-indigo-600' : ''}`}>
              {e.name}
            </span>
          )) || '-'}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {groupId && dataToShow.length > 0 ? `Evaluation Details for ${dataToShow[0].groupName}` : 'My Evaluation Duties'}
          </h1>
          <p className="text-gray-500">
            {groupId ? `Defense details for Semester ${academicYear.semester}` : `All evaluation duties for Semester ${academicYear.semester}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dataToShow.length}</p>
              <p className="text-sm text-gray-500">Assigned Groups</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={dataToShow}
          searchable={!groupId}
          pageSize={10}
          onRowClick={(row) => !groupId && navigate(`/advisor/AdvisorEvaluations/${row.groupId}`)}
          rowClassName={!groupId ? "cursor-pointer hover:bg-gray-50" : ""}
          emptyMessage={groupId ? "Group not found." : "You have no evaluation duties assigned."}
        />
      </div>
    </div>
  );
};

export default AdvisorEvaluations;