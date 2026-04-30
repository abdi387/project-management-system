import React, { useState } from 'react';
import { Archive, Calendar, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DeptRepository = () => {
  const { user } = useAuth();
  const department = user?.department;

  // Fetch repository data
  const { 
    data: repoData, 
    loading: repoLoading 
  } = useFetch(() => {
    // This would be an API call to get archived projects
    // For now, return mock data structure
    return Promise.resolve({ repository: [] });
  });

  const [selectedYear, setSelectedYear] = useState(null);
  const repository = repoData?.repository || [];

  // Group by academic year
  const years = [...new Set(repository.map(item => item.academicYear))].sort().reverse();

  const columns = [
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'semester', label: 'Sem', render: (sem) => `Sem ${sem}` },
    { key: 'department', label: 'Department' },
    {
      key: 'projectTitle',
      label: 'Project Title',
      render: (title) => <span className="font-medium text-gray-900">{title || 'N/A'}</span>
    },
    { key: 'groupName', label: 'Group' },
    {
      key: 'members',
      label: 'Students',
      render: (members) => <span className="text-sm text-gray-600">{members}</span>
    },
    { key: 'advisor', label: 'Advisor' },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (evaluators) => <span className="text-sm text-gray-600">{evaluators || 'None'}</span>
    },
    {
      key: 'status',
      label: 'Final Status',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      )
    }
  ];

  if (repoLoading) {
    return <LoadingSpinner fullScreen text="Loading repository..." />;
  }

  return (
    <PageContainer 
      title="Department Repository" 
      subtitle={`Archived Projects - ${department} Department`}
    >
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Project Archive</h2>
            <p className="text-teal-100">Access completed projects from previous academic years</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
            <p className="text-3xl font-bold">{repository.length}</p>
            <p className="text-sm opacity-80">Archived Projects</p>
          </div>
        </div>
      </div>

      {/* Yearly Archive Accordion */}
      <div className="space-y-4">
        {years.length > 0 ? (
          years.map(year => {
            const yearData = repository.filter(item => item.academicYear === year);
            
            return (
              <div key={year} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <button
                  onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
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
                      searchable
                      pageSize={10}
                      emptyMessage="No archived projects found for this year."
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
    </PageContainer>
  );
};

export default DeptRepository;