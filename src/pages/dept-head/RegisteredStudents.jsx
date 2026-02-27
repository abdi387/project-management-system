import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';

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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {value.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.studentId}</div>
          </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registered Students</h1>
          <p className="text-gray-500">4th Year Students - {department} Department</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
          Total: {students.length} Students
        </div>
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