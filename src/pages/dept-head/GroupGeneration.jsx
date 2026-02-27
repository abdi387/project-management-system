// src/pages/dept-head/GroupGeneration.jsx
import React, { useState } from 'react';
import { Users, Settings, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useGroupFormation } from '../../hooks/useGroupFormation';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

const GroupGeneration = () => {
  const { user, getUsersByDepartment, users } = useAuth();
  const { getGroupsByDepartment } = useProject();
  const { formGroups, calculateGroupDistribution, loading, error } = useGroupFormation();

  const department = user?.department;
  const existingGroups = getGroupsByDepartment(department);
  const students = getUsersByDepartment(department).filter(
    u => u.role === 'student' && u.status === 'active'
  );

  const [maxPerGroup, setMaxPerGroup] = useState(4);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [generatedGroups, setGeneratedGroups] = useState([]);

  // Calculate distribution preview
  const distribution = calculateGroupDistribution(students.length, maxPerGroup);

  const handleGenerateGroups = () => {
    const result = formGroups(department, maxPerGroup);
    
    if (result.success) {
      setGeneratedGroups(result.groups);
      toast.success(`Successfully created ${result.groups.length} groups!`);
      setShowConfirmModal(false);
    } else {
      toast.error(result.error);
    }
  };

  // Combine existing and newly generated groups for display
  const allGroups = [...existingGroups, ...generatedGroups];

  const groupColumns = [
    { key: 'name', label: 'Group Name' },
    { 
      key: 'members', 
      label: 'Members',
      render: (members) => members?.length || 0
    },
    {
      key: 'leader',
      label: 'Leader',
      render: (leaderId, row) => {
        const leader = students.find(s => s.id === leaderId);
        return leader?.name || 'N/A';
      }
    },
    {
      key: 'proposalStatus',
      label: 'Proposal',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'approved' ? 'bg-green-100 text-green-800' :
          status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status || 'Not Submitted'}
        </span>
      )
    },
    {
      key: 'advisorId',
      label: 'Advisor',
      render: (advisorId) => {
        if (!advisorId) return <span className="text-gray-400 italic">Not Assigned</span>;
        const advisor = users.find(u => u.id === advisorId);
        return advisor ? (
          <div>
            <div className="font-medium text-gray-900">{advisor.name}</div>
            <div className="text-xs text-gray-500">{advisor.department}</div>
          </div>
        ) : 'Unknown';
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Formation</h1>
          <p className="text-gray-500">{department} Department</p>
        </div>
      </div>

      {/* Group Formation Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Automated Group Formation</h2>
            <p className="text-sm text-gray-500">Configure and generate student groups</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Configuration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Configuration</h3>
            <InputField
              label="Maximum Students per Group"
              type="number"
              name="maxPerGroup"
              value={maxPerGroup}
              onChange={(e) => setMaxPerGroup(parseInt(e.target.value) || 1)}
              min={2}
              max={10}
            />
            <p className="text-xs text-gray-500 mt-2">
              Students will be grouped based on CGPA, with top students assigned as group leaders.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Students:</span>
                <span className="font-medium">{students.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Groups to Create:</span>
                <span className="font-medium">{distribution.numberOfGroups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg. Group Size:</span>
                <span className="font-medium">{distribution.averageSize}</span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Generate Groups</h3>
              <p className="text-sm text-gray-500 mb-4">
                This will create groups automatically based on CGPA ranking.
              </p>
            </div>
            <Button
              onClick={() => setShowConfirmModal(true)}
              icon={Play}
              disabled={students.length < maxPerGroup || existingGroups.length > 0}
              fullWidth
            >
              Generate Groups
            </Button>
            {existingGroups.length > 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                Groups already exist for this department.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Students ({students.length})
        </h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'studentId', label: 'Student ID' },
            { key: 'section', label: 'Section' },
            { 
              key: 'cgpa', 
              label: 'CGPA',
              render: (value) => (
                <span className={`font-medium ${value >= 3.5 ? 'text-green-600' : value >= 3.0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {value?.toFixed(2)}
                </span>
              )
            }
          ]}
          data={students.sort((a, b) => b.cgpa - a.cgpa)}
          pageSize={10}
          searchable
        />
      </div>

      {/* Existing Groups */}
      {allGroups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Created Groups ({allGroups.length})
          </h2>
          <DataTable
            columns={groupColumns}
            data={allGroups}
            pageSize={10}
            searchable
          />
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Group Generation"
        onConfirm={handleGenerateGroups}
        confirmText="Generate Groups"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Group Formation Summary</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {students.length} students will be grouped</li>
              <li>• {distribution.numberOfGroups} groups will be created</li>
              <li>• Maximum {maxPerGroup} students per group</li>
              <li>• Top CGPA students will be assigned as group leaders</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important</p>
                <p className="text-sm text-yellow-700 mt-1">
                  This action cannot be easily undone. Groups will be formed based on 
                  the current student list and their CGPA rankings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupGeneration;