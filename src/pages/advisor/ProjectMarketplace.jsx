import React, { useState, useEffect } from 'react';
import { Store, Search, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { groupService, academicService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ProjectMarketplace = () => {
  const { user, updateUser } = useAuth();
  const { isReadOnly, academicYear, systemSettings, refreshSettings } = useProtectedRoute();

  // Fetch available projects
  const {
    data: projectsData,
    loading: projectsLoading,
    refetch: refetchProjects
  } = useFetch(() => groupService.getAvailableProjects(), []);

  // Fetch current academic year to filter groups
  const {
    data: currentYearData,
    loading: yearLoading
  } = useFetch(() => academicService.getCurrentAcademicYear(), []);

  // Fetch advisor's current groups (filtered by current academic year)
  const {
    data: groupsData,
    loading: groupsLoading,
    refetch: refetchMyGroups
  } = useFetch(() => {
    const currentYearId = currentYearData?.academicYear?.id;
    return groupService.getGroups({ advisorId: user.id, academicYearId: currentYearId });
  }, [user.id, currentYearData]);

  // Fetch fresh settings on mount to ensure we have the latest value
  const {
    data: settingsData,
    loading: settingsLoading
  } = useFetch(() => academicService.getSystemSettings(), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const projects = projectsData?.groups || [];
  const myGroups = groupsData?.groups || [];
  // Merge context settings with freshly fetched settings (fresh takes priority)
  const freshSettings = settingsData?.settings || systemSettings || {};
  // support both the newer and legacy keys; academic backend prefers "maximum_groups_per_advisor"
  const maxGroups = parseInt(freshSettings.maximum_groups_per_advisor ?? freshSettings.max_groups_per_advisor) || 3;
  const currentGroupCount = myGroups.length;
  const remainingSlots = Math.max(0, maxGroups - currentGroupCount);
  const canClaimMore = currentGroupCount < maxGroups;

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      (project.approvedTitle?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.Members?.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesDepartment = !departmentFilter || project.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const departments = [
    { value: '', label: 'All Departments' },
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Information Systems', label: 'Information Systems' }
  ];

  const handleClaimProject = async () => {
    if (!selectedProject || !canClaimMore) return;

    setLoading(true);
    try {
      await groupService.assignAdvisor(selectedProject.id, user.id);
      
      toast.success('Project claimed successfully!');
      setShowClaimModal(false);
      setSelectedProject(null);
      await refetchProjects();
      await refetchMyGroups();
    } catch (error) {
      toast.error(error.error || 'Failed to claim project');
    } finally {
      setLoading(false);
    }
  };

  if (projectsLoading || groupsLoading || settingsLoading || yearLoading) {
    return <LoadingSpinner fullScreen text="Loading marketplace..." />;
  }

  if (academicYear?.semester === '2') {
    return (
      <PageContainer
        title=""
        subtitle="Marketplace is only available in Semester 1"
      >
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Store className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Marketplace Closed</h2>
          <p className="text-yellow-700">
            The Project Marketplace is only available in the first semester.
            You are currently in Semester 2.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title=""
      requiredFeature="project-marketplace"
    >
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputField
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by project title or student name..."
              icon={Search}
            />
          </div>
          <SelectDropdown
            name="department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={departments}
          />
        </div>
      </div>

      {/* Capacity Warning */}
      {!canClaimMore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            You have reached the maximum number of groups ({maxGroups}).
            You cannot claim more projects at this time.
          </p>
        </div>
      )}

      {/* Available Slots Info */}
      {canClaimMore && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            <strong>You have {remainingSlots} available slot(s)</strong> out of {maxGroups} maximum groups allowed.
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Projects Available</h2>
          <p className="text-gray-500">
            There are no approved projects waiting for an advisor at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {project.department}
                  </span>
                  <span className="text-sm text-gray-500">
                    {project.Members?.length || 0} members
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-3 text-lg line-clamp-3 min-h-[4.5rem]">
                  {typeof project.approvedTitle === 'string'
                    ? JSON.parse(project.approvedTitle).title
                    : project.approvedTitle}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Users className="w-4 h-4" />
                  <span>
                    {project.Members?.map(m => m.name).join(', ')}
                  </span>
                </div>

                <Button
                  fullWidth
                  onClick={() => {
                    setSelectedProject(project);
                    setShowClaimModal(true);
                  }}
                  disabled={!canClaimMore || isReadOnly}
                >
                  Claim Project
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      <Modal
        isOpen={showClaimModal}
        onClose={() => {
          setShowClaimModal(false);
          setSelectedProject(null);
        }}
        title="Claim Project"
        onConfirm={handleClaimProject}
        confirmText="Claim Project"
        loading={loading}
      >
        {selectedProject && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">
                {typeof selectedProject.approvedTitle === 'string' 
                  ? JSON.parse(selectedProject.approvedTitle).title 
                  : selectedProject.approvedTitle}
              </h3>
              <p className="text-sm text-blue-700">
                {selectedProject.department}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Group Members</h4>
              <div className="space-y-2">
                {selectedProject.Members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.studentId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              By claiming this project, you agree to supervise this group throughout
              their final year project. You currently have {remainingSlots} available slot(s),
              and after this claim you will have {Math.max(0, remainingSlots - 1)} remaining slot(s).
            </p>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default ProjectMarketplace;

