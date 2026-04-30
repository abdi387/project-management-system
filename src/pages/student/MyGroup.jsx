import React, { useState, useEffect } from 'react';
import { Users, Crown, Mail, Building, BookOpen, UserCheck, Shield, AlertCircle, GraduationCap, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService } from '../../services';
import useFetch from '../../hooks/useFetch';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { formatGroupDisplayName } from '../../utils/sectionDisplay';

const MyGroup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch group data
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
    refetch: refetchGroup
  } = useFetch(() => groupService.getGroupByStudentId(user.id));

  const [proposal, setProposal] = useState(null);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [proposalExists, setProposalExists] = useState(false);

  useEffect(() => {
    if (groupData?.group) {
      const fetchProposal = async () => {
        setLoadingProposal(true);
        try {
          const response = await proposalService.getProposalByGroupId(groupData.group.id);
          if (response?.proposal) {
            setProposal(response.proposal);
            setProposalExists(true);
          } else {
            setProposal(null);
            setProposalExists(false);
          }
        } catch (error) {
          // 404 means no proposal exists - that's fine
          if (error.response?.status === 404) {
            setProposal(null);
            setProposalExists(false);
          } else {
            console.error('Failed to fetch proposal:', error);
          }
        } finally {
          setLoadingProposal(false);
        }
      };
      fetchProposal();
    }
  }, [groupData]);

  const group = groupData?.group;
  const groupDisplayName = formatGroupDisplayName(group);

  // Get member details directly from group data
  const members = group?.Members || [];

  // Get advisor details
  const advisor = group?.Advisor;

  if (groupLoading || loadingProposal) {
    return <LoadingSpinner fullScreen text="Loading group information..." />;
  }

  if (!group) {
    return (
      <PageContainer title="My Group">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <Users className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">No Group Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto leading-relaxed">
            You haven't been assigned to a group yet. Please wait for your department head
            to initiate group formation.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Group">
      {/* Group Overview Card */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -translate-y-32 translate-x-32 opacity-50"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-wide">{groupDisplayName}</h2>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Building className="w-4 h-4" />
                <span>{group.department} Department</span>
              </div>
            </div>
            <StatusBadge status={group.proposalStatus || 'pending'} />
          </div>

          {/* No Proposal Alert */}
          {!proposalExists && (
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-center justify-between mb-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">No Proposal Submitted</p>
                  <p className="text-sm text-blue-700 mt-0.5">Submit your project proposal to proceed.</p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/student/proposal')}
                className="shrink-0"
              >
                Submit Proposal
              </Button>
            </div>
          )}

          {/* Proposal Rejected Alert */}
          {proposal?.status === 'rejected' && (
            <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-5 flex items-center justify-between mb-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-900">Proposal Rejected</p>
                  <p className="text-sm text-red-700 mt-0.5">
                    Feedback: {proposal.feedback || 'Please resubmit with new titles.'}
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate('/student/proposal')}
                className="shrink-0"
              >
                Resubmit
              </Button>
            </div>
          )}

          {/* Approved Project Info */}
          {proposal?.status === 'approved' && group.approvedTitle && (
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg shrink-0">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approved Project
                  </h3>
                  <p className="text-emerald-800 font-medium leading-relaxed">
                    {typeof group.approvedTitle === 'string'
                      ? (() => {
                          try {
                            return JSON.parse(group.approvedTitle).title;
                          } catch {
                            return group.approvedTitle;
                          }
                        })()
                      : group.approvedTitle}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Advisor & Evaluators Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Advisor Info */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 tracking-wide">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-violet-600" />
                </div>
                Project Advisor
              </h3>
              {advisor ? (
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-100 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {advisor.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{advisor.name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                        <Mail className="w-3.5 h-3.5" />
                        {advisor.email}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{advisor.department}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-amber-800 font-medium">No advisor assigned yet. An advisor will claim your project soon.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Committee */}
            {group.Evaluators && group.Evaluators.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 tracking-wide">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  Evaluation Committee
                </h3>
                <div className="space-y-3">
                  {group.Evaluators.map((evaluator) => (
                    <div
                      key={evaluator.id}
                      className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {evaluator.name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{evaluator.name}</p>
                          <p className="text-sm text-gray-500">{evaluator.department}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Group Members */}
          <div>
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-3 tracking-wide">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              Group Members
              <span className="ml-auto text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-100 transition-all duration-300 hover:shadow-md group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md ${
                        member.id === group.leaderId 
                          ? 'bg-gradient-to-br from-amber-500 to-yellow-600' 
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      {member.id === group.leaderId && (
                        <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full shadow-sm">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 truncate">{member.name}</p>
                        {member.id === group.leaderId && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {member.studentId}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Group Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-xl translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-4xl font-bold text-blue-600 mb-1">{members.length}</p>
            <p className="text-sm text-gray-600 font-medium">Members</p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-full blur-xl translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-4xl font-bold text-green-600 mb-1">
              {proposal?.status === 'approved' ? '✓' : proposalExists ? '⏳' : '−'}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {proposal?.status === 'approved' ? 'Approved' :
               proposalExists ? 'Pending' : 'Not Started'}
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-violet-50 rounded-full blur-xl translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-4xl font-bold text-violet-600 mb-1">
              {advisor ? '✓' : '-'}
            </p>
            <p className="text-sm text-gray-600 font-medium">Advisor</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default MyGroup;
