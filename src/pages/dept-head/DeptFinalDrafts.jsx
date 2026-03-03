// src/pages/dept-head/DeptFinalDrafts.jsx

import React from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; 
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';

const DeptFinalDrafts = () => {
  const { user, users } = useAuth();
  const { finalDrafts, groups, academicYear } = useProject();

  const department = user?.department;

  // Filter drafts:
  // 1. Must belong to a group in the user's department
  // 2. Must be approved by advisor (advisorStatus === 'approved')
  // 3. Must be for the current semester
  const drafts = finalDrafts.filter(draft => {
    const group = groups.find(g => g.id === draft.groupId);
    return group && 
           group.department === department && 
           draft.advisorStatus === 'approved' &&
           (draft.semester || 1) === academicYear.semester;
  });

  const columns = [
    {
      key: 'groupName',
      label: 'Group',
      render: (_, draft) => {
        const group = groups.find(g => g.id === draft.groupId);
        return <span className="font-medium text-gray-900">{group?.name || 'Unknown'}</span>;
      }
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, draft) => {
        const group = groups.find(g => g.id === draft.groupId);
        if (!group || !group.members || group.members.length === 0) return 'N/A';
        const firstMember = users.find(u => u.id === group.members[0]);
        return firstMember?.section || 'N/A';
      }
    },
    {
      key: 'title',
      label: 'Project Title',
      render: (title) => <span className="text-sm font-medium text-gray-800">{title}</span>
    },
    {
      key: 'advisor',
      label: 'Advisor',
      render: (_, draft) => {
        const group = groups.find(g => g.id === draft.groupId);
        const advisor = users.find(u => u.id === group?.advisorId);
        return <span className="text-sm text-gray-600">{advisor?.name || 'Unknown'}</span>;
      }
    },
    {
      key: 'fileUrl',
      label: 'Draft Document',
      render: (url) => (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <FileText className="w-4 h-4" />
          View PDF
        </a>
      )
    },
    {
      key: 'deptStatus',
      label: 'Status',
      render: () => <StatusBadge status="approved" />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Final Draft Approvals</h1>
          <p className="text-gray-500">Viewing final drafts that have been approved by advisors.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={drafts}
          searchable
          pageSize={10}
          emptyMessage="No final drafts have been escalated by advisors yet."
        />
      </div>
    </div>
  );
};

export default DeptFinalDrafts;