// src/pages/advisor/AdvisorDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  Clock,
  Store,
  ArrowRight,
  AlertCircle,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Button from '../../components/common/Button';
import SemesterStatusBanner from '../../components/common/SemesterStatusBanner';

const AdvisorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getGroupsByAdvisor, getProgressReportsByAdvisor, getAvailableProjects, getGroupsForEvaluator, isReadOnly, academicYear } = useProject();
  const { getUserNotifications } = useNotification();

  const isSemester1 = academicYear?.semester === 1;

  const myGroups = getGroupsByAdvisor(user?.id);
  const progressReports = getProgressReportsByAdvisor(user?.id);
  const availableProjects = getAvailableProjects();
  const notifications = getUserNotifications(user?.id);
  const evaluationGroups = user ? getGroupsForEvaluator(user.id) : [];

  const pendingReports = progressReports.filter(r => r.status === 'pending');
  const pendingDrafts = myGroups.filter(g => g.finalDraftStatus === 'submitted');

  const activities = notifications.slice(0, 5).map(n => ({
    id: n.id,
    type: n.type.includes('approved') ? 'approval' : 
          n.type.includes('feedback') ? 'feedback' : 
          n.type.includes('submission') ? 'submission' : 'document',
    title: n.title,
    description: n.message,
    timestamp: n.createdAt
  }));

  const quickActions = [
    isSemester1 ? {
      title: 'Project Marketplace',
      description: `${availableProjects.length} projects available`,
      icon: Store,
      path: '/advisor/marketplace',
      color: 'bg-purple-500'
    } : null,
    {
      title: 'My Groups',
      description: `${myGroups.length} groups assigned`,
      icon: Users,
      path: '/advisor/groups',
      color: 'bg-blue-500'
    },
    {
      title: 'Progress Review',
      description: `${pendingReports.length} pending reviews`,
      icon: MessageSquare,
      path: '/advisor/progress-review',
      color: 'bg-teal-500'
    },
    {
      title: 'Final Approvals',
      description: `${pendingDrafts.length} drafts to approve`,
      icon: CheckCircle,
      path: '/advisor/final-approval',
      color: 'bg-green-500'
    },
    {
      title: 'Evaluations',
      description: `${evaluationGroups.length} groups to evaluate`,
      icon: Shield,
      path: '/advisor/AdvisorEvaluations',
      color: 'bg-indigo-500'
    }
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <SemesterStatusBanner />
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h1>
        <p className="text-purple-100">
          Manage your mentored groups and guide students through their final year projects.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <MetricCard
          title="My Groups"
          value={myGroups.length}
          icon={Users}
          color="blue"
          onClick={() => navigate('/advisor/groups')}
        />
        {isSemester1 && (
          <MetricCard
            title="Available Projects"
            value={availableProjects.length}
            icon={Store}
            color="purple"
            onClick={() => navigate('/advisor/marketplace')}
          />
        )}
        <MetricCard
          title="Pending Reviews"
          value={pendingReports.length}
          icon={Clock}
          color="yellow"
          onClick={() => navigate('/advisor/progress-review')}
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingDrafts.length}
          icon={CheckCircle}
          color="green"
          onClick={() => navigate('/advisor/final-approval')}
        />
        <MetricCard
          title="Evaluations"
          value={evaluationGroups.length}
          icon={Shield}
          color="indigo"
          onClick={() => navigate('/advisor/AdvisorEvaluations')}
        />
      </div>

      {/* Alerts */}
      {pendingReports.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">
              You have {pendingReports.length} progress report(s) awaiting review
            </p>
          </div>
          <Button 
            variant="warning" 
            size="sm"
            disabled={isReadOnly}
            onClick={() => navigate('/advisor/progress-review')}
          >
            Review Now
          </Button>
        </div>
      )}

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={() => !isReadOnly && navigate(action.path)}
                className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-shadow ${
                  isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
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

        <div>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;