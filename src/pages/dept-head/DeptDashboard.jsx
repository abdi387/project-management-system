// src/pages/dept-head/DeptDashboard.jsx
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  FileText, 
  BarChart3, 
  Clock,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import MetricCard from '../../components/dashboard/MetricCard';
import ReportChart from '../../components/reports/ReportChart';
import DataTable from '../../components/common/DataTable';
import SemesterStatusBanner from '../../components/common/SemesterStatusBanner';

const DeptDashboard = () => {
  const navigate = useNavigate();
  const groupsRef = useRef(null);
  const { user, getPendingStudents, users, getUsersByDepartment } = useAuth();
  const { getStatsByDepartment, getGroupsByDepartment, getProposalsByDepartment, isReadOnly, academicYear } = useProject();

  const department = user?.department;    
  const stats = getStatsByDepartment(department);
  
  // Semester awareness: Only show pending registrations and proposals in Semester 1
  const isSemester1 = academicYear?.semester === 1;
  
  const pendingStudents = isSemester1 ? getPendingStudents(department) : [];
  const groups = getGroupsByDepartment(department);
  const proposals = getProposalsByDepartment(department);
  
  // Get active students count for this department
  const activeStudentsCount = getUsersByDepartment(department).filter(u => u.role === 'student' && u.status === 'active').length;

  const pendingProposals = isSemester1 ? proposals.filter(p => p.status === 'pending') : [];

  // Chart data
  const statusData = [
    { name: 'Approved', value: stats.approvedProposals },
    { name: 'Pending', value: pendingProposals.length },
    { name: 'With Advisor', value: stats.groupsWithAdvisor },
    { name: 'Completed', value: stats.completedProjects }
  ];

  const scrollToGroups = () => {
    groupsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickActions = [
    {
      title: 'Student Registrations',
      description: `${pendingStudents.length} pending approvals`,
      icon: UserPlus,
      path: '/dept-head/registrations',
      color: 'bg-blue-500',
      urgent: pendingStudents.length > 0
    },
    {
      title: 'Proposal Evaluation',
      description: `${pendingProposals.length} proposals to review`,
      icon: FileText,
      path: '/dept-head/proposals',
      color: 'bg-purple-500',
      urgent: pendingProposals.length > 0
    },
    {
      title: 'Group Formation',
      description: 'Manage student groups',
      icon: Users,
      path: '/dept-head/groups',
      color: 'bg-teal-500'
    },
    {
      title: 'Progress Monitoring',
      description: 'Track reports and final drafts',
      icon: Clock,
      path: '/dept-head/monitoring',
      color: 'bg-yellow-500'
    }
  ].filter(action => {
    if (!isSemester1 && (action.title === 'Student Registrations' || action.title === 'Proposal Evaluation' || action.title === 'Group Formation')) {
      return false;
    }
    return true;
  });

  // Sort groups by number (Group 1, Group 2, etc.)
  const sortedGroups = [...groups].sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0]) || 0;
    const numB = parseInt(b.name.match(/\d+/)?.[0]) || 0;
    return numA - numB;
  });

  const groupColumns = [
    { 
      key: 'name', 
      label: 'Group Info',
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.department}</div>
        </div>
      )
    },
    { 
      key: 'members', 
      label: 'Team Composition',
      render: (members, row) => (
        <div className="space-y-1 min-w-50">
          <div className="text-xs">
            <span className="font-semibold text-gray-700">Leader: </span>
            {users.find(u => u.id === row.leader)?.name || 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold">Members: </span>
            {members
              .filter(mId => mId !== row.leader)
              .map(mId => users.find(u => u.id === mId)?.name)
              .join(', ')}
          </div>
        </div>
      )
    },
    { 
      key: 'approvedTitle', 
      label: 'Project Title',
      render: (title) => {
        const projectTitle = typeof title === 'object' ? title?.title : title;
        return (
          <div className="max-w-xs">
            {projectTitle ? (
              <div className="text-sm text-gray-900 font-medium truncate" title={projectTitle}>
                {projectTitle}
              </div>
            ) : (<span className="text-xs text-gray-400 italic">Unassigned</span>)}
          </div>
        );
      }
    },
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
            <span className="text-sm text-gray-700">{advisor.name}</span>
          </div>
        ) : <span className="text-sm text-gray-400 italic">Unassigned</span>;
      }
    },
    {
      key: 'finalDraftStatus',
      label: 'Status',
      render: (status, row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status === 'fully-approved' ? 'bg-green-100 text-green-800' :
          status === 'advisor-approved' ? 'bg-blue-100 text-blue-800' :
          row.proposalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'fully-approved' ? 'Completed' :
           status === 'advisor-approved' ? 'Advisor Approved' :
           row.proposalStatus === 'pending' ? 'Proposal Pending' :
           'In Progress'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <SemesterStatusBanner />
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-teal-600 to-teal-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h1>
        <p className="text-teal-100">
          Department Head - {department}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={scrollToGroups} className="cursor-pointer transition-transform hover:scale-105">
          <MetricCard
            title="Active Groups"
            value={stats.totalGroups}
            icon={Users}
            color="blue"
          />
        </div>
        {isSemester1 && (
          <MetricCard
            title="Pending Registrations"
            value={pendingStudents.length}
            icon={UserPlus}
            color={pendingStudents.length > 0 ? 'yellow' : 'green'}
            onClick={() => !isReadOnly && navigate('/dept-head/registrations')}
          />
        )}
        {isSemester1 && (
          <MetricCard
            title="Pending Proposals"
            value={pendingProposals.length}
            icon={FileText}
            color={pendingProposals.length > 0 ? 'yellow' : 'green'}
            onClick={() => !isReadOnly && navigate('/dept-head/proposals')}
          />
        )}
        <MetricCard
          title="Active Students"
          value={activeStudentsCount}
            onClick={() => !isReadOnly && navigate('/dept-head/students')}
          icon={Users}
          color="teal"
        />
      </div>

      {/* Alerts */}
      {(pendingStudents.length > 0 || pendingProposals.length > 0) && (
        <div className="space-y-3">
          {pendingStudents.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
              <UserPlus className="w-6 h-6 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  {pendingStudents.length} student(s) awaiting registration approval
                </p>
              </div>
              <button 
                onClick={() => !isReadOnly && navigate('/dept-head/registrations')}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-blue-600"
                disabled={isReadOnly}
              >
                Review →
              </button>
            </div>
          )}
          
          {pendingProposals.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <div className="flex-1">
                <p className="font-medium text-purple-800">
                  {pendingProposals.length} project proposal(s) awaiting evaluation
                </p>
              </div>
              <button 
                onClick={() => !isReadOnly && navigate('/dept-head/proposals')}
                className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-purple-600"
                disabled={isReadOnly}
              >
                Evaluate →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={() => !isReadOnly && navigate(action.path)}
                className={`bg-white rounded-xl p-6 shadow-sm border transition-shadow ${
                  isReadOnly ? 'opacity-60 cursor-not-allowed' : `cursor-pointer hover:shadow-md ${action.urgent ? 'border-yellow-300' : 'border-gray-100'}`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`${action.color} p-3 rounded-lg`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                  </div>
                  {!isReadOnly && (
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <ReportChart
            type="pie"
            data={statusData}
            title="Department Overview"
            height={250}
          />
        </div>
      </div>

      {/* Group Details Container */}
      <div ref={groupsRef} className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Groups</h2>
        <DataTable
          columns={groupColumns}
          data={sortedGroups}
          searchable
          pageSize={10}
          emptyMessage="No groups formed yet."
        />
      </div>
    </div>
  );
};

export default DeptDashboard;