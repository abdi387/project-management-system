// src/pages/faculty-head/EvaluatorManager.jsx
import React, { useState } from 'react';
import { Settings, Play, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

const EvaluatorManager = () => {
  const { getUsersByRole, users, user } = useAuth();
  const { groups, assignEvaluatorsToGroup, defenseSchedules } = useProject();
  const advisors = getUsersByRole('advisor').filter(a => a.status === 'active' || !a.status);
  
  // Groups eligible for evaluator assignment
  const eligibleGroups = groups.filter(g => 
    (g.finalDraftStatus === 'advisor-approved' || g.finalDraftStatus === 'fully-approved') &&
    (!g.evaluators || g.evaluators.length === 0)
  );

  const currentAssignments = groups
    .filter(g => g.evaluators && g.evaluators.length > 0)
    .map(g => ({
      groupName: g.name,
      projectTitle: g.approvedTitle,
      evaluators: g.evaluators
    }));

  // Get defense schedules where the current user is an evaluator
  const advisorDefenseSchedules = defenseSchedules.filter(schedule => {
    return schedule.evaluators && schedule.evaluators.some(evaluator => evaluator.id === user?.id);
  });

  const [maxEvaluators, setMaxEvaluators] = useState(3);
  const [maxGroupsPerEvaluator, setMaxGroupsPerEvaluator] = useState(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignEvaluators = async () => {
    const limit = parseInt(maxEvaluators) || 1;
    const groupLimit = parseInt(maxGroupsPerEvaluator) || 5;

    if (advisors.length < limit) {
      toast.error(`Not enough active advisors. Need at least ${limit} to form a committee.`);
      return;
    }

    setIsAssigning(true);
    let assignedCount = 0;
    
    // Track current load to respect limits
    const advisorLoad = {};
    advisors.forEach(a => advisorLoad[a.id] = 0);
    groups.forEach(g => {
      g.evaluators?.forEach(e => {
        if (advisorLoad[e.id] !== undefined) advisorLoad[e.id]++;
      });
    });

    try {
      // Simulate a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process each eligible group
      eligibleGroups.forEach(group => {
        // Filter potential evaluators: Active advisors who are NOT the group's advisor AND not overloaded
        const candidates = advisors.filter(a => 
          a.id !== group.advisorId && 
          advisorLoad[a.id] < groupLimit
        );
        
        if (candidates.length >= limit) {
          // Randomly select evaluators
          const shuffled = [...candidates].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, limit);
          
          // Update loads
          selected.forEach(e => advisorLoad[e.id]++);
          
          // Prepare evaluator data
          const evaluatorData = selected.map(e => ({
            id: e.id,
            name: e.name,
            department: e.department
          }));

          // 1. Update Project Context (Persist Data)
          assignEvaluatorsToGroup(group.id, evaluatorData);
          
          assignedCount++;
        }
      });
      
      if (assignedCount > 0) {
        toast.success(`Successfully assigned evaluators to ${assignedCount} groups!`);
        setShowConfirmModal(false);
      } else {
        toast.error('Could not assign evaluators. Please check advisor availability.');
      }
    } catch (err) {
      console.error('Assignment error:', err);
      toast.error('An unexpected error occurred during assignment');
    } finally {

      setIsAssigning(false);
    }
  };

  const assignmentColumns = [
    { key: 'groupName', label: 'Group' },
    { key: 'department', label: 'Department', render: (_, row) => groups.find(g => g.name === row.groupName)?.department || '-' },
    { key: 'advisor', label: 'Advisor', render: (_, row) => users.find(u => u.id === groups.find(g => g.name === row.groupName)?.advisorId)?.name || '-' },
    { key: 'members', label: 'Members', render: (_, row) => groups.find(g => g.name === row.groupName)?.members?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '-'},
    { key: 'projectTitle', label: 'Project', render: (title) => (typeof title === 'object' ? title?.title : title) || 'N/A' },
    {
      key: 'evaluators',
      label: 'Assigned Evaluators',
      render: (evaluators) => (
        <div className="flex flex-wrap gap-1">
          {evaluators?.map((e, i) => (
            <span key={e.id || i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              {e.name}         
            </span>
          ))}
        </div>
      )
    }
  ];
  const advisorScheduleColumns = [
    {
      key: 'evaluators',
      label: 'Assigned Evaluators',
      render: (evaluators) => (
        <div className="flex flex-wrap gap-1">
          {evaluators?.map((e, i) => (
            <span key={e.id || i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              {e.name}
            </span>
          ))}
        </div>
      )
    },
    { key: 'groupName', label: 'Group', render: (_, row) => row.groupName || 'Unknown Group' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'venue', label: 'Venue' }
  ];

  const eligibleGroupColumns = [
    { key: 'name', label: 'Group Name' },
    { key: 'department', label: 'Department' },
    { 
      key: 'members', 
      label: 'Members',
      render: (memberIds) => (
        <div className="text-sm text-gray-600">
          {memberIds?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '-'}
        </div>
      )
    },
    {
      key: 'advisorId',
      label: 'Advisor',
      render: (advisorId) => {
        const advisor = users.find(u => u.id === advisorId);
        return advisor ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
              {advisor.name.charAt(0)}
            </div>
            <span className="text-sm text-gray-700">{advisor.name}</span>
          </div>
        ) : <span className="text-sm text-gray-400 italic">Unassigned</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluator Assignment</h1>
        <p className="text-gray-500">Automatically assign evaluators to project groups</p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Auto-Assignment Configuration</h2>
            <p className="text-sm text-gray-500">Configure evaluator assignment parameters</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Configuration</h3>
            <InputField
              label="Evaluators per Group"
              type="number"
              name="maxEvaluators"
              value={maxEvaluators}
              onChange={(e) => setMaxEvaluators(e.target.value)}
              min={1}
              max={5}
            />
            <div className="mt-4">
              <InputField
                label={`Max Groups per ${maxEvaluators} Advisor`}
                type="number"
                value={maxGroupsPerEvaluator}
                onChange={(e) => setMaxGroupsPerEvaluator(e.target.value)}
                min={1}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              System ensures evaluators are not the group's advisor.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Available Advisors:</span>
                <span className="font-medium">{advisors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Eligible Groups:</span>
                <span className="font-medium">{eligibleGroups.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Already Assigned:</span>
                <span className="font-medium">{currentAssignments.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Assign Evaluators</h3>
              <p className="text-sm text-gray-500 mb-4">
                Automatically assign evaluators to all eligible groups.
              </p>
            </div>
            <Button
              onClick={() => setShowConfirmModal(true)}
              icon={Play}
              disabled={eligibleGroups.length === 0 || advisors.length < maxEvaluators}
              fullWidth
            >
              Assign Evaluators
            </Button>
          </div>
        </div>
      </div>

        {/* Defense Schedules for Current Advisor */}
        {advisorDefenseSchedules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Defense Schedules</h2>
          <DataTable
            columns={advisorScheduleColumns}
            data={advisorDefenseSchedules}
          
          />
        </div>
      )}
      {/* Eligible Groups Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Eligible Groups for Assignment ({eligibleGroups.length})
        </h2>
        <p className="text-sm text-gray-500 mb-4">Groups that have an approved final draft (Advisor or Dept) but no evaluators assigned yet.</p>
        <DataTable
          columns={eligibleGroupColumns}
          data={eligibleGroups}
          searchable
          pageSize={5}
          emptyMessage="No groups currently eligible for evaluation."
        />
      </div>

      {/* Current Assignments */}
        {currentAssignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Current Assignments ({currentAssignments.length})
          </h2>
          <DataTable
            columns={assignmentColumns}
            data={currentAssignments}
            searchable
            pageSize={10}
          />
        </div>
      )}

      {/* Advisors List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Evaluators ({advisors.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {advisors.map((advisor) => (
            <div key={advisor.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{advisor.name}</h3>
              <p className="text-sm text-gray-500">{advisor.department}</p>
              <p className="text-sm text-gray-500">{advisor.email}</p>
            </div>
          ))}
        </div>
      </div>

        
      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Evaluator Assignment"
        onConfirm={handleAssignEvaluators}
        confirmText="Assign Evaluators"
        loading={isAssigning}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Assignment Summary</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {eligibleGroups.length} groups will receive evaluators</li>
              <li>• {maxEvaluators} evaluators per group</li>
              <li>• Max {maxGroupsPerEvaluator} groups per {maxEvaluators} advisor</li>
              <li>• Evaluators will be randomly assigned</li>
              <li>• Group advisors will be excluded from their own group</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Evaluators will be notified of their assignments automatically.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );

};

export default EvaluatorManager;