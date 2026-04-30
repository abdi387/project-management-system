import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService, defenseService, notificationService, sectionService } from '../../services';
import api from '../../services/apiConfig';
import useFetch from '../../hooks/useFetch';
import toast from 'react-hot-toast';
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { buildSectionNameMap, formatGroupDisplayName, resolveSectionName } from '../../utils/sectionDisplay';

const sanitizeString = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]*>/g, '').trim();
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly, academicYear, isFeatureAvailable } = useProtectedRoute();

  const isTerminated = academicYear?.status === 'terminated';

  // Fetch group data
  const {
    data: groupData,
    loading: groupLoading,
  } = useFetch(() => groupService.getGroupByStudentId(user?.id), [user?.id]);
  const group = groupData?.group;

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(user?.department, true),
    [user?.department],
    !!user?.department
  );

  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );
  const studentSectionName = useMemo(
    () => (user?.section ? resolveSectionName(user.section, sectionNameMap) : 'N/A'),
    [user?.section, sectionNameMap]
  );
  const groupDisplayName = useMemo(
    () => (group ? formatGroupDisplayName(group, sectionNameMap) : null),
    [group, sectionNameMap]
  );

  // Fetch notifications
  const {
    data: notificationsData,
    loading: notificationsLoading
  } = useFetch(() => notificationService.getUserNotifications(false, 5));
  const notifications = notificationsData?.notifications || [];

  // Fetch proposal if group exists (available in both semesters)
  const {
    data: proposalData,
    loading: proposalLoading,
  } = useFetch(() => group ? proposalService.getProposalByGroupId(group.id) : null, [group?.id]);
  const proposal = proposalData?.proposal;

  // Fetch defense schedule if group exists (filtered by current academic year and semester)
  const {
    data: defenseData,
    loading: defenseLoading
  } = useFetch(() => group ? defenseService.getDefenseScheduleByGroup(group.id) : null, [group?.id]);
  // Only use defense schedule if it matches current academic year and semester
  const defenseSchedule = defenseData?.schedule &&
                          defenseData.schedule.academicYearId === academicYear?.id &&
                          String(defenseData.schedule.semester) === String(academicYear?.semester)
    ? defenseData.schedule
    : null;

  // Fetch final draft for current semester
  const {
    data: finalDraftData,
    loading: finalDraftLoading
  } = useFetch(() => group ?
    api.get(`/final-drafts/group/${group.id}`).then(res => {
      const drafts = res.data.drafts || [];
      // Filter drafts by current academic year and semester
      return drafts.find(d =>
        d.academicYearId === academicYear?.id &&
        String(d.semester) === String(academicYear?.semester)
      );
    }) : null, [group?.id, academicYear?.id, academicYear?.semester]);
  const currentSemesterFinalDraft = finalDraftData || null;

  // Calculate Project Stage (semester-aware)
  const currentSemester = academicYear?.semester || '1';
  let stageName = 'Group Formation';
  let stagePercentage = 20;

  if (group) {
    // In Semester 2, start from Progress Reporting stage
    if (currentSemester === '2') {
      // Default starting point for Semester 2
      stageName = 'Progress Reporting';
      stagePercentage = 60;

      // Only advance if final draft is actually submitted in THIS semester
      if (currentSemesterFinalDraft?.advisorStatus === 'pending') {
        stageName = 'Final Draft Review';
        stagePercentage = 80;
      } else if (currentSemesterFinalDraft?.advisorStatus === 'approved') {
        stageName = 'Final Draft Approved';
        stagePercentage = 90;
      }

      if (defenseSchedule) {
        stageName = 'Defense Scheduled';
        stagePercentage = 100;
      }
    } else {
      // Semester 1 progression
      stageName = 'Proposal Submission';
      stagePercentage = 40;

      if (proposal?.status === 'approved') {
        stageName = 'Progress Reporting';
        stagePercentage = 60;

        // For semester 1, also check semester-specific final draft
        if (currentSemesterFinalDraft?.advisorStatus === 'pending') {
          stageName = 'Final Draft Review';
          stagePercentage = 80;
        } else if (currentSemesterFinalDraft?.advisorStatus === 'approved') {
          stageName = 'Final Draft Approved';
          stagePercentage = 90;
        }

        if (defenseSchedule) {
          stageName = 'Defense Scheduled';
          stagePercentage = 100;
        }
      } else if (proposal?.status === 'rejected') {
        stageName = 'Proposal Rejected - Resubmit';
        stagePercentage = 30;
      }
    }
  }

  const activities = (notifications || []).map(n => ({
    id: n.id,
    type: n.type?.includes('approved') ? 'approval' :
          n.type?.includes('rejected') ? 'alert' :
          n.type?.includes('feedback') ? 'feedback' : 'info',
    title: n.title,
    description: n.message,
    timestamp: n.createdAt
  }));

  const ACTIVITY_STORAGE_KEY = 'StudentDashboard_removedActivityIds';
  const [removedActivityIds, setRemovedActivityIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ACTIVITY_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(removedActivityIds));
  }, [removedActivityIds]);

  // Memoized raw activities from fetched data
  const rawActivities = useMemo(() => {
    return (notifications || []).map(n => ({
      id: n.id,
      type: n.type?.includes('approved') ? 'approval' :
            n.type?.includes('rejected') ? 'alert' :
            n.type?.includes('feedback') ? 'feedback' : 'info',
      title: sanitizeString(n.title),
      description: sanitizeString(n.message),
      timestamp: n.createdAt,
      link: n.link || '/student/dashboard'
    }));
  }, [notifications]);

  const displayedActivities = useMemo(
    () => rawActivities.filter(activity => !removedActivityIds.includes(activity.id)),
    [rawActivities, removedActivityIds]
  );

  const handleRemoveActivity = useCallback((id) => {
    setRemovedActivityIds(prev => prev.includes(id) ? prev : [...prev, id]);
    toast.success('Activity removed from list.');
  }, []);

  const quickActions = [
    {
      title: 'My Group',
      description: group ? groupDisplayName : 'Not assigned',
      icon: Users,
      path: '/student/group',
      color: 'bg-blue-500',
      status: group ? 'success' : 'warning',
      show: true, // Always show
      disabled: false
    },
    // Show Proposal in both semesters (hide when terminated)
    {
      title: 'Proposal',
      description: proposal ? proposal.status : (group ? 'Pending' : 'Submit now'),
      icon: FileText,
      path: '/student/proposal',
      color: 'bg-purple-500',
      status: proposal?.status === 'approved' ? 'success' :
              proposal?.status === 'rejected' ? 'danger' :
              'warning',
      show: !isTerminated, // Hide when terminated
      disabled: false
    },
    {
      title: 'Progress Reports',
      description: !group ? 'No group assigned' :
                   proposal?.status !== 'approved' ? 'Proposal not approved' :
                   !group?.advisorId ? 'No advisor assigned' :
                   'Track and submit your progress',
      icon: BarChart3,
      path: '/student/progress',
      color: 'bg-teal-500',
      status: !group ? 'disabled' :
              proposal?.status !== 'approved' ? 'disabled' :
              !group?.advisorId ? 'disabled' :
              'info',
      disabled: !group || proposal?.status !== 'approved' || !group?.advisorId,
      show: !isTerminated // Hide when terminated
    },
    {
      title: 'Final Draft',
      description: !group ? 'No group assigned' :
                   proposal?.status !== 'approved' ? 'Proposal not approved' :
                   currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'Approved' :
                   currentSemesterFinalDraft?.advisorStatus === 'pending' ? 'Under Review' :
                   currentSemesterFinalDraft?.advisorStatus === 'rejected' ? 'Rejected - Resubmit' :
                   'Submit your final draft',
      icon: CheckCircle,
      path: '/student/final-draft',
      color: 'bg-green-500',
      status: !group ? 'disabled' :
              proposal?.status !== 'approved' ? 'disabled' :
              currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'success' :
              currentSemesterFinalDraft?.advisorStatus === 'pending' ? 'warning' :
              currentSemesterFinalDraft?.advisorStatus === 'rejected' ? 'danger' :
              'info',
      disabled: !group || proposal?.status !== 'approved',
      show: !isTerminated // Hide when terminated
    },
    // Defense Schedule - Visible in both semesters (hide when terminated)
    {
      title: 'Defense Schedule',
      description: !group ? 'No group assigned' :
                   proposal?.status !== 'approved' ? 'Proposal not approved' :
                   defenseSchedule ? `Scheduled for ${new Date(defenseSchedule.date).toLocaleDateString()}` :
                   currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'Final draft approved - awaiting scheduling' :
                   currentSemesterFinalDraft?.advisorStatus === 'pending' ? 'Final draft under review' :
                   'Submit and get final draft approved',
      icon: Calendar,
      path: '/student/defense-schedule',
      color: 'bg-indigo-500',
      status: !group ? 'disabled' :
              proposal?.status !== 'approved' ? 'disabled' :
              defenseSchedule ? 'success' :
              currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'info' :
              currentSemesterFinalDraft?.advisorStatus === 'pending' ? 'warning' :
              'info',
      show: !isTerminated // Hide when terminated
    }
  ].filter(action => action.show);

  if (groupLoading || notificationsLoading || proposalLoading || defenseLoading || finalDraftLoading) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  return (
    <PageContainer>
      {/* Welcome Banner With Progress */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 rounded-2xl p-8 text-white shadow-2xl mb-8" style={{ fontFamily: 'Times New Roman, serif' }}>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl translate-y-32 -translate-x-32"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>Welcome Back, {user?.name}!</h1>
              <div className="flex flex-wrap items-center gap-3 text-violet-200 text-sm">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  {group ? `Member of ${groupDisplayName}` : 'Student Dashboard'}
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  {user?.department}
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  Section {studentSectionName}
                </span>
              </div>
            </div>
            {group && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20 shadow-lg">
                <p className="text-xs font-medium text-violet-200 uppercase tracking-wider mb-1">Current Stage</p>
                <p className="text-xl font-bold">{stageName}</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {group && (
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-3 text-violet-200 font-medium tracking-wide">
                <span>Group</span>
                <span>Proposal</span>
                <span>Progress</span>
                <span>Draft</span>
                <span>Defense</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-white to-violet-100 rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ width: `${stagePercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Group Status"
          value={group ? 'Assigned' : 'Pending'}
          icon={Users}
          color={group ? 'green' : 'yellow'}
          onClick={() => !isReadOnly && navigate('/student/group')}
        />
        {!isTerminated && (
          <MetricCard
            title="Proposal"
            value={proposal ? (proposal.status === 'approved' ? 'Approved' :
                   proposal.status === 'rejected' ? 'Rejected' : 'Pending') :
                   group ? 'Not Submitted' : 'No Group'}
            icon={FileText}
            color={proposal?.status === 'approved' ? 'green' :
                   proposal?.status === 'rejected' ? 'red' :
                   group ? 'yellow' : 'blue'}
            onClick={() => !isReadOnly && navigate('/student/proposal')}
          />
        )}
        {!isTerminated && (
          <MetricCard
            title="Final Draft"
            value={!group ? 'No Group' :
                   proposal?.status !== 'approved' ? 'Need Approval' :
                   currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'Approved' :
                   currentSemesterFinalDraft?.advisorStatus === 'pending' ? 'Submitted' :
                   currentSemesterFinalDraft?.advisorStatus === 'rejected' ? 'Rejected' :
                   'Not Submitted'}
            icon={CheckCircle}
            color={!group ? 'gray' :
                   proposal?.status !== 'approved' ? 'gray' :
                   currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'green' :
                   currentSemesterFinalDraft?.advisorStatus === 'pending' ? 'yellow' :
                   currentSemesterFinalDraft?.advisorStatus === 'rejected' ? 'red' :
                   'blue'}
            onClick={() => !isReadOnly && navigate('/student/final-draft')}
          />
        )}
        {!isTerminated && (
          <MetricCard
            title="Defense"
            value={!group ? 'No Group' :
                   proposal?.status !== 'approved' ? 'Need Proposal' :
                   defenseSchedule ? 'Scheduled' :
                   currentSemesterFinalDraft?.advisorStatus === 'approved' ? 'Ready' :
                   'Not Ready'}
            icon={Calendar}
            color={!group ? 'gray' :
                   proposal?.status !== 'approved' ? 'gray' :
                   defenseSchedule ? 'teal' :
                   'gray'}
            onClick={() => !isReadOnly && navigate('/student/defense-schedule')}
          />
        )}
      </div>

      {/* Alerts */}
      {!group && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 flex items-center gap-4 mb-6 shadow-sm">
          <div className="p-3 bg-amber-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-base">
              You are not assigned to a group yet.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Please wait for your department head to form groups.
            </p>
          </div>
        </div>
      )}

      {group && !proposal && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4 mb-6 shadow-sm">
          <div className="p-3 bg-blue-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900 text-base">
              No proposal submitted yet.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Please submit your project proposal to continue.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={isReadOnly}
            onClick={() => navigate('/student/proposal')}
          >
            Submit Now
          </Button>
        </div>
      )}

      {proposal?.status === 'rejected' && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-5 flex items-center gap-4 mb-6 shadow-sm">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-900 text-base">
              Your project proposal was rejected.
            </p>
            <p className="text-sm text-red-700 mt-1">
              Feedback: {proposal.feedback || 'Please review and resubmit with new titles.'}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            disabled={isReadOnly}
            onClick={() => navigate('/student/proposal')}
          >
            Resubmit
          </Button>
        </div>
      )}

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-5 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {quickActions.map((action, index) => {
              const isDisabled = isReadOnly || action.status === 'disabled';
              return (
                <div
                  key={index}
                  onClick={() => !isDisabled && navigate(action.path)}
                  className={`relative overflow-hidden bg-white rounded-xl p-6 shadow-sm border transition-all duration-300 group ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed border-gray-200'
                      : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 border-gray-100 hover:border-violet-200'
                  }`}
                  style={{ fontFamily: 'Times New Roman, serif' }}
                >
                  {/* Subtle hover gradient */}
                  {!isDisabled && (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-indigo-50/0 group-hover:from-violet-50 group-hover:to-indigo-50 transition-all duration-300"></div>
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4">
                      <div className={`${action.color} p-3 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base tracking-wide">{action.title}</h3>
                        <p className="text-sm text-gray-600 mt-2 capitalize leading-relaxed">{action.description}</p>
                      </div>
                      {!isDisabled && (
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 group-hover:translate-x-2 transition-all duration-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 h-full">
          <ActivityTimeline
            activities={displayedActivities}
            onActivityClick={(activity) => activity.link && navigate(activity.link)}
            onRemoveActivity={handleRemoveActivity}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default StudentDashboard;
