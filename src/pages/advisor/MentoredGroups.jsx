// src/pages/advisor/MentoredGroups.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import StatusBadge from '../../components/common/StatusBadge';

const MentoredGroups = () => {
  const navigate = useNavigate();
  const { user, users } = useAuth();
  const { getGroupsByAdvisor, getProgressReportsByGroup, getFinalDraftByGroup } = useProject();

  const myGroups = getGroupsByAdvisor(user?.id);

  const getGroupStats = (groupId) => {
    const reports = getProgressReportsByGroup(groupId);
    const draft = getFinalDraftByGroup(groupId);
    return {
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      hasFinalDraft: !!draft,
      draftStatus: draft?.advisorStatus || 'not-submitted'
    };
  };

  if (myGroups.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Groups</h1>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Groups Yet</h2>
          <p className="text-gray-500">
            Visit the Project Marketplace to claim projects and start mentoring groups.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
        <span className="text-gray-500">{myGroups.length} group(s)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myGroups.map((group) => {
          const stats = getGroupStats(group.id);
          const members = group.members.map(id => users.find(u => u.id === id)).filter(Boolean);
          const section = members.length > 0 ? members[0].section : null;
          
          return (
            <div 
              key={group.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/advisor/groups/${group.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{group.department}</span>
                      {section && <span>• Section {section}</span>}
                    </div>
                  </div>
                  <StatusBadge status={group.finalDraftStatus} />
                </div>

                <p className="text-blue-600 font-medium mb-4 line-clamp-2">
                  {group.approvedTitle || 'Project title pending'}
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{members.length} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{stats.totalReports} reports</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className={`text-lg font-bold ${stats.pendingReports > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {stats.pendingReports}
                    </p>
                    <p className="text-xs text-gray-500">Pending Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {stats.totalReports}
                    </p>
                    <p className="text-xs text-gray-500">Total Reports</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${
                      stats.draftStatus === 'approved' ? 'text-green-600' : 
                      stats.hasFinalDraft ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      {stats.draftStatus === 'approved' ? '✓' : stats.hasFinalDraft ? '⏳' : '-'}
                    </p>
                    <p className="text-xs text-gray-500">Final Draft</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">View Details</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MentoredGroups;