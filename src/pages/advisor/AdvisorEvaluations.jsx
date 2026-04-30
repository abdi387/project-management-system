import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Users, Award, ChevronRight, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const AdvisorEvaluations = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch groups where user is evaluator
  const {
    data: groupsData,
    loading: groupsLoading
  } = useFetch(() => groupService.getGroupsForEvaluator(user.id));

  // Fetch sections to resolve names
  const { data: sectionsData, loading: sectionsLoading } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  const groups = groupsData?.groups || [];

  // If a groupId is provided, filter for that specific duty
  const dataToShow = groupId
    ? groups.filter(g => g.id === groupId)
    : groups;

  if (groupsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading evaluations..." />;
  }

  const totalStudents = groups.filter(g => g.Members).reduce((acc, g) => acc + (g.Members?.length || 0), 0);

  return (
    <PageContainer
      title=""
      subtitle=""
    >
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <p className="text-4xl font-bold">{groups.length}</p>
                <p className="text-indigo-100 text-sm font-medium">Assigned Groups</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-4xl font-bold">{totalStudents}</p>
                <p className="text-emerald-100 text-sm font-medium">Total Students</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Groups Grid */}
      {dataToShow.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-6">
            <Shield className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Evaluation Duties</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            You have no evaluation duties assigned at the moment. You'll be notified when a new evaluation is scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dataToShow.map((group, index) => {
            const members = group.Members || [];
            const evaluators = group.Evaluators || [];
            const approvedTitle = group.approvedTitle
              ? (typeof group.approvedTitle === 'string' ? JSON.parse(group.approvedTitle).title : group.approvedTitle)
              : 'Project title pending';

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {formatGroupDisplayName(group, sectionNameMap)?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{formatGroupDisplayName(group, sectionNameMap)}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {group.department} • Section {getMemberSectionName(group.Members?.[0], sectionNameMap)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-5">
                  {/* Project Title */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Award className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Project Title</p>
                        <p className="text-gray-900 font-semibold leading-relaxed">{approvedTitle}</p>
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
                          {group.department} • Section {getMemberSectionName(group.Members?.[0], sectionNameMap)}
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
                              {member.id === group.leaderId && (
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
                        <Shield className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold text-gray-900">Evaluation Committee ({evaluators.length})</h4>
                      </div>
                      {evaluators.length > 0 ? (
                        <div className="space-y-2">
                          {evaluators.map((evaluator) => (
                            <div
                              key={evaluator.id}
                              className={`flex items-center gap-3 rounded-lg p-3 border ${
                                evaluator.id === user.id
                                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                                evaluator.id === user.id
                                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {evaluator.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1">
                                <p className={`font-medium ${
                                  evaluator.id === user.id ? 'text-indigo-900' : 'text-gray-900'
                                }`}>
                                  {evaluator.name}
                                  {evaluator.id === user.id && (
                                    <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
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

export default AdvisorEvaluations;