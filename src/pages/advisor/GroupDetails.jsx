import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  ChevronLeft,
  Mail,
  Phone,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, proposalService, progressService, finalDraftService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildProgressReportFileLink } from '../../utils/fileUrlUtils';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

// Safe CGPA formatter
const formatCGPA = (cgpa) => {
  if (cgpa === null || cgpa === undefined || cgpa === '') return 'N/A';
  if (typeof cgpa === 'number') return cgpa.toFixed(2);
  if (typeof cgpa === 'string') {
    const parsed = parseFloat(cgpa);
    if (!isNaN(parsed)) return parsed.toFixed(2);
  }
  return 'N/A';
};

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch group details
  const { 
    data: groupData, 
    loading: groupLoading,
    error: groupError,
    refetch: refetchGroup
  } = useFetch(() => groupService.getGroupById(groupId));

  // Fetch proposal
  const { 
    data: proposalData,
    loading: proposalLoading,
    refetch: refetchProposal
  } = useFetch(
    () => proposalService.getProposalByGroupId(groupId),
    [groupId],
    true
  );

  // Fetch progress reports
  const { 
    data: reportsData,
    loading: reportsLoading,
    refetch: refetchReports
  } = useFetch(
    () => progressService.getProgressReportsByGroup(groupId),
    [groupId],
    true
  );

  // Fetch final draft
  const {
    data: draftData,
    loading: draftLoading,
    refetch: refetchDraft
  } = useFetch(
    () => finalDraftService.getFinalDraftByGroup(groupId),
    [groupId],
    true
  );

  // Fetch sections
  const { data: sectionsData, loading: sectionsLoading } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  const group = groupData?.group;
  const proposal = proposalData?.proposal;
  const reports = reportsData?.reports || [];
  // Get the most recent draft (backend returns drafts array ordered by submittedAt DESC)
  const drafts = draftData?.drafts || [];
  const finalDraft = drafts.length > 0 ? drafts[0] : null;

  // Determine if user is the advisor of this group
  const isAdvisor = group?.advisorId === user?.id;

  if (groupLoading || proposalLoading || reportsLoading || draftLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading group details..." />;
  }

  if (!group) {
    return (
      <PageContainer title="Group Details">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Group Not Found</h2>
          <p className="text-gray-500">The requested group does not exist.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Group: ${formatGroupDisplayName(group, sectionNameMap)}`}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Group info & members */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Information Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Group Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{group.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Section</p>
                <p className="font-medium">{getMemberSectionName(group.Members?.[0], sectionNameMap)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Members</p>
                <p className="font-medium">{group.Members?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Advisor</p>
                <p className="font-medium">{group.Advisor?.name || 'Not Assigned'}</p>
              </div>
            </div>
          </div>

          {/* Members Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Group Members ({group.Members?.length || 0})
            </h3>
            <div className="space-y-3">
              {group.Members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      CGPA: {formatCGPA(member.cgpa)}
                    </span>
                    {member.id === group.leaderId && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        Leader
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Reports */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Progress Reports ({reports.length})
            </h3>
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{report.title}</h4>
                      <StatusBadge status={report.status} size="sm" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Submitted: {formatDate(report.submittedAt)}</span>
                      {report.feedback && <span>Feedback provided</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No progress reports yet.</p>
            )}
          </div>
        </div>

        {/* Right column - Proposal & Draft */}
        <div className="space-y-6">
          {/* Proposal Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Project Proposal
            </h3>
            {proposal ? (
              <div>
                <StatusBadge status={proposal.status} size="sm" className="mb-3" />
                <div className="space-y-3">
                  {proposal.Titles?.map((title, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${idx === proposal.approvedTitleIndex ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <p className="font-medium text-gray-900">{title.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Domain: {title.Domain?.name}</p>
                      {idx === proposal.approvedTitleIndex && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Approved</span>
                      )}
                    </div>
                  ))}
                </div>
                {proposal.feedback && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-700"><span className="font-medium">Feedback:</span> {proposal.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No proposal submitted yet.</p>
            )}
          </div>

          {/* Final Draft Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Final Draft
            </h3>
            {finalDraft ? (
              <div>
                <StatusBadge status={finalDraft.advisorStatus} size="sm" className="mb-3" />
                <p className="text-sm text-gray-600 mb-2"><span className="font-medium">Title:</span> {finalDraft.title}</p>
                <a href={buildProgressReportFileLink(finalDraft.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">View Document</a>
                {finalDraft.advisorFeedback && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-700"><span className="font-medium">Feedback:</span> {finalDraft.advisorFeedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No final draft submitted yet.</p>
            )}
          </div>

          {/* Evaluators Card */}
          {group.Evaluators && group.Evaluators.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-600" />
                Evaluators
              </h3>
              <div className="space-y-2">
                {group.Evaluators.map((evaluator) => (
                  <div key={evaluator.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold">
                      {evaluator.name?.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{evaluator.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default GroupDetails;