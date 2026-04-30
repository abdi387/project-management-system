import React from 'react';
import { Shield, Mail, Building, UserCheck, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService } from '../../services';
import useFetch from '../../hooks/useFetch';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatGroupDisplayName } from '../../utils/sectionDisplay';

const StudentEvaluators = () => {
  const { user } = useAuth();

  // Fetch group data
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError
  } = useFetch(() => groupService.getGroupByStudentId(user.id));

  const group = groupData?.group;
  const groupDisplayName = formatGroupDisplayName(group);
  const evaluators = group?.Evaluators || [];

  if (groupLoading) {
    return <LoadingSpinner fullScreen text="Loading evaluators..." />;
  }

  if (!group) {
    return (
      <PageContainer title="Assigned Evaluators">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-amber-900 mb-3">No Group Found</h3>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">You are not currently assigned to a project group.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Assigned Evaluators"
      subtitle="Faculty members assigned to evaluate your group's project"
    >
      {evaluators.length === 0 ? (
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100 max-w-lg mx-auto">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -translate-y-32 translate-x-32 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <UserCheck className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No Evaluators Assigned Yet</h3>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              The Faculty Head has not yet assigned evaluators to your group. You will be notified once assignments are made.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Evaluators Count Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 rounded-2xl p-6 mb-8 text-white shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-2xl translate-y-24 -translate-x-24"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-violet-200 text-sm font-medium">Evaluation Committee</p>
                    <p className="text-2xl font-bold">{evaluators.length} {evaluators.length === 1 ? 'Evaluator' : 'Evaluators'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{groupDisplayName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {evaluators.map((evaluator) => (
              <div
                key={evaluator.id}
                className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Subtle top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                        {evaluator.name.charAt(0)}
                      </div>
                      <div className="absolute -top-1 -right-1 p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-sm">
                        <Shield className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{evaluator.name}</h3>
                      <span className="inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Evaluator
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-600 bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-sm">
                      <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                        <Building className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium">{evaluator.department || 'Department N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-sm">
                      <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium">{evaluator.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default StudentEvaluators;
