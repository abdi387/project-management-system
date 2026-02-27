// src/pages/student/StudentDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  BarChart3,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Button from '../../components/common/Button';
import SemesterStatusBanner from '../../components/common/SemesterStatusBanner';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getGroupByStudentId, getProposalByGroupId, getDefenseSchedules, isReadOnly, academicYear } = useProject();
  const { getUserNotifications } = useNotification();

  const group = getGroupByStudentId(user?.id);
  const proposal = group ? getProposalByGroupId(group.id) : null;
  const defenseSchedule = group ? getDefenseSchedules().find(s => s.groupId === group.id && (s.semester || 1) === academicYear.semester) : null;
  const notifications = getUserNotifications(user?.id);

  // Calculate Project Stage
  let currentStage = 1;
  let stageName = 'Group Formation';
  
  if (group) {
    currentStage = 2;
    stageName = 'Proposal Submission';
    if (proposal?.status === 'approved') {
      currentStage = 3;
      stageName = 'Progress Reporting';
      if (defenseSchedule) {
        currentStage = 5;
        stageName = 'Defense Scheduled';
      } else if (group.finalDraftStatus === 'fully-approved') {
        currentStage = 5;
        stageName = 'Defense';
      } else if (group.finalDraftStatus !== 'not-submitted') {
        currentStage = 4;
        stageName = 'Final Draft';
      }
    }
  }

  const activities = notifications.slice(0, 5).map(n => ({
    id: n.id,
    type: n.type.includes('approved') ? 'approval' : 
          n.type.includes('rejected') ? 'alert' : 'info',
    title: n.title,
    description: n.message,
    timestamp: n.createdAt
  }));

  const quickActions = [
    {
      title: 'My Group',
      description: group ? group.name : 'Not assigned',
      icon: Users,
      path: '/student/group',
      color: 'bg-blue-500'
    },
    {
      title: 'Proposal',
      description: proposal ? proposal.status : 'Submit now',
      icon: FileText,
      path: '/student/proposal',
      color: 'bg-purple-500'
    },
    {
      title: 'Progress Reports',
      description: 'Track your work',
      icon: BarChart3,
      path: '/student/progress',
      color: 'bg-teal-500'
    },
    {
      title: 'Final Draft',
      description: 'Submit final project',
      icon: CheckCircle,
      path: '/student/final-draft',
      color: 'bg-green-500'
    }
  ];

  return (
    <div className="space-y-6">
      <SemesterStatusBanner />
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-violet-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-violet-100">
          {group ? `Member of ${group.name}` : 'Student Dashboard'} • {user?.department}
        </p>
        
        {/* Progress Stepper */}
        <div className="mt-6 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/20 rounded-full"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white rounded-full transition-all duration-1000"
            style={{ width: `${(currentStage / 5) * 100}%` }}
          ></div>
          
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                step <= currentStage ? 'bg-white text-violet-600' : 'bg-violet-800/50 text-white/50'
              }`}>
                {step}
              </div>
              <span className="text-xs text-white/80 hidden md:block">
                {step === 1 ? 'Group' : 
                 step === 2 ? 'Proposal' : 
                 step === 3 ? 'Progress' : 
                 step === 4 ? 'Draft' : 'Defense'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Group Status"
          value={group ? 'Assigned' : 'Pending'}
          icon={Users}
          color={group ? 'green' : 'yellow'}
          onClick={() => navigate('/student/group')}
        />
        <MetricCard
          title="Proposal"
          value={proposal ? (proposal.status === 'approved' ? 'Approved' : 'Pending') : 'Not Started'}
          icon={FileText}
          color={proposal?.status === 'approved' ? 'green' : 'blue'}
          onClick={() => navigate('/student/proposal')}
        />
        <MetricCard
          title="Advisor"
          value={group?.advisorId ? 'Assigned' : 'Pending'}
          icon={CheckCircle}
          color={group?.advisorId ? 'purple' : 'gray'}
          onClick={() => navigate('/student/group')}
        />
        <MetricCard
          title="Defense"
          value={defenseSchedule ? 'Scheduled' : 'Pending'}
          icon={Calendar}
          color={defenseSchedule ? 'teal' : 'gray'}
          onClick={() => defenseSchedule && navigate('/student/defense-schedule')}
        />
      </div>

      {/* Alerts */}
      {!group && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">
              You are not assigned to a group yet.
            </p>
            <p className="text-sm text-yellow-700">
              Please wait for your department head to form groups.
            </p>
          </div>
        </div>
      )}

      {proposal?.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">
              Your project proposal was rejected.
            </p>
            <p className="text-sm text-red-700">
              Please review the feedback and resubmit.
            </p>
          </div>
          <Button 
            variant="danger" 
            size="sm"
            disabled={isReadOnly}
            onClick={() => navigate('/student/proposal')}
          >
            View Feedback
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
                className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all group ${
                  isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`${action.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                  </div>
                  {!isReadOnly && (
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
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

export default StudentDashboard;
