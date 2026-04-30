import React, { useMemo } from 'react';
import { Calendar, Clock, MapPin, Users, BookOpen, Award, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, defenseService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const EvaluationSchedule = () => {
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();

  // Fetch groups where user is evaluator
  const {
    data: groupsData,
    loading: groupsLoading
  } = useFetch(() => groupService.getGroupsForEvaluator(user.id));

  // Fetch defense schedules
  const {
    data: defenseData,
    loading: defenseLoading
  } = useFetch(() => defenseService.getDefenseSchedules());

  // Fetch sections
  const { data: sectionsData, loading: sectionsLoading } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  // Filter schedules by current academic year and semester (semester-aware)
  const schedules = useMemo(() => {
    const allSchedules = defenseData?.schedules || [];
    const currentSemester = academicYear?.semester;
    const currentAcademicYearId = academicYear?.id;

    // If no academic year context, return all schedules
    if (!currentAcademicYearId && !currentSemester) {
      return allSchedules;
    }

    return allSchedules.filter(schedule => {
      // Match by academic year ID
      if (currentAcademicYearId && schedule.academicYearId) {
        if (schedule.academicYearId !== currentAcademicYearId) return false;
      }

      // Match by semester (compare as strings)
      if (currentSemester && schedule.semester) {
        const scheduleSemester = String(schedule.semester);
        const currentSemesterStr = String(currentSemester);
        if (scheduleSemester !== currentSemesterStr) return false;
      }

      return true;
    });
  }, [defenseData?.schedules, academicYear?.id, academicYear?.semester]);

  if (groupsLoading || defenseLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading schedule..." />;
  }

  const groups = groupsData?.groups || [];

  // Merge group info with schedule info
  const evaluationDuties = groups
    .map(group => {
      const schedule = schedules.find(s => s.groupId === group.id);
      if (!schedule) return null;

      return {
        groupId: group.id,
        groupName: formatGroupDisplayName(group, sectionNameMap),
        projectTitle: group.approvedTitle
          ? (typeof group.approvedTitle === 'string'
            ? JSON.parse(group.approvedTitle).title
            : group.approvedTitle)
          : 'N/A',
        department: group.department,
        members: group.Members || [],
        evaluators: group.Evaluators || [],
        date: formatDate(schedule.date),
        dateRaw: schedule.date,
        time: schedule.time,
        venue: schedule.venue,
        semester: schedule.semester || 1
      };
    })
    .filter(Boolean);

  // Calculate upcoming defenses (future dates only)
  const upcomingDefenses = evaluationDuties.filter(d => new Date(d.dateRaw) > new Date());

  // Get unique venues for current semester
  const uniqueVenues = [...new Set(evaluationDuties.map(d => d.venue))].length;

  const totalStudents = evaluationDuties.reduce((acc, d) => acc + d.members.length, 0);

  return (
    <PageContainer
      title=""
      subtitle=""
    >
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <p className="text-4xl font-bold">{evaluationDuties.length}</p>
                <p className="text-blue-100 text-sm font-medium">Scheduled Defenses</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-4xl font-bold">{upcomingDefenses.length}</p>
                <p className="text-emerald-100 text-sm font-medium">Upcoming</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <MapPin className="w-7 h-7" />
              </div>
              <div>
                <p className="text-4xl font-bold">{uniqueVenues}</p>
                <p className="text-purple-100 text-sm font-medium">Venues</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-4xl font-bold">{totalStudents}</p>
                <p className="text-amber-100 text-sm font-medium">Total Students</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Schedule Cards */}
      {evaluationDuties.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-6">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Scheduled Defenses</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            There are no evaluation schedules for this semester. You'll be notified when a defense is scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {evaluationDuties.map((duty) => {
            const isUpcoming = new Date(duty.dateRaw) > new Date();
            const members = duty.members || [];
            const evaluators = duty.evaluators || [];

            return (
              <div
                key={duty.groupId}
                className={`bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 group ${
                  isUpcoming ? 'border-blue-200' : 'border-gray-100'
                }`}
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                        isUpcoming
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {duty.groupName?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-900">{duty.groupName || 'N/A'}</h3>
                          {isUpcoming && (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {duty.department}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>Section {getMemberSectionName(members[0], sectionNameMap)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-5">
                  {/* Project Title */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Award className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Project Title</p>
                        <p className="text-gray-900 font-semibold leading-relaxed">{duty.projectTitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Defense Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Date */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Date</p>
                          <p className="text-gray-900 font-semibold">{duty.date}</p>
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Clock className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Time</p>
                          <p className="text-gray-900 font-semibold">{formatTime(duty.time)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Venue */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <MapPin className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Venue</p>
                          <p className="text-gray-900 font-semibold">{duty.venue}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Group Members */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-semibold text-gray-900">Group Members ({members.length})</h4>
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                          {duty.department} • Section {getMemberSectionName(members[0], sectionNameMap)}
                        </span>
                      </div>
                      {members.length > 0 ? (
                        <div className="space-y-2">
                          {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                {member.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.studentId}</p>
                              </div>
                              {member.id === duty.groupId && (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                                  Leader
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No members assigned</p>
                      )}
                    </div>

                    {/* Evaluation Committee */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold text-gray-900">Evaluation Committee ({evaluators.length})</h4>
                      </div>
                      {evaluators.length > 0 ? (
                        <div className="space-y-2">
                          {evaluators.map((evaluator) => (
                            <div
                              key={evaluator.id}
                              className={`flex items-center gap-3 rounded-lg p-3 border ${
                                evaluator.id === user.id
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                                evaluator.id === user.id
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {evaluator.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1">
                                <p className={`font-medium ${
                                  evaluator.id === user.id ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {evaluator.name}
                                  {evaluator.id === user.id && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">{evaluator.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No evaluators assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};

export default EvaluationSchedule;