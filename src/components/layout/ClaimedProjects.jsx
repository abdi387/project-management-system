import React from 'react';
import { UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';

const ClaimedProjects = () => {
  const { user, users } = useAuth();
  const { getGroupsByDepartment } = useProject();
  
  const department = user?.department;
  // Filter groups that have an advisor assigned
  const claimedGroups = getGroupsByDepartment(department).filter(g => g.advisorId);

  const columns = [
    { 
      key: 'name', 
      label: 'Group',
      render: (name) => <span className="font-medium text-gray-900">{name}</span>
    },
    { 
      key: 'approvedTitle', 
      label: 'Project Title',
      render: (title) => title ? (
        <span className="text-sm text-gray-900 font-medium">{title}</span>
      ) : (
        <span className="text-sm text-gray-400 italic">N/A</span>
      )
    },
    { 
      key: 'advisorId', 
      label: 'Advisor',
      render: (advisorId) => {
        const advisor = users.find(u => u.id === advisorId);
        return advisor ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
              {advisor.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{advisor.name}</div>
              <div className="text-xs text-gray-500">{advisor.email}</div>
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Unknown</span>
        );
      }
    },
    { 
      key: 'members', 
      label: 'Members',
      render: (members) => (
        <div className="flex flex-col gap-1">
          {members.map(id => {
             const member = users.find(u => u.id === id);
             return (
               <span key={id} className="text-xs text-gray-600">
                 {member?.name || 'Unknown'}
               </span>
             );
          })}
        </div>
      )
    },
    {
      key: 'progressStatus',
      label: 'Progress',
      render: (status) => <StatusBadge status={status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claimed Projects</h1>
          <p className="text-gray-500">{department} Department</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Total Claimed: {claimedGroups.length}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={claimedGroups}
          searchable
          pageSize={10}
          emptyMessage="No projects have been claimed by advisors yet."
        />
      </div>
    </div>
  );
};

export default ClaimedProjects;