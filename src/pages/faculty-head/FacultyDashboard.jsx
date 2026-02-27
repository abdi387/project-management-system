// src/pages/faculty-head/FacultyDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  FileText, 
  BarChart3,
  Clock,
  ArrowRight,
  TrendingUp,
  UserX
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import MetricCard from '../../components/dashboard/MetricCard';
import ReportChart from '../../components/reports/ReportChart';
import SemesterStatusBanner from '../../components/common/SemesterStatusBanner';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getFacultyStats, getStatsByDepartment, academicYear, getDefenseSchedules, groups } = useProject();

  const facultyStats = getFacultyStats();
  const allSchedules = getDefenseSchedules();
  const defenseSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);
  // For faculty head, we check termination status directly to allow access to academic year management.
  const isTerminated = academicYear.status === 'terminated';

  // Get stats by department
  const csStats = getStatsByDepartment('Computer Science');
  const itStats = getStatsByDepartment('Information Technology');
  const isStats = getStatsByDepartment('Information Systems');

  const departmentData = [
    { name: 'CS', groups: csStats.totalGroups, approved: csStats.approvedProposals },
    { name: 'IT', groups: itStats.totalGroups, approved: itStats.approvedProposals },
    { name: 'IS', groups: isStats.totalGroups, approved: isStats.approvedProposals }
  ];

  const quickActions = [
    {
      title: 'Defense Scheduling',
      description: `${defenseSchedules.length} scheduled`,
      icon: Calendar,
      path: '/faculty-head/defense',
      color: 'bg-blue-500'
    },
    {
      title: 'Evaluator Assignment',
      description: 'Assign evaluators to groups',
      icon: Users,
      path: '/faculty-head/EvaluatorManager',
      color: 'bg-purple-500'
    },
    {
      title: 'Faculty Reports',
      description: 'View faculty-wide statistics',
      icon: BarChart3,
      path: '/faculty-head/reports',
      color: 'bg-teal-500'
    },
    {
      title: 'Academic Semester',
      description: `Current Semester: ${academicYear.semester}`,
      icon: Clock,
      path: '/faculty-head/academic-year',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <SemesterStatusBanner />

      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h1>
        <p className="text-indigo-100">
          Faculty Head - Faculty of Informatics
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Active Groups"
          value={facultyStats.totalGroups}
          icon={Users}
          color="blue"
        />
        {academicYear.semester === 1 && (
          <MetricCard
            title="Approved Proposals"
            value={facultyStats.approvedProposals}
            icon={FileText}
            color="green"
          />
        )}
        <MetricCard
          title="Completed Projects"
          value={facultyStats.completedProjects}
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Scheduled Defenses"
          value={defenseSchedules.length}
          icon={Calendar}
          color="teal"
        />
        <MetricCard
          title="Inactive Groups"
          value={facultyStats.inactiveGroups}
          icon={UserX}
          color={facultyStats.inactiveGroups > 0 ? 'red' : 'teal'}
        />
      </div>

      {/* Quick Actions & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={() => !(isTerminated && action.path !== '/faculty-head/academic-year') && navigate(action.path)}
                className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-shadow ${
                  (isTerminated && action.path !== '/faculty-head/academic-year') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
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
                  {!(isTerminated && action.path !== '/faculty-head/academic-year') && (
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ReportChart
            type="bar"
            data={departmentData}
            title="Department Overview"
            xKey="name"
            dataKeys={['groups', 'approved']}
            height={250}
          />
        </div>
      </div>

      {/* Department Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Computer Science', stats: csStats },
            { name: 'Information Technology', stats: itStats },
            { name: 'Information Systems', stats: isStats }
          ].map((dept) => (
            <div key={dept.name} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">{dept.name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Active Groups:</span>
                  <span className="font-medium">{dept.stats.totalGroups}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Approved Proposals:</span>
                  <span className="font-medium text-green-600">{dept.stats.approvedProposals}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Inactive Groups:</span>
                  <span className={`font-medium ${dept.stats.inactiveGroups > 0 ? 'text-red-600' : 'text-gray-600'}`}>{dept.stats.inactiveGroups}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">With Advisors:</span>
                  <span className="font-medium">{dept.stats.groupsWithAdvisor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;