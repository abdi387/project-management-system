// src/pages/student/MyGroup.jsx
import React from 'react';
import { Users, Crown, Mail, Building, BookOpen, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useEvaluatorAssign } from '../../hooks/useEvaluatorAssign';
import StatusBadge from '../../components/common/StatusBadge';

const MyGroup = () => {
  const { user, users } = useAuth();
  const { getGroupByStudentId, getProposalByGroupId } = useProject();
  const { getEvaluatorsForGroup } = useEvaluatorAssign();

  const group = getGroupByStudentId(user?.id);
  const evaluators = group ? getEvaluatorsForGroup(group.id) : [];
  const proposal = group ? getProposalByGroupId(group.id) : null;

  // Get member details
  const members = group?.members.map(memberId => 
    users.find(u => u.id === memberId)
  ).filter(Boolean) || [];

  // Get advisor details
  const advisor = group?.advisorId ? users.find(u => u.id === group.advisorId) : null;

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Group</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Group Assigned</h2>
          <p className="text-yellow-700">
            You haven't been assigned to a group yet. Please wait for your department head 
            to initiate group formation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Group</h1>

      {/* Group Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
            <p className="text-gray-500">{group.department} Department</p>
          </div>
          <StatusBadge status={group.proposalStatus} />
        </div>

        {/* Project Info */}
        {proposal?.status === 'approved' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Approved Project</h3>
            </div>
            <p className="text-blue-800 font-medium">{(typeof group.approvedTitle === 'object' ? group.approvedTitle?.title : group.approvedTitle)}</p>
            <p className="text-sm text-blue-600 mt-1">Domain: {proposal.approvedTitle?.domain}</p>
          </div>
        )}

        {/* Advisor Info */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Project Advisor
          </h3>
          {advisor ? (
            <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {advisor.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{advisor.name}</p>
                <p className="text-sm text-gray-500">{advisor.email}</p>
                <p className="text-sm text-gray-500">{advisor.department}</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700">No advisor assigned yet. An advisor will claim your project soon.</p>
            </div>
          )}
        </div>

        {/* Evaluation Committee */}
        {evaluators.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Evaluation Committee
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluators.map((evaluator) => (
                <div 
                  key={evaluator.id}
                  className="flex items-center gap-4 bg-gray-50 rounded-lg p-4"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                    {evaluator.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{evaluator.name}</p>
                    <p className="text-sm text-gray-500">{evaluator.department}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Members */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Members ({members.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => (
              <div 
                key={member.id}
                className="flex items-center gap-4 bg-gray-50 rounded-lg p-4"
              >
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{member.name}</p>
                    {member.id === group.leader && (
                      <Crown className="w-4 h-4 text-yellow-500" title="Group Leader" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{member.studentId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{members.length}</p>
          <p className="text-sm text-gray-500">Members</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-green-600">
            {proposal?.status === 'approved' ? '✓' : '-'}
          </p>
          <p className="text-sm text-gray-500">Proposal</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">
            {advisor ? '✓' : '-'}
          </p>
          <p className="text-sm text-gray-500">Advisor</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-teal-600">
            {group.finalDraftStatus === 'fully-approved' ? '✓' : '-'}
          </p>
          <p className="text-sm text-gray-500">Final Draft</p>
        </div>
      </div>
    </div>
  );
};

export default MyGroup;