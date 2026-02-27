// src/pages/advisor/GroupDetails.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Crown, 
  FileText, 
  MessageSquare,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { users } = useAuth();
  const { groups, getProgressReportsByGroup, getFinalDraftByGroup } = useProject();

  const group = groups.find(g => g.id === groupId);
  const members = group?.members.map(id => users.find(u => u.id === id)).filter(Boolean) || [];
  const section = members.length > 0 ? members[0].section : null;
  const reports = getProgressReportsByGroup(groupId);
  const finalDraft = getFinalDraftByGroup(groupId);

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} icon={ArrowLeft}>
          Back
        </Button>
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700">Group not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} icon={ArrowLeft}>
        Back to Groups
      </Button>

      {/* Group Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <div className="flex items-center gap-2 text-gray-500">
              <span>{group.department} Department</span>
              {section && (
                <>
                  <span>•</span>
                  <span>Section {section}</span>
                </>
              )}
            </div>
          </div>
          <StatusBadge status={group.finalDraftStatus} />
        </div>

        {group.approvedTitle && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-1">Project Title</h3>
            <p className="text-blue-700">{group.approvedTitle}</p>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Group Members ({members.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  {member.id === group.leader && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-gray-500">{member.studentId}</p>
                <p className="text-sm text-gray-500">CGPA: {member.cgpa?.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Reports */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Progress Reports ({reports.length})
          </h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/advisor/progress-review')}
          >
            Review All
          </Button>
        </div>

        {reports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No progress reports submitted yet</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{report.title}</p>
                  <p className="text-sm text-gray-500">{formatDate(report.submittedAt)}</p>
                </div>
                <StatusBadge status={report.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Draft Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Final Draft
        </h2>

        {finalDraft ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{finalDraft.title}</p>
                <p className="text-sm text-gray-500">Submitted: {formatDate(finalDraft.submittedAt)}</p>
              </div>
              <StatusBadge status={finalDraft.advisorStatus} />
            </div>
            
            {finalDraft.advisorStatus === 'pending' && (
              <Button 
                onClick={() => navigate('/advisor/final-approval')}
                fullWidth
              >
                Review Final Draft
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Final draft not yet submitted</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;