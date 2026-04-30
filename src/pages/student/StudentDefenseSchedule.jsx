import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, defenseService } from '../../services';
import useFetch from '../../hooks/useFetch';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatGroupDisplayName } from '../../utils/sectionDisplay';

const StudentDefenseSchedule = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);

  // Fetch group data
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
    refetch: refetchGroup
  } = useFetch(() => groupService.getGroupByStudentId(user.id));
  const group = groupData?.group;
  const groupDisplayName = formatGroupDisplayName(group);

  // Fetch defense schedule when group is available, filtered by academic year and semester
  useEffect(() => {
    const fetchDefenseSchedule = async () => {
      if (group?.id && academicYear?.id) {
        setScheduleLoading(true);
        setScheduleError(false);
        try {
          const response = await defenseService.getDefenseScheduleByGroup(group.id);
          // Set schedule if response has data AND matches current academic year and semester
          if (response?.schedule) {
            const sched = response.schedule;
            // Check if schedule matches current academic year (from group's academicYearId) and semester
            if (sched.academicYearId === academicYear?.id && String(sched.semester) === String(academicYear?.semester)) {
              setSchedule(sched);
            } else {
              console.log('Schedule semester/year mismatch:', {
                scheduleAcademicYearId: sched.academicYearId,
                currentAcademicYearId: academicYear?.id,
                scheduleSemester: sched.semester,
                currentSemester: academicYear?.semester
              });
              setSchedule(null); // Different semester/year, treat as no schedule
            }
          } else {
            setSchedule(null);
          }
        } catch (error) {
          // Check if it's a 404 error (no schedule found)
          const is404 = error.response?.status === 404;

          if (!is404) {
            // Only set error state for non-404 errors
            console.error('Failed to fetch defense schedule:', error);
            setScheduleError(true);
          }
          // For 404, just set schedule to null (no error)
          setSchedule(null);
        } finally {
          setScheduleLoading(false);
          setGroupLoaded(true);
        }
      }
    };

    fetchDefenseSchedule();
  }, [group?.id, academicYear?.id, academicYear?.semester]);

  if (groupLoading) {
    return <LoadingSpinner fullScreen text="Loading group information..." />;
  }

  // Show specific error messages based on what prerequisite is missing
  if (groupError) {
    return (
      <PageContainer title="Defense Schedule">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 text-center shadow-sm max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-5">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-blue-900 mb-3">Group Formation Pending</h2>
          <p className="text-blue-700 max-w-md mx-auto leading-relaxed">
            Your group is still being formed. Please wait for your department head to assign you to a group.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!group) {
    return (
      <PageContainer title="Defense Schedule">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-8 text-center shadow-sm max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-5">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-amber-900 mb-3">No Group Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You need to be assigned to a group to view defense schedules. Please wait for your department head to form groups.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (scheduleLoading) {
    return <LoadingSpinner fullScreen text="Loading defense schedule..." />;
  }

  if (scheduleError) {
    return (
      <PageContainer title="Defense Schedule">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-8 text-center shadow-sm max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-5">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-amber-900 mb-3">Unable to Load Schedule</h2>
          <p className="text-amber-700 max-w-md mx-auto mb-6 leading-relaxed">
            There was a problem loading your defense schedule. This might be because:
          </p>
          <ul className="text-sm text-amber-700 text-left max-w-md mx-auto mb-8 space-y-3">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800 shrink-0">1</span>
              Your final draft hasn't been approved yet
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800 shrink-0">2</span>
              Evaluators haven't been assigned
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800 shrink-0">3</span>
              The defense hasn't been scheduled by faculty
            </li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-bold"
          >
            Refresh Page
          </button>
        </div>
      </PageContainer>
    );
  }

  if (!schedule) {
    return (
      <PageContainer title="Defense Schedule">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100 max-w-lg mx-auto">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -translate-y-32 translate-x-32 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <Calendar className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Not Scheduled Yet</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
              Your defense has not been scheduled for <span className="font-bold">Semester {academicYear?.semester}</span> of <span className="font-bold">{academicYear?.yearName || 'current academic year'}</span>.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-blue-700 text-left">
                  <span className="font-bold">Note:</span> The faculty head will schedule your defense after your final draft is approved.
                </p>
              </div>
            </div>
            
            {group.finalDraftStatus !== 'advisor-approved' && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-sm text-amber-700 text-left">
                    <span className="font-bold">Current Status:</span> <span className="font-bold capitalize">{group.finalDraftStatus?.replace('-', ' ')}</span>
                  </p>
                </div>
                <p className="text-xs text-amber-600 text-left">
                  Your final draft must be approved by your advisor before defense can be scheduled.
                </p>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Defense Schedule"
      subtitle={`Semester ${academicYear?.semester} - ${academicYear?.yearName || 'Current Academic Year'}`}
    >
      {/* Scheduled Defense Banner */}
      {schedule.date && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 rounded-2xl p-6 text-white shadow-2xl mb-6 max-w-4xl mx-auto">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl translate-y-32 -translate-x-32"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-violet-200 text-sm font-medium mb-1">Your defense is scheduled for</p>
                  <p className="text-3xl font-bold">
                    {formatDate(schedule.date)} at {formatTime(schedule.time)}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20 shadow-lg">
                <p className="text-sm text-violet-200 font-medium">Venue</p>
                <p className="text-xl font-bold">{schedule.venue}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Defense Details Card */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 max-w-4xl mx-auto">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {schedule.projectTitle || 'Project Defense'}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Group: {formatGroupDisplayName({ name: schedule.groupName || groupDisplayName, Members: group?.Members })}
              </p>
            </div>
          </div>
        </div>

        {/* Schedule Details Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Date</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatDate(schedule.date)}</p>
          </div>

          {/* Time */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2 text-purple-600 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Time</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatTime(schedule.time)}</p>
          </div>

          {/* Venue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2 text-amber-600 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Venue</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{schedule.venue}</p>
          </div>
        </div>

        {/* Evaluation Panel */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 text-gray-500 text-sm font-bold uppercase tracking-wider mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            Evaluation Panel
          </div>

          {schedule.evaluators && schedule.evaluators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedule.evaluators.map((evaluator, index) => (
                <div key={index} className="relative overflow-hidden flex items-center gap-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {evaluator.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -top-1 -right-1 p-1 bg-emerald-400 rounded-full shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{evaluator.name}</p>
                    {evaluator.department && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{evaluator.department}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 text-center border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <Users className="w-7 h-7 text-gray-500" />
              </div>
              <p className="text-gray-600 font-medium">Evaluators will be assigned soon</p>
            </div>
          )}
        </div>

        {/* Preparation Tips */}
        <div className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-slate-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Info className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Preparation Tips</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
              Prepare a 15-20 minute presentation of your project
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
              Have your project demo ready
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
              Arrive 15 minutes before your scheduled time
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
              Bring any necessary equipments
            </li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
};

export default StudentDefenseSchedule;
