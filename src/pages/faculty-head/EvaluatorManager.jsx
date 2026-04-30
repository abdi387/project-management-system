// src/pages/faculty-head/EvaluatorManager.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Play, AlertCircle, CheckCircle, XCircle, Info, AlertTriangle, Download, Users, Shield, Layers, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { groupService, userService, defenseService, notificationService, academicService, finalDraftService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import pdfService from '../../services/pdfService';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName } from '../../utils/sectionDisplay';

const EvaluatorManager = () => {
  const { user } = useAuth();
  
  // Fetch all users for PDF export
  const { 
    data: usersData, 
    loading: usersLoading 
  } = useFetch(() => userService.getUsers());
  
  // Fetch active academic year
  const { 
    data: activeYearData, 
    loading: activeYearLoading 
  } = useFetch(() => academicService.getCurrentAcademicYear(), []);
  const academicYear = activeYearData?.academicYear;

  // Fetch all advisors
  const { 
    data: advisorsData, 
    loading: advisorsLoading,
    refetch: refetchAdvisors
  } = useFetch(() => userService.getUsers({ role: 'advisor', status: 'active' }));

  // Fetch all groups
  const { 
    data: groupsData, 
    loading: groupsLoading,
    refetch: refetchGroups
  } = useFetch(() => {
    if (!academicYear?.id) return Promise.resolve({ groups: [] });
    return groupService.getGroups({ academicYearId: academicYear?.id });
  }, [academicYear?.id]);

  // Fetch sections to resolve section names
  const {
    data: sectionsData,
    loading: sectionsLoading
  } = useFetch(() => sectionService.getAllSections());

  const sectionNameMap = useMemo(
    () => {
      const sections = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || []);
      return buildSectionNameMap(sections);
    },
    [sectionsData]
  );

  // Fetch final drafts (approved and pending) from final_drafts table
  const { 
    data: draftsData, 
    loading: draftsLoading,
    refetch: refetchDrafts
  } = useFetch(() => {
    if (!academicYear?.id) return Promise.resolve({ drafts: [] });
    return finalDraftService.getFacultyHeadDrafts(academicYear?.id);
  }, [academicYear?.id]);

  const finalDrafts = draftsData?.drafts || [];

  const advisors = advisorsData?.users || [];
  const groups = groupsData?.groups || [];
  const users = usersData?.users || [];

  // Helper to replace section IDs in strings
  const sanitizeStr = useCallback((str) => {
    if (!str || !sectionNameMap) return str;
    let out = str;
    Object.entries(sectionNameMap).forEach(([id, name]) => {
      if (out.includes(id)) {
        out = out.split(id).join(name);
      }
    });
    return out;
  }, [sectionNameMap]);

  // Groups eligible for evaluator assignment
  const eligibleGroups = groups.filter(g => {
    const isReadyForEvaluators = g.finalDraftStatus === 'advisor-approved';
    const hasEvaluators = g.Evaluators && g.Evaluators.length > 0;
    return isReadyForEvaluators && !hasEvaluators;
  });

  const currentAssignments = useMemo(() => groups
    .filter(g => g.Evaluators && g.Evaluators.length > 0)
    .map(g => ({
      groupName: sanitizeStr(g.name || 'N/A'),
      department: g.department,
      projectTitle: (() => {
        if (!g.approvedTitle) return 'N/A';
        try {
          const parsed = typeof g.approvedTitle === 'string' ? JSON.parse(g.approvedTitle) : g.approvedTitle;
          return parsed.title || g.approvedTitle;
        } catch (e) {
          return g.approvedTitle;
        }
      })(),
      evaluators: g.Evaluators,
      groupId: g.id,
      members: g.Members || [],
      advisorName: g.Advisor?.name || '-'
    })), [groups, sectionNameMap]);

  const [maxEvaluators, setMaxEvaluators] = useState(3);
  const [maxGroupsPerPanel, setMaxGroupsPerPanel] = useState(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const assignedGroups = groups.filter(g => g.Evaluators && g.Evaluators.length > 0);
      if (assignedGroups.length === 0) {
        toast.error('No assignments to export');
        return;
      }
      // Sanitize the groups data for PDF export to resolve section names
      const sanitizedGroups = assignedGroups.map(g => ({
        ...g,
        name: sanitizeStr(g.name || 'N/A')
      }));

      const doc = pdfService.generateEvaluatorAssignmentsPDF(sanitizedGroups, users);
      const filename = `Evaluator_Assignments_${new Date().toISOString().split('T')[0]}`;
      pdfService.downloadPDF(doc, filename);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleAssignEvaluators = async () => {
    const panelSize = parseInt(maxEvaluators) || 1;
    const maxGroupsPerPanelValue = parseInt(maxGroupsPerPanel) || 5;

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

    if (eligibleGroups.length === 0) {
      setAssignmentResult({
        status: 'error',
        title: 'No Eligible Groups',
        message: 'There are no groups eligible for evaluator assignment.',
        details: [
          { label: 'Requirement', value: 'Groups need advisor-approved final drafts' }
        ],
        solutions: [
          'Wait for groups to complete their final drafts.',
          'Check if groups already have evaluators assigned.'
        ]
      });
      setShowResultModal(true);
      return;
    }

    setIsAssigning(true);
    let assignedCount = 0;
    const updates = [];
    const unassignedGroups = [];

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Shuffle eligible groups for random distribution
      const shuffledGroups = [...eligibleGroups].sort(() => 0.5 - Math.random());
      
      // Shuffle advisors for random panel formation
      const shuffledAdvisors = [...advisors].sort(() => 0.5 - Math.random());

      // Track evaluator load (how many groups each evaluator is assigned to)
      const evaluatorLoad = {};
      shuffledAdvisors.forEach(advisor => {
        evaluatorLoad[advisor.id] = 0;
      });

      const assignmentLog = [];

      for (const group of shuffledGroups) {
        // Get all advisors EXCEPT the group's own advisor (conflict of interest)
        // Also filter out evaluators who have reached their max group limit
        const availableEvaluators = shuffledAdvisors.filter(
          advisor => advisor.id !== group.advisorId && 
                     evaluatorLoad[advisor.id] < maxGroupsPerPanelValue
        );

        if (availableEvaluators.length < panelSize) {
          const maxLoadReached = availableEvaluators.filter(
            adv => evaluatorLoad[adv.id] >= maxGroupsPerPanelValue
          ).length;
          
          unassignedGroups.push({
            group,
            reason: `Not enough evaluators. Available: ${availableEvaluators.length}, Required: ${panelSize}. (Some evaluators reached max load of ${maxGroupsPerPanelValue} groups)`
          });
          continue;
        }

        // Select panelSize evaluators from available pool
        // Prioritize evaluators with lighter load for balanced distribution
        availableEvaluators.sort((a, b) => evaluatorLoad[a.id] - evaluatorLoad[b.id]);
        const selectedEvaluators = availableEvaluators.slice(0, panelSize);

        if (selectedEvaluators.length === panelSize) {
          const evaluatorData = selectedEvaluators.map(e => ({
            id: e.id,
            name: e.name,
            department: e.department
          }));
          
          updates.push({ groupId: group.id, evaluators: evaluatorData });
          assignedCount++;
          
          // Update evaluator load
          selectedEvaluators.forEach(e => {
            evaluatorLoad[e.id]++;
          });
          
          assignmentLog.push({
            groupName: sanitizeStr(group.name),
            evaluators: selectedEvaluators.map(e => e.name).join(', '),
            excludedAdvisor: group.Advisor?.name || 'N/A'
          });
        } else {
          unassignedGroups.push({
            group,
            reason: `Could not select ${panelSize} evaluators`
          });
        }
      }

      // Apply all assignments
      for (const update of updates) {
        try {
          const evaluatorIds = update.evaluators.map(e => e.id);
          await groupService.assignEvaluators(update.groupId, evaluatorIds);
        } catch (error) {
          console.error('Failed to assign evaluators to group:', update.groupId, error);
        }
      }

      await refetchGroups();
      await refetchAdvisors();

      // Calculate statistics
      const totalCapacity = Math.floor((advisors.length * maxGroupsPerPanelValue) / panelSize);
      const avgLoad = assignedCount > 0 
        ? (Object.values(evaluatorLoad).reduce((a, b) => a + b, 0) / advisors.length).toFixed(1)
        : 0;

      if (unassignedGroups.length > 0) {
        setAssignmentResult({
          status: 'warning',
          title: 'Assignment Incomplete',
          message: `Assigned ${assignedCount} groups, but ${unassignedGroups.length} groups could not be assigned.`,
          details: [
            { label: 'Total Groups', value: eligibleGroups.length },
            { label: 'Assigned', value: assignedCount },
            { label: 'Unassigned', value: unassignedGroups.length },
            { label: 'Evaluators per Group', value: panelSize },
            { label: 'Max Groups per Panel', value: maxGroupsPerPanelValue },
            { label: 'Available Advisors', value: advisors.length },
            { label: 'Avg Load per Evaluator', value: `${avgLoad} groups` }
          ],
          solutions: [
            unassignedGroups.some(u => u.reason.includes('Not enough evaluators'))
              ? `Increase "Max Groups per Panel" (currently ${maxGroupsPerPanelValue}) or add more advisors.`
              : 'Manually assign the remaining groups.',
            'Some groups could not be assigned due to advisor conflicts (advisor cannot evaluate their own group).'
          ],
          unassignedDetails: unassignedGroups.map(u => ({
            group: sanitizeStr(u.group.name),
            reason: u.reason
          }))
        });
        setShowResultModal(true);
      } else if (assignedCount > 0) {
        setAssignmentResult({
          status: 'success',
          title: 'Assignment Successful',
          message: `Successfully assigned evaluators to ${assignedCount} groups!`,
          details: [
            { label: 'Groups Assigned', value: assignedCount },
            { label: 'Evaluators per Group', value: panelSize },
            { label: 'Max Groups per Panel', value: maxGroupsPerPanelValue },
            { label: 'Total Evaluators Used', value: advisors.length },
            { label: 'Avg Load per Evaluator', value: `${avgLoad} groups` }
          ],
          assignmentLog
        });
        setShowResultModal(true);
        toast.success(`Evaluators assigned to ${assignedCount} groups!`);
      } else {
        toast.error('Could not assign any evaluators. Check advisor conflicts or capacity limits.');
      }

      setShowConfirmModal(false);
    } catch (err) {
      console.error('Assignment error:', err);
      toast.error('An unexpected error occurred during assignment');
    } finally {
      setIsAssigning(false);
    }
  };

  const assignmentColumns = [
    { key: 'groupName', label: 'Group' },
    { key: 'department', label: 'Department' },
    { 
      key: 'advisorName', 
      label: 'Advisor'
    },
    { 
      key: 'projectTitle', 
      label: 'Project', 
      render: (title) => title || 'N/A' 
    },
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

  const eligibleGroupColumns = [
    { key: 'name', label: 'Group Name', render: (_, row) => formatGroupDisplayName(row, sectionNameMap) },
    { key: 'department', label: 'Department' },
    {
      key: 'advisorId',
      label: 'Advisor',
      render: (_, group) => {
        const advisor = group?.Advisor;
        return advisor ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
              {advisor.name.charAt(0)}
            </div>
            <span className="text-sm text-gray-700">{advisor.name}</span>
          </div>
        ) : <span className="text-sm text-gray-400 italic">Unassigned</span>;
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, group) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Advisor Approved
        </span>
      )
    }
  ];

  // Columns for displaying final drafts from final_drafts table
  const draftColumns = [
    { 
      key: 'title', 
      label: 'Draft Title',
      render: (title, draft) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-xs text-gray-500">Group: {sanitizeStr(draft.Group?.name || 'N/A')}</span>
        </div>
      )
    },
    { key: 'department', label: 'Department', render: (_, draft) => draft.Group?.department || 'N/A' },
    { 
      key: 'advisor', 
      label: 'Advisor',
      render: (_, draft) => draft.Group?.Advisor?.name || 'N/A'
    },
    {
      key: 'advisorStatus',
      label: 'Status',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {status === 'approved' ? 'Approved' : 'Pending'}
        </span>
      )
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    }
  ];

  if (advisorsLoading || groupsLoading || activeYearLoading || usersLoading || draftsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading evaluator manager..." />;
  }

  return (
    <div className="space-y-6">
      {/* Stunning Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <Shield className="w-4 h-4" />
                <span>Faculty Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Evaluator Assignment</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
                Evaluator Assignment
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                disabled={currentAssignments.length === 0 || exportLoading}
                className="flex items-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                <Download className="w-5 h-5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration & Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Configuration</h2>
                <p className="text-sm text-white/80">Set evaluator parameters</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <InputField
              label="Evaluators per Group"
              type="number"
              name="maxEvaluators"
              value={maxEvaluators}
              onChange={(e) => setMaxEvaluators(parseInt(e.target.value) || 1)}
              min={1}
              max={5}
              helpText="Number of evaluators for each group (advisor excluded)"
            />
            <InputField
              label="Max Groups per Panel"
              type="number"
              value={maxGroupsPerPanel}
              onChange={(e) => setMaxGroupsPerPanel(parseInt(e.target.value) || 1)}
              min={1}
              max={20}
              helpText="Maximum groups each evaluator panel can handle"
            />
          </div>
        </div>

        {/* Card 2: Statistics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Statistics</h2>
                <p className="text-sm text-white/80">Current assignment metrics</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Available Advisors:</span>
              </div>
              <span className="font-bold text-lg text-gray-900">{advisors.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Eligible Groups:</span>
              </div>
              <span className="font-bold text-lg text-blue-600">{eligibleGroups.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Already Assigned:</span>
              </div>
              <span className="font-bold text-lg text-green-600">{currentAssignments.length}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Action */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 flex flex-col justify-between text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Play className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Assign Evaluators</h2>
            </div>
            <p className="text-sm text-blue-100 mb-4">
              Automatically assign evaluators to all {eligibleGroups.length} eligible groups based on your configuration.
            </p>
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={eligibleGroups.length === 0 || advisors.length < maxEvaluators}
            className="relative z-10 w-full px-6 py-3 bg-white text-blue-700 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-bold"
          >
            Run Assignment ({eligibleGroups.length})
          </button>
        </div>
      </div>

      {/* Eligible Groups for Assignment */}
      {eligibleGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Eligible Groups for Assignment</h2>
                  <p className="text-sm text-white/80 mt-0.5">{eligibleGroups.length} group{eligibleGroups.length !== 1 ? 's' : ''} waiting for evaluator assignment</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleGroups.map((group, index) => (
                <div
                  key={group.id}
                  className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">{sanitizeStr(group.name)}</h3>
                          <p className="text-xs text-white/80">{group.department}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-400/30 backdrop-blur-sm rounded-full">
                        <span className="text-xs font-medium text-white">Advisor Approved</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    {/* Advisor */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                        {group.Advisor?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Advisor</p>
                        <p className="text-sm font-medium text-gray-900">{group.Advisor?.name || 'Unassigned'}</p>
                      </div>
                    </div>

                    {/* Project Title */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Project Title</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {(() => {
                          if (!group.approvedTitle) return 'N/A';
                          try {
                            const parsed = typeof group.approvedTitle === 'string' ? JSON.parse(group.approvedTitle) : group.approvedTitle;
                            return parsed.title || group.approvedTitle;
                          } catch (e) {
                            return group.approvedTitle;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Assignments */}
      {currentAssignments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Current Assignments</h2>
                  <p className="text-sm text-white/80 mt-0.5">{currentAssignments.length} group{currentAssignments.length !== 1 ? 's' : ''} with assigned evaluators</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentAssignments.map((assignment, index) => (
                <div
                  key={assignment.groupId}
                  className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{assignment.groupName}</h3>
                          <p className="text-xs text-white/80">{assignment.department}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <span className="text-xs font-medium text-white">{assignment.evaluators?.length || 0} Evaluators</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    {/* Project Title */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Project Title</p>
                      <p className="text-sm text-gray-900 font-medium">{assignment.projectTitle}</p>
                    </div>

                    {/* Advisor */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 flex-shrink-0">
                        {assignment.advisorName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Advisor</p>
                        <p className="text-sm font-medium text-gray-900">{assignment.advisorName}</p>
                      </div>
                    </div>

                    {/* Evaluators */}
                    {assignment.evaluators && assignment.evaluators.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Assigned Evaluators ({assignment.evaluators.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {assignment.evaluators.map((evaluator, idx) => (
                            <span
                              key={evaluator.id || idx}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-sm font-medium text-gray-800 hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
                            >
                              {evaluator.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Evaluators */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Available Evaluators</h2>
                <p className="text-sm text-white/80 mt-0.5">{advisors.length} advisor{advisors.length !== 1 ? 's' : ''} available for assignment</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advisors.map((advisor) => (
              <div
                key={advisor.id}
                className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className="relative bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-4">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                      {advisor.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate">{advisor.name}</h3>
                      <p className="text-sm text-white/80 truncate">{advisor.department}</p>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-600 truncate">{advisor.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final Drafts Section */}
      {finalDrafts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Final Drafts</h2>
                  <p className="text-sm text-white/80 mt-0.5">{finalDrafts.length} draft{finalDrafts.length !== 1 ? 's' : ''} from final_drafts table</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finalDrafts.map((draft, index) => (
                <div
                  key={draft.id}
                  className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className={`relative px-5 py-4 ${
                    draft.advisorStatus === 'approved'
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  }`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{draft.title}</h3>
                            <p className="text-xs text-white/80">{sanitizeStr(draft.Group?.name || 'N/A')}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 ${
                        draft.advisorStatus === 'approved'
                          ? 'bg-green-400/30'
                          : 'bg-yellow-400/30'
                      } backdrop-blur-sm rounded-full`}>
                        <span className="text-xs font-medium text-white">
                          {draft.advisorStatus === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    {/* Department */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Department</p>
                      <p className="text-sm font-medium text-gray-900">{draft.Group?.department || 'N/A'}</p>
                    </div>

                    {/* Advisor */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                        {draft.Group?.Advisor?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Advisor</p>
                        <p className="text-sm font-medium text-gray-900">{draft.Group?.Advisor?.name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Submitted Date */}
                    {draft.submittedAt && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Submitted</p>
                        <p className="text-sm font-medium text-gray-900">{new Date(draft.submittedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <li>• {maxEvaluators} evaluators per group (advisor excluded)</li>
              <li>• Max {maxGroupsPerPanel} groups per evaluator panel</li>
              <li>• {advisors.length} available evaluators</li>
              <li>• Random distribution for fair load balancing</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Important Rules
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Advisors CANNOT evaluate their own supervised groups</li>
              <li>• Each group gets exactly {maxEvaluators} evaluators</li>
              <li>• Each evaluator can handle max {maxGroupsPerPanel} groups</li>
              <li>• Groups are assigned randomly to ensure fair distribution</li>
            </ul>
          </div>
        </div>
      </Modal>

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
              assignmentResult.status === 'error' ? 'bg-red-50 text-red-900' :
              assignmentResult.status === 'warning' ? 'bg-yellow-50 text-yellow-900' :
              'bg-green-50 text-green-900'
            }`}>
              {assignmentResult.status === 'error' ? (
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              ) : assignmentResult.status === 'warning' ? (
                <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
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
            {assignmentResult.unassignedDetails && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Unassigned Groups
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignmentResult.unassignedDetails.map((item, idx) => (
                    <div key={idx} className="text-sm text-red-800">
                      <span className="font-medium">{item.group}:</span> {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {assignmentResult.assignmentLog && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Assignment Details
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {assignmentResult.assignmentLog.map((item, idx) => (
                    <div key={idx} className="text-sm text-green-800 bg-white p-2 rounded">
                      <div className="font-medium">{item.groupName}</div>
                      <div className="text-xs text-gray-600">
                        Evaluators: {item.evaluators}
                      </div>
                      <div className="text-xs text-gray-500">
                        (Excluded advisor: {item.excludedAdvisor})
                      </div>
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
