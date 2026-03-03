// src/pages/faculty-head/FacultyRepository.jsx

import React, { useState, useEffect } from 'react';
import { Archive, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import DataTable from '../../components/common/DataTable';

const FacultyRepository = () => {
  const [repositoryData, setRepositoryData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    // Load all data from local storage repository
    const storedRepo = JSON.parse(localStorage.getItem('fypRepository') || '[]');
    setRepositoryData(storedRepo);
  }, []);

  // Get unique academic years for filter
  const uniqueYears = [...new Set(repositoryData.map(item => item.academicYear))].sort().reverse();

  const columns = [
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'semester', label: 'Sem', render: (sem) => `Sem ${sem}` },
    { key: 'department', label: 'Department' },
    { 
      key: 'projectTitle', 
      label: 'Project Title',
      render: (title) => <span className="font-medium text-gray-900">{(typeof title === 'object' ? title?.title : title) || 'N/A'}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Repository</h1>
          <p className="text-gray-500">Archived Final Year Projects - All Departments</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Archive className="w-4 h-4" />
          Total Archived: {repositoryData.length}
        </div>
      </div>

      <div className="space-y-4">
        {uniqueYears.length > 0 ? (
          uniqueYears.map(year => (
            <div key={year} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-gray-900 text-lg">Academic Year {year}</span>
                </div>
                {selectedYear === year ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {selectedYear === year && (
                <div className="p-6 border-t border-gray-100 animate-fade-in">
                  <DataTable
                    columns={columns}
                    data={repositoryData.filter(item => item.academicYear === year)}
                    searchable
                    pageSize={10}
                    emptyMessage="No archived projects found for this year."
                  />
                </div>
              )}
            </div>
          ))
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
    </div>
  );
};

export default FacultyRepository;