// src/pages/faculty-head/DefenseSchedule.jsx
import React, { useState } from 'react';
import { Calendar, Clock, Users, Sparkles, PlusCircle, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { generateFacultyDefenseSchedulePDF, downloadPDF } from '../../utils/pdfGenerator';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const DefenseSchedule = () => {
  const { users } = useAuth();
  const { groups, getDefenseSchedules, addDefenseSchedule, academicYear, venues: managedVenues, addVenue } = useProject();
  const { notifyDefenseSchedule, notifyDefenseDuty, notifyDeptHeadDefenseScheduled } = useNotification();

  const allSchedules = getDefenseSchedules();
  // Filter schedules by the current semester. Assume schedules without a semester are from semester 1 for backward compatibility.
  const defenseSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);

  // Get groups ready for defense (evaluators assigned)
  const readyGroups = groups.filter(g => 
    g.academicYear === academicYear.current && 
    g.evaluators && 
    g.evaluators.length > 0
  );
  const unscheduledGroups = readyGroups.filter(g => !defenseSchedules.find(s => s.groupId === g.id));

  // Calculate distinct evaluator panels (committees)
  const uniquePanelsCount = new Set(
    unscheduledGroups.map(g => g.evaluators?.map(e => e.id).sort().join('-')).filter(Boolean)
  ).size;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    groupId: '',
    date: '',
    time: '',
    venue: ''
  });
  const [autoConfig, setAutoConfig] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    duration: 45,
    venues: managedVenues.slice(0, 2).map(v => v.name)
  });
  const [newVenueName, setNewVenueName] = useState('');

  const venueOptions = managedVenues.map(v => ({ value: v.name, label: v.name }));

  const groupOptions = readyGroups.filter(g => !defenseSchedules.find(s => s.groupId === g.id)).map(g => ({
    value: g.id,
    label: `${g.name} - ${((typeof g.approvedTitle === 'object' && g.approvedTitle !== null) ? g.approvedTitle.title : g.approvedTitle) || 'No Title'}`
  }));

  const openScheduleModal = (group = null) => {
    setFormData({
      groupId: group ? group.id : '',
      date: '',
      time: '',
      venue: ''
    });
    setShowAddModal(true);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSchedule = async () => {
    if (!formData.groupId || !formData.date || !formData.time || !formData.venue) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const group = groups.find(g => g.id === formData.groupId && g.evaluators && g.evaluators.length > 0);
      const title = group?.approvedTitle;
      const projectTitle = (typeof title === 'object' && title !== null) ? title.title : title;
      
      addDefenseSchedule({
        ...formData,
        groupName: group?.name,
        projectTitle: projectTitle,
        department: group?.department,
        evaluators: group?.evaluators,
        semester: academicYear.semester
      });

      // Notify Students & Evaluators
      group?.members?.forEach(mId => notifyDefenseSchedule(mId, formData.date, formData.time, formData.venue));
      group?.evaluators?.forEach(ev => notifyDefenseDuty(ev.id, group.name, group.id, formData.date, formData.time, formData.venue));

      // Notify Dept Head
      notifyDeptHeadDefenseScheduled(group?.department, group?.name, formData.date, formData.time, formData.venue);

      toast.success('Defense schedule added successfully!');
      setShowAddModal(false);
      setFormData({ groupId: '', date: '', time: '', venue: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddVenue = () => {
    if (!newVenueName.trim()) return;
    const result = addVenue(newVenueName);
    if (result.success) {
      toast.success('Venue added successfully!');
      // Auto-select the new venue
      setAutoConfig(prev => ({
        ...prev,
        venues: [...prev.venues, newVenueName.trim()]
      }));
      setNewVenueName('');
    } else {
      toast.error(result.error);
    }
  };

  const handleAutoSchedule = async () => {
    // Filter groups that have evaluators assigned
    const validGroups = groups.filter(g => 
      g.academicYear === academicYear.current && 
      g.evaluators && 
      g.evaluators.length > 0
    );

    // Filter groups that need scheduling
    const unscheduledGroups = validGroups.filter(g => !defenseSchedules.find(s => s.groupId === g.id));
    
    if (unscheduledGroups.length === 0) {
      toast.error('No eligible groups with assigned evaluators to schedule');
      return;
    }
    setLoading(true);
    try {
      // 1. Group by Evaluator Panel to ensure joint evaluation consistency
      // Groups with the exact same evaluators are treated as a batch
      const panelGroups = {};
      unscheduledGroups.forEach(g => {
        const evaluatorIds = g.evaluators?.map(e => e.id).sort().join('-') || 'no-evaluators';
        if (!panelGroups[evaluatorIds]) {
          panelGroups[evaluatorIds] = {
            evaluators: g.evaluators,
            groups: []
          };
        }
        panelGroups[evaluatorIds].groups.push(g);
      });

      // Sort panels by size (descending) to handle largest blocks first
      const panels = Object.values(panelGroups).sort((a, b) => b.groups.length - a.groups.length);

      const scheduledData = [];
      const evaluatorBusySlots = new Set();
      const venueBusySlots = new Set();

      // Setup time boundaries
      let currentDate = new Date(autoConfig.startDate);
      const [startH, startM] = autoConfig.startTime.split(':').map(Number);
      
      // Ensure we start at the configured time
      currentDate.setHours(startH, startM, 0, 0);

      let groupsRemaining = unscheduledGroups.length;
      let safetyCounter = 0;
      const MAX_SLOTS_CHECK = 5000; // Safety break to prevent infinite loops

      const getKey = (date, time) => `${date}-${time}`;

      while (groupsRemaining > 0 && safetyCounter < MAX_SLOTS_CHECK) {
        // Define block boundaries for the current day
        const morningEnd = new Date(currentDate);
        morningEnd.setHours(12, 0, 0, 0); // End of morning block
        
        const afternoonStart = new Date(currentDate);
        afternoonStart.setHours(14, 0, 0, 0); // Start of afternoon block
        
        const afternoonEnd = new Date(currentDate);
        afternoonEnd.setHours(17, 0, 0, 0); // End of afternoon block

        // Current time checks
        const currentH = currentDate.getHours();
        let isMorning = currentH < 12;
        let isAfternoon = currentH >= 14 && currentH < 17;

        // Handle day transitions and breaks
        if (currentDate >= afternoonEnd) {
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(startH, startM, 0, 0);
          safetyCounter++;
          continue;
        }

        if (currentDate >= morningEnd && currentDate < afternoonStart) {
          // Move to afternoon block
          currentDate.setHours(14, 0, 0, 0);
          isAfternoon = true;
          isMorning = false;
        }

        // Calculate slot end
        const slotEndTime = new Date(currentDate.getTime() + autoConfig.duration * 60000);
        
        // Check if slot fits in current block
        const fitsMorning = isMorning && slotEndTime <= morningEnd;
        const fitsAfternoon = isAfternoon && slotEndTime <= afternoonEnd;

        if (!fitsMorning && !fitsAfternoon) {
          // Advance to next valid block
          if (isMorning) {
            currentDate.setHours(14, 0, 0, 0);
          } else {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(startH, startM, 0, 0);
          }
          safetyCounter++;
          continue;
        }

        // Attempt to schedule in this slot
        const dateStr = currentDate.toISOString().split('T')[0];
        const timeStr = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const slotKey = getKey(dateStr, timeStr);

        // Try to utilize ALL venues for this time slot
        for (const venue of autoConfig.venues) {
          if (venueBusySlots.has(`${venue}-${slotKey}`)) continue;

          // Find a panel that is free
          for (const panel of panels) {
            if (panel.groups.length === 0) continue;

            const evaluators = panel.evaluators || [];
            const isPanelFree = evaluators.every(e => !evaluatorBusySlots.has(`${e.id}-${slotKey}`));

            if (isPanelFree) {
              // Schedule group
              const group = panel.groups.shift();
              const title = group.approvedTitle;
              const projectTitle = (typeof title === 'object' && title !== null) ? title.title : title;

              scheduledData.push({
                groupId: group.id,
                groupName: group.name,
                projectTitle: projectTitle,
                department: group.department,
                date: dateStr,
                time: timeStr,
                venue: venue,
                evaluators: group.evaluators,
                semester: academicYear.semester
              });

              // Mark resources busy
              venueBusySlots.add(`${venue}-${slotKey}`);
              evaluators.forEach(e => evaluatorBusySlots.add(`${e.id}-${slotKey}`));
              
              groupsRemaining--;
              break; // Move to next venue
            }
          }
        }

        // Advance time
        currentDate = slotEndTime;
        safetyCounter++;
      }
      
      if (groupsRemaining > 0) {
        toast.error(
          "Unable to schedule all groups. Possible solutions: reduce the number of evaluators per group or add additional evaluators. Ensure advisors don't evaluate their own groups.",
          { duration: 6000 }
        );
        return;
      }

      // Commit schedules
      await new Promise(resolve => setTimeout(resolve, 500));
      
      scheduledData.forEach(s => {
        addDefenseSchedule(s);
        // Notifications
        const group = groups.find(g => g.id === s.groupId);
        group?.members?.forEach(mId => notifyDefenseSchedule(mId, s.date, s.time, s.venue));
        group?.evaluators?.forEach(ev => notifyDefenseDuty(ev.id, s.groupName, s.groupId, s.date, s.time, s.venue));
        notifyDeptHeadDefenseScheduled(s.department, s.groupName, s.date, s.time, s.venue);
      });

      toast.success(`Automatically scheduled ${scheduledData.length} defenses!`);
      setShowAutoModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = generateFacultyDefenseSchedulePDF(defenseSchedules, users, groups);
    downloadPDF(doc, `Faculty_Defense_Schedule_${new Date().toISOString().split('T')[0]}`);
  };

  const columns = [
    { key: 'groupName', label: 'Group' },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return users.find(u => u.id === group?.members?.[0])?.section || 'N/A';
      }
    },
    { 
      key: 'members', 
      label: 'Group Members',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        if (!group?.members || group.members.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {group.members.map(id => {
              const member = users.find(u => u.id === id);
              return member ? <span key={id}>{member.name}</span> : null;
            })}
          </div>
        );
      }
    },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'department', label: 'Department' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'time', label: 'Time' },
    { key: 'venue', label: 'Venue' },
    {
      key: 'evaluators',
      label: 'Evaluators',
      render: (evaluators) => {
        if (!evaluators || evaluators.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {evaluators.map(e => <span key={e.id || e.name}>{e.name}</span>)}
          </div>
        );
      }
    }
  ];

  const pendingColumns = [
    { key: 'name', label: 'Group' },
    {
      key: 'section',
      label: 'Section',
      render: (_, group) => {
        return users.find(u => u.id === group?.members?.[0])?.section || 'N/A';
      }
    },
    { key: 'approvedTitle', label: 'Project Title', render: (title) => (typeof title === 'object' ? title?.title : title) || 'N/A' },
    { key: 'department', label: 'Department' },
    { 
      key: 'evaluators', 
      label: 'Assigned Evaluators',
      render: (evaluators) => {
        if (!evaluators || evaluators.length === 0) return '-';
        return (
          <div className="flex flex-col">
            {evaluators.map(e => <span key={e.id || e.name}>{e.name}</span>)}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Defense Scheduling</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleExportPDF} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <Button variant="secondary" onClick={() => setShowAutoModal(true)} icon={Sparkles}>
              Auto Schedule
            </Button>
          </div>
        </div>
        <p className="text-gray-500 mt-1">Schedule and manage final project defenses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{defenseSchedules.length}</p>
              <p className="text-sm text-gray-500">Scheduled Defenses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{readyGroups.length - defenseSchedules.length}</p>
              <p className="text-sm text-gray-500">Groups Ready</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {readyGroups.length - defenseSchedules.length}
              </p>
              <p className="text-sm text-gray-500">Pending Schedule</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Scheduling Table */}
      {unscheduledGroups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Pending Scheduling</h2>
            <p className="text-sm text-gray-500">Groups with assigned evaluators waiting for defense dates</p>
          </div>
          <DataTable columns={pendingColumns} data={unscheduledGroups} pageSize={5} />
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Scheduled Defenses</h2>
        </div>
        <DataTable
          columns={columns}
          data={defenseSchedules}
          searchable
          pageSize={10}
          emptyMessage="No defense schedules yet"
        />
      </div>

      {/* Add Schedule Modal - Show only if there are groups with evaluators assigned */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Defense Schedule"
        onConfirm={handleAddSchedule}
        confirmText="Add Schedule"
        loading={loading}
      >
        
        <div className="space-y-4">
          <SelectDropdown
            label="Select Group"
            name="groupId"
            value={formData.groupId}
            onChange={handleChange}
            options={groupOptions}
            placeholder="Choose a group"
            required
          />
          
          <InputField
            label="Defense Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          
          <InputField
            label="Defense Time"
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
          
          <SelectDropdown
            label="Venue"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            options={venueOptions}
            placeholder="Select venue"
            required
          />
        </div>
      </Modal>

      {/* Auto Schedule Modal - Only show if there are groups with evaluators assigned */}
      <Modal
        isOpen={showAutoModal}
        onClose={() => setShowAutoModal(false)}
        title="Auto-Generate Schedules"
        onConfirm={handleAutoSchedule}
        confirmText="Generate Schedules"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Automated Scheduling</p>
                <p className="text-sm text-blue-800 mt-1">
                  This will automatically assign dates, times, and venues to all {readyGroups.length - defenseSchedules.length} unscheduled groups.
                </p>
                
                {/* Capacity Analysis */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-blue-800">Groups to Schedule:</span>
                    <span className="font-medium text-blue-900">{unscheduledGroups.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-blue-800">Distinct Evaluator Panels:</span>
                    <span className="font-medium text-blue-900">{uniquePanelsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">Selected Venues:</span>
                    <span className={`font-medium ${autoConfig.venues.length < uniquePanelsCount ? 'text-orange-600' : 'text-green-600'}`}>
                      {autoConfig.venues.length}
                    </span>
                  </div>
                  
                  {autoConfig.venues.length < uniquePanelsCount ? (
                    <div className="flex items-start gap-2 mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-100">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <p>
                        For optimal parallel scheduling, you need at least <strong>{uniquePanelsCount}</strong> venues. 
                        Current selection may require sequential slots, extending the total duration.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <p>Sufficient venues selected for full parallel evaluation.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <InputField
            label="Start Date"
            type="date"
            value={autoConfig.startDate}
            onChange={(e) => setAutoConfig({...autoConfig, startDate: e.target.value})}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Start Time"
              type="time"
              value={autoConfig.startTime}
              onChange={(e) => setAutoConfig({...autoConfig, startTime: e.target.value})}
              required
            />
            <InputField
              label="Duration (mins)"
              type="number"
              value={autoConfig.duration}
              onChange={(e) => setAutoConfig({...autoConfig, duration: e.target.value})}
              min="15"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Venues</label>
            <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {venueOptions.map((venue) => (
                <label key={venue.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfig.venues.includes(venue.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAutoConfig(prev => ({...prev, venues: [...prev.venues, venue.value]}));
                      } else {
                        setAutoConfig(prev => ({...prev, venues: prev.venues.filter(v => v !== venue.value)}));
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{venue.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select multiple venues to schedule concurrent defenses.</p>
          </div>

          {/* Quick Add Venue */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Need more venues?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                placeholder="Enter new venue name..."
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <Button type="button" size="sm" onClick={handleQuickAddVenue} icon={PlusCircle} disabled={!newVenueName.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DefenseSchedule;