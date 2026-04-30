import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, AlertTriangle, Calendar, ArrowRight, Info, Sparkles, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { academicService, groupService, userService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AcademicYearManager = () => {
  const { users } = useAuth();
  const { academicYear, refreshAcademicYear, systemSettings, refreshSettings } = useProtectedRoute();

  // Fetch groups for stats
  const { 
    data: groupsData,
    loading: groupsLoading 
  } = useFetch(() => academicYear?.id ? groupService.getGroups({ academicYearId: academicYear.id }) : Promise.resolve({ groups: [] }), [academicYear?.id]);

  const groups = groupsData?.groups || [];
  const settings = systemSettings || {};

  const [maxGroupsInput, setMaxGroupsInput] = useState(5);
  const [loading, setLoading] = useState(false);
  
  // Handle case where academicYear.current is null (e.g., initial setup)
  const getNextAcademicYear = (current) => {
    if (!current) return `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const [start, end] = current.split('/');
    return `${parseInt(start) + 1}/${parseInt(end) + 1}`;
  };

  const nextYearPrediction = academicYear?.current
    ? getNextAcademicYear(academicYear.current)
    : `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const isPendingSetup = academicYear?.status === 'pending_setup';
  const isActive = academicYear?.status === 'active';
  
  const defaultStartYear = nextYearPrediction?.split('/')[0] || new Date().getFullYear();
  const [startDateInput, setStartDateInput] = useState(`${defaultStartYear}-09-01`);
  const [yearName, setYearName] = useState('');

  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [targetSemester, setTargetSemester] = useState(null);
  const [showStartYearModal, setShowStartYearModal] = useState(false);

  // Update maxGroupsInput when settings load. Prefer the new key but fall back to the old one
  useEffect(() => {
    const value = settings.maximum_groups_per_advisor ?? settings.max_groups_per_advisor;
    if (value) {
      setMaxGroupsInput(parseInt(value));
    }
  }, [settings]);

  const handleUpdateSettings = async () => {
    if (maxGroupsInput < 1) {
      toast.error('Maximum groups must be at least 1');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating settings with value:', maxGroupsInput);
      // write to the canonical key used by backend; also update the legacy key for backwards compatibility
      const promises = [
        academicService.updateSystemSetting('maximum_groups_per_advisor', maxGroupsInput.toString()),
        academicService.updateSystemSetting('max_groups_per_advisor', maxGroupsInput.toString())
      ];
      const responses = await Promise.all(promises);
      console.log('Update responses:', responses);
      await refreshSettings(); // refresh context so new value is available everywhere
      toast.success('Advisor constraints updated successfully!');
    } catch (error) {
      console.error('Update settings error:', error);
      
      // More detailed error message
      if (error.error) {
        toast.error(error.error);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update settings. Please check your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetSemester = async () => {
    if (!targetSemester) return;

    setLoading(true);
    try {
      await academicService.switchSemester(targetSemester);
      const phase = targetSemester === 1 ? 'Documentation Phase' : 'Implementation Phase';
      toast.success(
        <div>
          <p className="font-bold">Switched to Semester {targetSemester}</p>
          <p className="text-sm opacity-90">{phase}</p>
        </div>,
        { duration: 5000 }
      );
      setShowSemesterModal(false);
      await refreshAcademicYear?.();
    } catch (error) {
      console.error('Switch semester error:', error);
      toast.error(error.error || 'Failed to switch semester');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewYear = async () => {
    if (!startDateInput || !yearName) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate year format
    if (!/^\d{4}\/\d{4}$/.test(yearName)) {
      toast.error('Year must be in format YYYY/YYYY (e.g., 2024/2025)');
      return;
    }

    setLoading(true);
    try {
      // Start the new academic year
      await academicService.startNewAcademicYear({
        yearName,
        startDate: startDateInput
      });
      toast.success(
        <div>
          <p className="font-bold">Academic Year {yearName} Started!</p>
          <p className="text-sm opacity-90">Semester 1 • Documentation Phase</p>
        </div>,
        { duration: 5000 }
      );
      setShowStartYearModal(false);
      setYearName('');
      setStartDateInput(`${defaultStartYear}-09-01`);
      await refreshAcademicYear?.();
    } catch (error) {
      console.error('Start new year error:', error);
      
      // More detailed error logging
      let errorMessage = 'Failed to start academic year';
      if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.log('Error details:', {
        error,
        errorMessage,
        errorType: typeof error
      });
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics - filtered by current semester
  const currentSemester = academicYear?.semester || '1';
  
  // Semester 2 includes all groups from the academic year (they continue from Sem 1)
  // Semester 1 only shows groups explicitly in semester 1
  const totalGroups = groups.filter(g => {
    if (currentSemester === '2') {
      // In Sem 2, include all groups from the academic year
      return true;
    }
    const groupSemester = g.semester?.toString() || '1';
    return groupSemester === '1';
  }).length;
  
  const completedProjects = groups.filter(g => {
    if (currentSemester === '2') {
      // In Sem 2, count completed from all groups
      return g.finalDraftStatus === 'fully-approved';
    }
    const groupSemester = g.semester?.toString() || '1';
    return groupSemester === '1' && g.finalDraftStatus === 'fully-approved';
  }).length;
  
  const inProgressGroups = groups.filter(g => {
    if (currentSemester === '2') {
      // In Sem 2, count in-progress from all groups
      return g.progressStatus === 'in-progress';
    }
    const groupSemester = g.semester?.toString() || '1';
    return groupSemester === '1' && g.progressStatus === 'in-progress';
  }).length;

  if (groupsLoading) {
    return <LoadingSpinner fullScreen text="Loading academic year settings..." />;
  }

  return (
    <div className="space-y-6">
      {/* Current Status Banner */}
      <div className={`rounded-xl p-6 mb-6 text-white shadow-lg ${
        isPendingSetup ? 'bg-gradient-to-r from-yellow-600 to-amber-600' :
        'bg-gradient-to-r from-teal-600 to-emerald-600'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              isPendingSetup ? 'bg-yellow-500' :
              'bg-teal-500'
            }`}>
              {isPendingSetup ? (
                <span className="text-2xl">⚙️</span>
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {isPendingSetup ? 'System Setup Pending' :
                 `Active: ${academicYear?.current}`}
              </h2>
              <p className="opacity-90 text-sm mt-1">
                {isPendingSetup ? 'Please set up the academic year to begin' :
                 `Semester ${academicYear?.semester} • Started ${academicYear?.startDate ? new Date(academicYear.startDate).toLocaleDateString() : 'N/A'}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advisor Constraints */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
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
              onChange={(e) => setMaxGroupsInput(parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
          <div className="self-end mb-4">
            <Button onClick={handleUpdateSettings} icon={Save} loading={loading}>
              Update
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Current setting: {settings.maximum_groups_per_advisor || settings.max_groups_per_advisor || 5} groups per advisor
        </p>
      </div>

      {/* Cycle Management Container */}
      {isPendingSetup ? (
        // STATE: PENDING_SETUP -> START NEW YEAR
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Start New Academic Year</h2>
              <p className="text-sm text-gray-500">
                The system is ready for initial setup. Please configure the new academic year.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 max-w-xl">
            <div className="space-y-4">
              <InputField
                label="Academic Year"
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                placeholder={nextYearPrediction}
                helperText="Format: YYYY/YYYY (e.g., 2024/2025)"
              />
              <InputField
                label="Start Date"
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowStartYearModal(true)}
                  icon={ArrowRight}
                  loading={loading}
                  disabled={!yearName || !startDateInput}
                >
                  Start Year & Semester 1
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This will initiate Academic Year <strong>{yearName || nextYearPrediction}</strong> and archive the previous year.
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
              <h2 className="text-lg font-semibold text-gray-900">Current Cycle: {academicYear?.current}</h2>
              <p className="text-sm text-gray-500">Manage the flow of the current academic year</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="text-center px-6 py-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Current Phase</p>
              <p className="text-4xl font-bold text-teal-600">Semester {academicYear?.semester}</p>
              <p className="text-sm text-gray-600 mt-2">
                {academicYear?.semester === '1' ? '📄 Documentation Phase' : '⚙️ Implementation Phase'}
              </p>
            </div>

            <div className="flex flex-col gap-3 border-l border-gray-200 pl-8">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={academicYear?.semester === '2'}
                  onClick={() => {
                    setTargetSemester(2);
                    setShowSemesterModal(true);
                  }}
                >
                  Switch to Semester 2
                </Button>
                {academicYear?.semester === '2' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setYearName(nextYearPrediction);
                      setShowStartYearModal(true);
                    }}
                    icon={Calendar}
                  >
                    Start New Academic Year
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 max-w-md">
                <strong>Flow:</strong> Semester 1 → Semester 2 → Start New Year. <br/>
                {academicYear?.semester === '2' 
                  ? 'You can now start a new academic year with Semester 1.'
                  : 'After Semester 2, you can start a new academic year.'
                }
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
                  <p className="font-medium text-yellow-800">Warning</p>
                  <p className="text-sm text-yellow-700">
                    This will restrict functionalities like proposal submission and project marketplace.
                    All users will be notified of the change.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Start New Year Modal */}
      <Modal
        isOpen={showStartYearModal}
        onClose={() => setShowStartYearModal(false)}
        title="Start New Academic Year"
        onConfirm={handleStartNewYear}
        confirmText="Start Year"
        loading={loading}
        disabled={!yearName || !startDateInput}
      >
        <div className="space-y-4">
          <InputField
            label="Academic Year"
            value={yearName}
            onChange={(e) => setYearName(e.target.value)}
            placeholder={nextYearPrediction}
            helperText="Format: YYYY/YYYY (e.g., 2024/2025)"
          />
          <InputField
            label="Start Date"
            type="date"
            value={startDateInput}
            onChange={(e) => setStartDateInput(e.target.value)}
          />
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">New Academic Year Summary</h4>
            <p className="text-sm text-blue-800">
              <strong>Year:</strong> {yearName || nextYearPrediction}<br />
              <strong>Start Date:</strong> {startDateInput ? new Date(startDateInput).toLocaleDateString() : 'Not set'}<br />
              <strong>Initial Semester:</strong> Semester 1 (Documentation Phase)
            </p>
          </div>
          {academicYear?.semester === '2' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">What happens:</p>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>• Previous academic year will be archived</li>
                    <li>• All students from previous year will be deactivated</li>
                    <li>• Fresh start with Semester 1 (Documentation Phase)</li>
                    <li>• Students can register and form new groups</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important</p>
                <p className="text-sm text-yellow-700">
                  Previous year data will be archived and no longer accessible for modifications.
                  {academicYear?.semester === '2' && ' All students from the previous year will need to re-register.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AcademicYearManager;