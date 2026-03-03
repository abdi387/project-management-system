// src/pages/faculty-head/EvaluatorManager.jsx
import React, { useState } from 'react';
import { Settings, Play, AlertCircle, CheckCircle, XCircle, Info, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { generateEvaluatorAssignmentsPDF, downloadPDF } from '../../utils/pdfGenerator';
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
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const handleExportPDF = () => {
    const assignedGroups = groups.filter(g => g.evaluators && g.evaluators.length > 0);
    const doc = generateEvaluatorAssignmentsPDF(assignedGroups, users);
    downloadPDF(doc, `Evaluator_Assignments_${new Date().toISOString().split('T')[0]}`);
  };

  const handleAssignEvaluators = async () => {
    const panelSize = parseInt(maxEvaluators) || 1;
    const maxGroupsPerPanel = parseInt(maxGroupsPerEvaluator) || 5;

    if (advisors.length < panelSize) {
      setAssignmentResult({
        status: 'error',
        title: 'Insufficient Evaluators',
        message: `Cannot form evaluator panels with the current settings.`,
        details: [
          { label: 'Problem', value: `You need ${panelSize} evaluators per group, but only ${advisors.length} advisors are available.` },
          { label: 'Shortage', value: `${panelSize - advisors.length} more advisor(s) needed for a single panel.` }
        ],
        solutions: [
          'Add more advisors to the system.',
          `Reduce "Evaluators per Group" to ${advisors.length} or lower.`
        ]
      });
      setShowResultModal(true);
      return;
    }

    setIsAssigning(true);
    let assignedCount = 0;

    try {
      // Simulate a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // 1. Create Panels (Disjoint sets of evaluators)
      // Shuffle advisors to ensure randomness in panel formation
      const shuffledAdvisors = [...advisors].sort(() => 0.5 - Math.random());
      
      const panels = [];
      // Create chunks of advisors to form fixed panels
      for (let i = 0; i < shuffledAdvisors.length; i += panelSize) {
        const chunk = shuffledAdvisors.slice(i, i + panelSize);
        // Only use full panels to strictly adhere to "evaluators per group" setting
        if (chunk.length === panelSize) {
          panels.push({
            id: `panel-${i}`,
            members: chunk,
            assignedCount: 0
          });
        }
      }

      if (panels.length === 0) {
        setAssignmentResult({
          status: 'error',
          title: 'Panel Formation Failed',
          message: 'Could not form any valid evaluator panels.',
          details: [{ label: 'Reason', value: 'Advisors could not be grouped into panels of the required size.' }],
          solutions: ['Check advisor availability.', 'Try reducing panel size.']
        });
        setShowResultModal(true);
        setIsAssigning(false);
        return;
      }

      // 2. Assign Groups to Panels
      const updates = [];
      const unassignedGroups = [];

      eligibleGroups.forEach(group => {
        // Sort panels by load to distribute evenly
        panels.sort((a, b) => a.assignedCount - b.assignedCount);

        // Find a compatible panel
        const compatiblePanel = panels.find(panel => {
          const hasCapacity = panel.assignedCount < maxGroupsPerPanel;
          // Ensure no member of the panel is the advisor for this group
          const isConflict = panel.members.some(m => m.id === group.advisorId);
          return hasCapacity && !isConflict;
        });
        
        if (compatiblePanel) {
          const evaluatorData = compatiblePanel.members.map(e => ({
            id: e.id,
            name: e.name,
            department: e.department
          }));

          updates.push({ groupId: group.id, evaluators: evaluatorData });
          compatiblePanel.assignedCount++;
          assignedCount++;
        } else {
          unassignedGroups.push(group);
        }
      });

      // Apply updates
      updates.forEach(update => {
        assignEvaluatorsToGroup(update.groupId, update.evaluators);
      });
      
      if (unassignedGroups.length > 0) {
        const totalCapacity = panels.length * maxGroupsPerPanel;
        const requiredCapacity = eligibleGroups.length;
        const isCapacityIssue = totalCapacity < requiredCapacity;

        setAssignmentResult({
          status: 'warning',
          title: 'Assignment Incomplete',
          message: `Assigned ${assignedCount} groups, but ${unassignedGroups.length} groups could not be assigned.`,
          details: [
            { label: 'Panels Formed', value: panels.length },
            { label: 'Total Capacity', value: `${totalCapacity} groups` },
            { label: 'Required', value: `${requiredCapacity} groups` },
            { label: 'Reason', value: isCapacityIssue ? 'Insufficient Capacity' : 'Advisor Conflicts' }
          ],
          solutions: isCapacityIssue ? [
            'Increase "Max Groups per Panel".',
            'Add more advisors to create more panels.'
          ] : [
            'Some groups could not be assigned because their advisor is present in the available panels.',
            'Try shuffling again (randomness might help).',
            'Manually assign the remaining groups.'
          ]
        });
        setShowResultModal(true);
        setShowConfirmModal(false);
      } else if (assignedCount > 0) {
        toast.success(`Formed ${panels.length} panels and assigned to ${assignedCount} groups!`);
        setShowConfirmModal(false);
      } else {
        if (eligibleGroups.length === 0) {
          toast.info("No eligible groups to assign.");
          setShowConfirmModal(false);
        } else {
          toast.error('Could not assign evaluators. Check advisor conflicts or capacity limits.');
        }
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
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const group = groups.find(g => g.name === row.groupName);
        return users.find(u => u.id === group?.members?.[0])?.section || 'N/A';
      }
    },
    { key: 'department', label: 'Department', render: (_, row) => groups.find(g => g.name === row.groupName)?.department || '-' },
    { key: 'advisor', label: 'Advisor', render: (_, row) => users.find(u => u.id === groups.find(g => g.name === row.groupName)?.advisorId)?.name || '-' },
    { 
      key: 'members', 
      label: 'Members', 
      render: (_, row) => {
        const group = groups.find(g => g.name === row.groupName);
        const members = group?.members?.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
        if (!members || members.length === 0) return '-';
        return <div className="flex flex-col gap-1">{members.map((m, i) => <span key={i} className="text-xs">{m}</span>)}</div>;
      }
    },
    { key: 'projectTitle', label: 'Project', render: (title) => (typeof title === 'object' ? title?.title : title) || 'N/A' },
    {
      key: 'evaluators',
      label: 'Assigned Evaluators',
      render: (evaluators) => (
        <div className="flex flex-col gap-1">
          {evaluators?.map((e, i) => (
            <span key={e.id || i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs w-fit">
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
        <div className="flex flex-col gap-1">
          {evaluators?.map((e, i) => (
            <span key={e.id || i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs w-fit">
              {e.name}
            </span>
          ))}
        </div>
      )
    },
    { key: 'groupName', label: 'Group', render: (_, row) => row.groupName || 'Unknown Group' },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return users.find(u => u.id === group?.members?.[0])?.section || 'N/A';
      }
    },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'venue', label: 'Venue' }
  ];

  const eligibleGroupColumns = [
    { key: 'name', label: 'Group Name' },
    {
      key: 'section',
      label: 'Section',
      render: (_, group) => {
        return users.find(u => u.id === group?.members?.[0])?.section || 'N/A';
      }
    },
    { key: 'department', label: 'Department' },
    { 
      key: 'members', 
      label: 'Members',
      render: (memberIds) => {
        if (!memberIds || memberIds.length === 0) return '-';
        return (
          <div className="flex flex-col gap-1 text-sm text-gray-600">
            {memberIds.map(id => {
               const name = users.find(u => u.id === id)?.name;
               return name ? <span key={id}>{name}</span> : null;
            })}
          </div>
        );
      }
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Evaluator Assignment</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleExportPDF} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              Total Assigned: {currentAssignments.length}
            </span>
          </div>
        </div>
        <p className="text-gray-500 mt-1">Automatically assign evaluators to project groups</p>
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
                label={`Max Groups per Panel`}
                type="number"
                value={maxGroupsPerEvaluator}
                onChange={(e) => setMaxGroupsPerEvaluator(e.target.value)}
                min={1}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Evaluators are grouped into fixed panels. No intermingling.
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
              <li>• {eligibleGroups.length} groups waiting for assignment</li>
              <li>• Forming fixed panels of {maxEvaluators} evaluators</li>
              <li>• Approx. {Math.floor(advisors.length / (parseInt(maxEvaluators) || 1))} panels will be created</li>
              <li>• Max {maxGroupsPerEvaluator} groups per panel</li>
              <li>• Panels are disjoint (no intermingling)</li>
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

      {/* Result Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title={assignmentResult?.title || 'Assignment Result'}
        onConfirm={() => setShowResultModal(false)}
        confirmText="Close"
        showCancel={false}
      >
        {assignmentResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              assignmentResult.status === 'error' ? 'bg-red-50 text-red-900' : 'bg-yellow-50 text-yellow-900'
            }`}>
              {assignmentResult.status === 'error' ? (
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
              )}
              <div>
                <p className="font-medium">{assignmentResult.message}</p>
              </div>
            </div>

            {assignmentResult.details && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Analysis</h4>
                <div className="grid grid-cols-2 gap-2">
                  {assignmentResult.details.map((detail, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-gray-500">{detail.label}:</span>{' '}
                      <span className="font-medium text-gray-900">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignmentResult.solutions && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Suggested Actions
                </h4>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  {assignmentResult.solutions.map((sol, idx) => (
                    <li key={idx}>{sol}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );

};

export default EvaluatorManager;