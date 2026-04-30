import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, progressService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const MentoredGroups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();

  const currentAcademicYearId = academicYear?.id;
  const currentSemester = academicYear?.semester || '1';

  // Fetch my groups filtered by current academic year
  const {
    data: groupsData,
    loading: groupsLoading,
    refetch: refetchGroups
  } = useFetch(() => groupService.getGroups({ 
    advisorId: user.id,
    academicYearId: currentAcademicYearId 
  }), [user.id, currentAcademicYearId]);

  // Fetch all progress reports for these groups
  const {
    data: progressData,
    loading: progressLoading
  } = useFetch(() => progressService.getProgressReportsByAdvisor(user.id));

  // Fetch sections
  const { data: sectionsData, loading: sectionsLoading } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  const myGroups = groupsData?.groups || [];
  const allReports = progressData?.reports || [];

  // For advisors, show all groups from current academic year
  // In Semester 2, advisors need to see all their continuing groups
  const semesterAwareGroups = myGroups;

  const getGroupStats = (groupId) => {
    const reports = allReports.filter(r => r.groupId === groupId);
    return {
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === 'pending').length
    };
  };

  if (groupsLoading || progressLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading groups..." />;
  }

  if (semesterAwareGroups.length === 0) {
    return (
      <PageContainer title="">
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Groups Yet</h2>
          <p className="text-gray-500">
            Visit the Project Marketplace to claim projects and start mentoring groups.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title=""
      subtitle={`Semester ${currentSemester} • ${semesterAwareGroups.length} group(s)`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {semesterAwareGroups.map((group) => {
          const stats = getGroupStats(group.id);
          const firstMember = group.Members?.[0];
          
          return (
            <div
              key={group.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
              onClick={() => navigate(`/advisor/groups/${group.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{formatGroupDisplayName(group, sectionNameMap)}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{group.department}</span>
                      {firstMember?.section && <span>• Section {getMemberSectionName(firstMember, sectionNameMap)}</span>}
                    </div>
                  </div>
                  <StatusBadge status={group.finalDraftStatus} />
                </div>

                <p className="text-blue-600 font-medium mb-4 line-clamp-2">
                  {typeof group.approvedTitle === 'string' 
                    ? JSON.parse(group.approvedTitle).title 
                    : group.approvedTitle || 'Project title pending'}
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{group.Members?.length || 0} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{stats.totalReports} reports</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className={`text-lg font-bold ${stats.pendingReports > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {stats.pendingReports}
                    </p>
                    <p className="text-xs text-gray-500">Pending Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${
                      group.finalDraftStatus === 'fully-approved' ? 'text-green-600' :
                      group.finalDraftStatus === 'submitted' ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      {group.finalDraftStatus === 'fully-approved' ? '✓' :
                       group.finalDraftStatus === 'submitted' ? '⏳' : '-'}
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
    </PageContainer>
  );
};

export default MentoredGroups;