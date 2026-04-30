import React, { useState } from 'react';
import { Archive, Calendar, ChevronDown, ChevronUp, Download, Search, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';

const FacultyRepository = () => {
  const { user } = useAuth();

  // Fetch repository data
  const { 
    data: repoData, 
    loading: repoLoading 
  } = useFetch(() => {
    // This would be an API call to get all archived projects
    return Promise.resolve({ repository: [] });
  });

  const [selectedYear, setSelectedYear] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const repository = repoData?.repository || [];

  // Group by academic year
  const years = [...new Set(repository.map(item => item.academicYear))].sort().reverse();

  // Filter by search and department
  const filteredRepository = repository.filter(item => {
    const matchesSearch = 
      item.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.groupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.students?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const columns = [
    {
      key: 'academicYear',
      label: 'Year',
      render: (year) => <span className="font-medium">{year}</span>
    },
    { key: 'semester', label: 'Sem', render: (sem) => `Sem ${sem}` },
    { key: 'department', label: 'Dept' },
    {
      key: 'projectTitle',
      label: 'Project Title',
      render: (title) => <span className="font-medium text-gray-900">{title || 'N/A'}</span>
    },
    { key: 'groupName', label: 'Group' },
    {
      key: 'students',
      label: 'Students',
      render: (students) => <span className="text-sm text-gray-600">{students}</span>
    },
    { key: 'advisor', label: 'Advisor' },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (evaluators) => <span className="text-sm text-gray-600">{evaluators || 'None'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      )
    }
  ];

  const departments = [
    { value: 'all', label: 'All Departments' },
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Information Systems', label: 'Information Systems' }
  ];

  if (repoLoading) {
    return <LoadingSpinner fullScreen text="Loading repository..." />;
  }

  return (
    <PageContainer 
      title="Faculty Repository" 
      subtitle="Archived Final Year Projects - All Departments"
    >
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Project Archive</h2>
            <p className="text-indigo-100">Access completed projects from all departments</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
            <p className="text-3xl font-bold">{repository.length}</p>
            <p className="text-sm opacity-80">Archived Projects</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputField
              placeholder="Search by project title, group, or student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {departments.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Yearly Archive Accordion */}
      <div className="space-y-4">
        {years.length > 0 ? (
          years.map(year => {
            const yearData = filteredRepository.filter(item => item.academicYear === year);
            if (yearData.length === 0) return null;

            return (
              <div key={year} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <button
                  onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      year === '2024/2025' ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-gray-900 text-lg">Academic Year {year}</span>
                      <p className="text-sm text-gray-500">{yearData.length} archived projects</p>
                    </div>
                  </div>
                  {selectedYear === year ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {selectedYear === year && (
                  <div className="p-6 border-t border-gray-100 animate-fade-in">
                    <DataTable
                      columns={columns}
                      data={yearData}
                      searchable={false}
                      pageSize={10}
                      emptyMessage="No archived projects found for this year."
                      onRowClick={(row) => {
                        setSelectedArchive(row);
                        setShowDetailsModal(true);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Archives Found</h3>
            <p className="text-gray-500 mt-1">Terminated semester data will appear here.</p>
          </div>
        )}
      </div>

      {/* Export Button */}
      {repository.length > 0 && (
        <div className="flex justify-end mt-6">
          <Button variant="outline" icon={Download}>
            Export Archive Index
          </Button>
        </div>
      )}

      {/* Details Modal */}
      {selectedArchive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Project Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-indigo-900 mb-2">{selectedArchive.projectTitle}</h4>
                <p className="text-sm text-gray-600">
                  {selectedArchive.groupName} • {selectedArchive.department}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Academic Year</p>
                  <p className="font-medium">{selectedArchive.academicYear}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Semester</p>
                  <p className="font-medium">Semester {selectedArchive.semester}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Advisor</p>
                  <p className="font-medium">{selectedArchive.advisor}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium">{selectedArchive.status}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Group Members</p>
                <p className="text-sm">{selectedArchive.students}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Evaluators</p>
                <p className="text-sm">{selectedArchive.evaluators || 'None'}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Archived On</p>
                <p className="text-sm">{formatDate(selectedArchive.archivedAt)}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              <Button variant="primary" icon={Download}>
                Download Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default FacultyRepository;