import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { FileText } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';

import { generateGroupInformationPDF, downloadPDF } from '../../utils/pdfGenerator';
const GroupInformation = () => {
  const { user, users } = useAuth();
  const { getGroupsByDepartment } = useProject();
  
  const department = user?.department;
  const groups = getGroupsByDepartment(department);

  const columns = [
    { 
      key: 'name', 
      label: 'Group ID',
      render: (name) => <span className="font-medium text-gray-900">{name}</span>
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
    { 
      key: 'members', 
      label: 'Group Members',
      render: (members) => (
        <div className="flex flex-col gap-1">
          {members.map(id => {
             const member = users.find(u => u.id === id);
             return (
               <span key={id} className="text-sm text-gray-700">
                 {member?.name || 'Unknown'}
               </span>
             );
          })}
        </div>
      )
    },
    { key: 'department', label: 'Department' },
    { 
      key: 'advisorId', 
      label: 'Advisor',
      render: (advisorId) => {
        const advisor = users.find(u => u.id === advisorId);
        return advisor ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
              {advisor.name.charAt(0)}
            </div>
            <span className="text-sm font-medium text-gray-900">{advisor.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Unassigned</span>
        );
      }
    },
    { 
      key: 'approvedTitle', 
      label: 'Project Title',
      render: (title) => {
        const projectTitle = typeof title === 'object' ? title?.title : title;
        return projectTitle ? (
          <span className="text-sm text-gray-900">{projectTitle}</span>
        ) : (<span className="text-sm text-gray-400 italic">N/A</span>);
      }
    },
    { 
      key: 'evaluators', 
      label: 'Evaluators',
      render: (evaluators) => {
        if (evaluators && evaluators.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {evaluators.map((e) => (
                <span key={e.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                  {e.name}
                </span>
              ))}
            </div>
          );
        }
        return <span className="text-sm text-gray-400 italic">Not assigned yet</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Group Information</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              const doc = generateGroupInformationPDF(groups, department, users);
              downloadPDF(doc, `Group_Information_${department}`);
            }} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              Total: {groups.length}
            </span>
          </div>
        </div>
        <p className="text-gray-500 mt-1">{department} Department</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={groups}
          searchable
          pageSize={10}
          emptyMessage="No groups found in this department."
        />
      </div>
    </div>
  );
};

export default GroupInformation;