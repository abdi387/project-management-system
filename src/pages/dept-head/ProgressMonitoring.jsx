// src/pages/dept-head/ProgressMonitoring.jsx
import React from 'react';
import { Clock, CheckCircle, TrendingUp, Users, FileCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import MetricCard from '../../components/dashboard/MetricCard';
import { formatDate } from '../../utils/dateUtils';

const ProgressMonitoring = () => {
  const { user, users } = useAuth();
  const { getGroupsByDepartment, progressReports, finalDrafts, academicYear } = useProject();

  const department = user?.department;
  const groups = getGroupsByDepartment(department);
  const groupIds = groups.map(g => g.id);

  // Filter reports and drafts by current semester
  const deptReports = progressReports.filter(r => 
    groupIds.includes(r.groupId) && (r.semester || 1) === academicYear.semester
  );

  const deptDrafts = finalDrafts.filter(d => 
    groupIds.includes(d.groupId) && (d.semester || 1) === academicYear.semester
  );

  const totalReports = deptReports.length;
  const completedProjects = groups.filter(g => g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved').length;
  const draftsSubmitted = deptDrafts.length;

  const draftColumns = [
    {
      key: 'groupId',
      label: 'Group',
      render: (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return 'Unknown';
        const firstMember = users.find(u => u.id === group.members?.[0]);
        const section = firstMember?.section;
        return (
          <div>
            <span className="font-medium">{group.name}</span>
            {section && <div className="text-xs text-gray-500">Section {section}</div>}
          </div>
        );
      }
    },
    { key: 'title', label: 'Project Title' },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (value) => formatDate(value)
    },
    {
      key: 'advisorStatus',
      label: 'Advisor Approval',
      render: (status) => <StatusBadge status={status} size="sm" />
    }
  ];

  const groupProgressColumns = [
    { 
      key: 'name', 
      label: 'Group',
      render: (name, row) => {
        const firstMember = users.find(u => u.id === row.members?.[0]);
        const section = firstMember?.section;
        return (
          <div>
            <span className="font-medium">{name}</span>
            {section && <div className="text-xs text-gray-500">Section {section}</div>}
          </div>
        )
      }
    },
    { key: 'approvedTitle', label: 'Project', render: (title) => (typeof title === 'object' ? title?.title : title) || 'N/A' },
    {
      key: 'id',
      label: 'Reports',
      render: (groupId) => {
        const count = deptReports.filter(r => r.groupId === groupId).length;
        return count;
      }
    },
    {
      key: 'progressStatus',
      label: 'Status',
      render: (status) => <StatusBadge status={status} />
    },
    {
      key: 'advisorId',
      label: 'Advisor',
      render: (advisorId) => {
        const advisor = users.find(u => u.id === advisorId);
        return advisor?.name || 'Not Assigned';
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Progress Monitoring</h1>
        <p className="text-gray-500">{department} Department</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Reports"
          value={totalReports}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Drafts Submitted"
          value={draftsSubmitted}
          icon={FileCheck}
          color="purple"
        />
        <MetricCard
          title="Projects Completed"
          value={completedProjects}
          icon={CheckCircle}
          color="teal"
        />
      </div>

      {/* Final Drafts Status */}
      {deptDrafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Final Draft Submissions
            </h2>
          </div>
          <DataTable
            columns={draftColumns}
            data={deptDrafts}
            searchable={false}
            pageSize={5}
          />
        </div>
      )}

      {/* Group Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Group Progress Overview
          </h2>
        </div>
        <DataTable
          columns={groupProgressColumns}
          data={groups}
          searchable
          pageSize={10}
        />
      </div>

      {/* All Reports */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Progress Reports ({deptReports.length})
        </h2>
        <DataTable
          columns={[
            {
              key: 'groupId',
              label: 'Group',
              render: (groupId) => {
                const group = groups.find(g => g.id === groupId);
                if (!group) return 'Unknown';
                const firstMember = users.find(u => u.id === group.members?.[0]);
                const section = firstMember?.section;
                return (
                  <div>
                    <span className="font-medium">{group.name}</span>
                    {section && <div className="text-xs text-gray-500">Section {section}</div>}
                  </div>
                );
              }
            },
            { key: 'title', label: 'Report Title' },
            {
              key: 'submittedAt',
              label: 'Submitted',
              render: (value) => formatDate(value)
            },
            {
              key: 'status',
              label: 'Status',
              render: (status, row) => (
                <StatusBadge status={row.isOverdue ? 'overdue' : status} />
              )
            },
            {
              key: 'feedback',
              label: 'Feedback',
              render: (feedback) => feedback ? 'Yes' : 'No'
            }
          ]}
          data={deptReports}
          searchable
          pageSize={10}
        />
      </div>
    </div>
  );
};

export default ProgressMonitoring;