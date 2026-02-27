// src/pages/advisor/ProjectMarketplace.jsx
import React, { useState } from 'react';
import { Store, Search, Filter, CheckCircle, Users, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import SemesterLock from '../../components/common/SemesterLock';

const ProjectMarketplace = () => {
  const { user, users, updateUser } = useAuth();
  const { proposals, groups, assignAdvisorToGroup, projectSettings, academicYear } = useProject();
  const { notifyProjectClaim } = useNotification();

  if (academicYear?.semester === 2) {
    return <SemesterLock message="The Project Marketplace is only available in the first semester." />;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Get available projects (approved proposals without advisors)
  const availableProjects = proposals
    .filter(p => {
      const group = groups.find(g => g.id === p.groupId);
      return p.status === 'approved' && group && !group.advisorId;
    })
    .map(p => {
      const group = groups.find(g => g.id === p.groupId);
      return {
        ...p,
        group,
        members: group?.members.map(id => users.find(u => u.id === id)).filter(Boolean) || []
      };
    });

  // Filter projects
  const filteredProjects = availableProjects.filter(project => {
    const matchesSearch = 
      project.approvedTitle?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.approvedTitle?.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !departmentFilter || project.group?.department === departmentFilter;
    const matchesDomain = !domainFilter || project.approvedTitle?.domain === domainFilter;
    
    return matchesSearch && matchesDepartment && matchesDomain;
  });

  // Check if advisor can claim more projects
  const currentGroupCount = groups.filter(g => g.advisorId === user?.id).length;
  const maxGroups = projectSettings?.maxGroupsPerAdvisor || 5;
  const canClaimMore = currentGroupCount < maxGroups;

  const departments = [
    { value: '', label: 'All Departments' },
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Information Systems', label: 'Information Systems' }
  ];

  const domains = [
    { value: '', label: 'All Domains' },
    { value: 'Web Development', label: 'Web Development' },
    { value: 'Mobile Application', label: 'Mobile Application' },
    { value: 'Machine Learning', label: 'Machine Learning' },
    { value: 'Data Science', label: 'Data Science' },
    { value: 'Cybersecurity', label: 'Cybersecurity' },
    { value: 'IoT', label: 'IoT' },
    { value: 'Cloud Computing', label: 'Cloud Computing' }
  ];

  const handleClaimProject = () => {
    if (!selectedProject || !canClaimMore) return;

    assignAdvisorToGroup(selectedProject.group.id, user.id);
    updateUser(user.id, { currentGroups: currentGroupCount + 1 });
    
    // Notify group members
    notifyProjectClaim(
      selectedProject.group.id,
      user.name,
      selectedProject.group.members
    );

    toast.success('Project claimed successfully!');
    setShowClaimModal(false);
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Marketplace</h1>
          <p className="text-gray-500">
            {availableProjects.length} unclaimed projects available • Your capacity: {currentGroupCount}/{maxGroups} groups
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <InputField
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              icon={Search}
            />
          </div>
          <SelectDropdown
            name="department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={departments}
          />
          <SelectDropdown
            name="domain"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            options={domains}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {project.approvedTitle?.domain}
                  </span>
                  <span className="text-sm text-gray-500">
                    {project.group?.department}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {project.approvedTitle?.title}
                </h3>
                
                <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                  {project.approvedTitle?.description}
                </p>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Users className="w-4 h-4" />
                  <span>{project.members.length} members</span>
                </div>

                <Button
                  fullWidth
                  onClick={() => {
                    setSelectedProject(project);
                    setShowClaimModal(true);
                  }}
                  disabled={!canClaimMore}
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
      >
        {selectedProject && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">
                {selectedProject.approvedTitle?.title}
              </h3>
              <p className="text-sm text-blue-700">
                {selectedProject.approvedTitle?.domain} • {selectedProject.group?.department}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Group Members</h4>
              <div className="space-y-2">
                {selectedProject.members.map((member) => (
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
              their final year project. You will have {maxGroups - currentGroupCount - 1} remaining 
              slots after this claim.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectMarketplace;