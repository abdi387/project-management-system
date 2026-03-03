// src/pages/dept-head/RegisteredStudents.jsx

import React from 'react';
import { Mail, Phone, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import { generateRegisteredStudentsPDF, downloadPDF } from '../../utils/pdfGenerator'; 

const RegisteredStudents = () => {
  const { user, getUsersByDepartment } = useAuth();
  const department = user?.department;

  // Get active students for this department
  const students = getUsersByDepartment(department).filter(
    u => u.role === 'student' && u.status === 'active'
  );

  const columns = [
    { 
      key: 'name', 
      label: 'Student Name',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">ID: {row.studentId}</div>
        </div>
      )
    },
    { 
      key: 'email', 
      label: 'Contact',
      render: (value, row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-3 h-3" /> {value}
          </div>
          {row.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-3 h-3" /> {row.phone}
            </div>
          )}
        </div>
      )
    },
    { key: 'section', label: 'Section' },
    { 
      key: 'cgpa', 
      label: 'CGPA',
      render: (value) => <span className={`font-medium ${value >= 3.5 ? 'text-green-600' : 'text-gray-600'}`}>{value?.toFixed(2)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} size="sm" />
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Registered Students</h1>
          <div className="flex items-center gap-3">
              {/* Temporarily using a standard button for debugging visibility */}
              <button onClick={() => {
                const doc = generateRegisteredStudentsPDF(students, department); 
                downloadPDF(doc, `Registered_Students_${department}`);
              }} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              Total: {students.length}
            </span>
          </div>
        </div>
        <p className="text-gray-500 mt-1">4th Year Students - {department} Department</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={students}
          searchable
          pageSize={10}
          emptyMessage="No registered students found in this department."
        />
      </div>
    </div>
  );
};

export default RegisteredStudents;