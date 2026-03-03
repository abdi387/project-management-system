// src/pages/faculty-head/AcademicYearManager.jsx
import React, { useState } from 'react';
import { Settings, Save, Clock, AlertTriangle, PowerOff, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const AcademicYearManager = () => {
  const { users } = useAuth();
  const { academicYear, groups, proposals, projectSettings, updateMaxGroupsPerAdvisor, setSemester, archiveAdvisorSemesterData, terminateSemester, startNewAcademicYear, getNextAcademicYear } = useProject();

  const [maxGroupsInput, setMaxGroupsInput] = useState(projectSettings.maxGroupsPerAdvisor);
  const [loading, setLoading] = useState(false);
  // Handle case where academicYear.current is null (e.g., initial setup), which causes getNextAcademicYear to crash.
  const nextYearPrediction = academicYear.current
    ? getNextAcademicYear(academicYear.current)
    : `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const isPendingSetup = academicYear.status === 'pending_setup';
  const isTerminated = academicYear.status === 'terminated';
  const defaultStartYear = nextYearPrediction?.split('/')[0] || new Date().getFullYear();
  const [startDateInput, setStartDateInput] = useState(`${defaultStartYear}-09-01`);

  const handleUpdateSettings = () => {
    if (maxGroupsInput < 1) {
      toast.error('Maximum groups must be at least 1');
      return;
    }
    updateMaxGroupsPerAdvisor(parseInt(maxGroupsInput, 10));
    toast.success('Advisor constraints updated successfully!');
  };

  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [targetSemester, setTargetSemester] = useState(null);
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  const archiveData = () => {
    const currentRepository = JSON.parse(localStorage.getItem('fypRepository') || '[]');
    
    const groupsToArchive = groups.filter(g => g.academicYear === academicYear.current);

    const newArchives = groupsToArchive.map(group => {
      const approvedProposal = proposals?.find(p => p.groupId === group.id && p.status === 'approved');
      // Prioritize title from the approved proposal, fall back to the one on the group object
      const titleSource = approvedProposal?.approvedTitle || group.approvedTitle;

      let extractedTitle;
      if (typeof titleSource === 'object' && titleSource !== null) {
        extractedTitle = titleSource.title;
      } else {
        extractedTitle = titleSource;
      }

      const projectTitle = (typeof extractedTitle === 'string' && extractedTitle.trim() !== '') ? extractedTitle : 'Untitled Project';

      return {
        id: `${academicYear.current}-S${academicYear.semester}-${group.id}`,
        originalGroupId: group.id,
        academicYear: academicYear.current,
        semester: academicYear.semester,
        department: group.department,
        groupName: group.name,
        projectTitle: projectTitle,
        members: group.members.map(mId => users.find(u => u.id === mId)?.name).filter(Boolean).join(', '),
        advisor: users.find(u => u.id === group.advisorId)?.name || 'Unassigned',
        evaluators: group.evaluators ? group.evaluators.map(e => e.name).join(', ') : 'None',
        status: (group.finalDraftStatus === 'fully-approved' || group.finalDraftStatus === 'advisor-approved') ? 'Completed' : 'Incomplete',
        archivedAt: new Date().toISOString()
      };
    });

    // Filter out duplicates to be safe
    const existingIds = new Set(currentRepository.map(item => item.id));
    const uniqueNewArchives = newArchives.filter(item => !existingIds.has(item.id));

    localStorage.setItem('fypRepository', JSON.stringify([...currentRepository, ...uniqueNewArchives]));
  };

  const handleSetSemester = () => {
    if (!targetSemester) return;
    setLoading(true);
    try {
      archiveData();
      archiveAdvisorSemesterData();
      setSemester(targetSemester);
      const phase = targetSemester === 1 ? 'Documentation Phase' : 'Implementation Phase';
      toast.success(`Successfully switched to Semester ${targetSemester} (${phase}). Notifications have been sent to all users.`);
      setShowSemesterModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSemester = () => {
    setLoading(true);
    try {
      // 1. Archive current projects (Semester 2 usually)
      archiveData();
      // archiveAdvisorSemesterData is called internally by terminateSemester

      // 2. Terminate Semester
      terminateSemester();
      toast.success('Semester terminated successfully! System is now read-only for other roles.');
      setShowTerminateModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewYear = () => {
    if (!startDateInput) {
      toast.error('Please select a start date');
      return;
    }
    const year = parseInt(startDateInput.split('-')[0]);
    const newYearString = `${year}/${year + 1}`;

    setLoading(true);
    try {
      startNewAcademicYear(newYearString);
      toast.success(`Academic Year ${newYearString} Started!`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academic Cycle Management</h1>
        <p className="text-gray-500">Manage academic years, semesters, and advisor constraints</p>
      </div>

      {/* Advisor Constraints */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Advisor Constraints</h2>
            <p className="text-sm text-gray-500">Set global limits for project advisors</p>
          </div>
        </div>

        <div className="flex items-end gap-4 max-w-md">
          <div className="flex-1">
            <InputField
              label="Max Groups per Advisor"
              type="number"
              value={maxGroupsInput || ''}
              onChange={(e) => setMaxGroupsInput(e.target.value)}
              min="1"
            />
          </div>
          <div className="self-end mb-4">
            <Button onClick={handleUpdateSettings} icon={Save}>Update</Button>
          </div>
        </div>
      </div>

      {/* Cycle Management Container */}
      {isTerminated || isPendingSetup ? (
        // STATE: TERMINATED or PENDING_SETUP -> START NEW YEAR
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Start New Academic Year</h2>
              <p className="text-sm text-gray-500">
                {isPendingSetup
                  ? "The system has been reset. Please set up the first academic year."
                  : "The previous cycle has ended. Initialize the new academic year."
                }
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 max-w-xl">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <InputField
                  label="Academic Year Start Date"
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <Button onClick={handleStartNewYear} icon={ArrowRight} loading={loading}>
                  Start Year & Semester 1
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This will initiate Academic Year <strong>{startDateInput ? `${parseInt(startDateInput.split('-')[0])}/${parseInt(startDateInput.split('-')[0]) + 1}` : '...'}</strong> and archive the previous year.
            </p>
          </div>
        </div>
      ) : (
        // STATE: ACTIVE -> SEMESTER MANAGEMENT
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Clock className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Cycle: {academicYear.current}</h2>
              <p className="text-sm text-gray-500">Manage the flow of the current academic year</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center px-6 py-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Current Phase</p>
              <p className="text-4xl font-bold text-teal-600">Semester {academicYear.semester}</p>
            </div>

            <div className="flex flex-col gap-3 border-l border-gray-200 pl-8">
              <div className="flex items-center gap-3">
                <Button variant="outline" disabled={academicYear.semester === 2} onClick={() => { setTargetSemester(2); setShowSemesterModal(true); }}>
                  Switch to Semester 2
                </Button>
                <Button
                  variant="danger"
                  disabled={academicYear.semester !== 2}
                  onClick={() => setShowTerminateModal(true)}
                  icon={PowerOff}
                >
                  Semester Termination
                </Button>
              </div>
              <p className="text-xs text-gray-500 max-w-md">
                <strong>Flow:</strong> Semester 1 → Semester 2 → Termination. <br/>
                Termination will close the current cycle and allow starting a new year.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Semester Change Modal */}
      <Modal
        isOpen={showSemesterModal}
        onClose={() => setShowSemesterModal(false)}
        title={`Confirm Switch to Semester ${targetSemester}`}
        onConfirm={handleSetSemester}
        confirmText="Confirm Switch"
        loading={loading}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to switch the system to <strong>Semester {targetSemester}</strong>?
          </p>
          {targetSemester === 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    This will restrict functionalities like proposal submission and project marketplace. 
                    All users will be notified of the change.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Semester Termination Modal */}
      <Modal
        isOpen={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        title="Confirm Semester Termination"
        onConfirm={handleTerminateSemester}
        confirmText="Yes, Terminate Semester"
        confirmVariant="danger"
        loading={loading}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to terminate the semester? This will put the system into a <strong>read-only state</strong> for all students, advisors, and department heads.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">This action is irreversible.</p>
                <p className="text-sm text-red-700 mt-1">Users will only be able to view their data and manage their profiles. All other functionalities like submissions, approvals, and scheduling will be disabled.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AcademicYearManager;