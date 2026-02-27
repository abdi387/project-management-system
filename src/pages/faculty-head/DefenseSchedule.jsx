// src/pages/faculty-head/DefenseSchedule.jsx
import React, { useState } from 'react';
import { Calendar, Download, Clock, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { generateDefenseSchedulePDF, downloadPDF } from '../../utils/pdfGenerator';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const DefenseSchedule = () => {
  const { users } = useAuth();
  const { groups, getDefenseSchedules, addDefenseSchedule, academicYear, venues: managedVenues } = useProject();
  const { notifyDefenseSchedule, notifyDefenseDuty, notifyDeptHeadDefenseScheduled } = useNotification();

  const allSchedules = getDefenseSchedules();
  // Filter schedules by the current semester. Assume schedules without a semester are from semester 1 for backward compatibility.
  const defenseSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);

  // Get groups ready for defense (evaluators assigned)
  const readyGroups = groups.filter(g => g.evaluators && g.evaluators.length > 0);
  const unscheduledGroups = readyGroups.filter(g => !defenseSchedules.find(s => s.groupId === g.id));

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
    startTime: '08:30',
    duration: 45,
    venues: managedVenues.slice(0, 2).map(v => v.name)
  });

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

  const handleAutoSchedule = async () => {
    // Filter groups that have evaluators assigned
    const validGroups = groups.filter(g => g.evaluators && g.evaluators.length > 0);

    // Filter groups that need scheduling
    const unscheduledGroups = validGroups.filter(g => !defenseSchedules.find(s => s.groupId === g.id));
    
    if (unscheduledGroups.length === 0) {
      toast.error('No eligible groups with assigned evaluators to schedule');
      return;
    }
    setLoading(true);
    try {
      // Track busy slots to prevent conflicts
      // Format: "YYYY-MM-DD-HH:MM"
      const evaluatorBusySlots = new Set(); 
      const venueBusySlots = new Set();

      // Helper to generate key
      const getSlotKey = (date, time) => `${date}-${time}`;

      // Helper to check availability
      const isSlotAvailable = (date, time, venue, evaluators) => {
        const slotKey = getSlotKey(date, time);
        
        // Check Venue
        if (venueBusySlots.has(`${venue}-${slotKey}`)) return false;

        // Check Evaluators
        if (evaluators && evaluators.length > 0) {
          for (const evaluator of evaluators) {
            if (evaluatorBusySlots.has(`${evaluator.id}-${slotKey}`)) return false;
          }
        }
        return true;
      };

      // Helper to mark slot as busy
      const markSlotBusy = (date, time, venue, evaluators) => {
        const slotKey = getSlotKey(date, time);
        venueBusySlots.add(`${venue}-${slotKey}`);
        
        if (evaluators && evaluators.length > 0) {
          evaluators.forEach(ev => evaluatorBusySlots.add(`${ev.id}-${slotKey}`));
        }
      };

      // Initialize scheduling cursor
      let currentDate = new Date(`${autoConfig.startDate}T${autoConfig.startTime}`);
      const duration = parseInt(autoConfig.duration);

      for (const group of unscheduledGroups) {
        let scheduled = false;
        let searchDate = new Date(currentDate); // Clone to search forward without moving global cursor too fast
        let attempts = 0;

        // Find next available slot (Round)
        while (!scheduled && attempts < 500) { // Safety break
          const dateStr = searchDate.toISOString().split('T')[0];
          const timeStr = searchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

          // Try all selected venues for this time slot
          for (const venue of autoConfig.venues) {
            if (isSlotAvailable(dateStr, timeStr, venue, group.evaluators)) {
              const title = group.approvedTitle;
              const projectTitle = (typeof title === 'object' && title !== null) ? title.title : title;
              // Found a slot!
              addDefenseSchedule({
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

              markSlotBusy(dateStr, timeStr, venue, group.evaluators);
              
              // Notifications
              group.members?.forEach(mId => notifyDefenseSchedule(mId, dateStr, timeStr, venue));
              group.evaluators?.forEach(ev => notifyDefenseDuty(ev.id, group.name, group.id, dateStr, timeStr, venue));
              notifyDeptHeadDefenseScheduled(group.department, group.name, dateStr, timeStr, venue);

              scheduled = true;
              break; // Break venue loop, move to next group
            }
          }

          if (!scheduled) {
            // Move to next time slot (Round)
            searchDate.setMinutes(searchDate.getMinutes() + duration);
            
            // If past 5 PM (17:00), move to next day 8:30 AM
            if (searchDate.getHours() >= 17) {
              searchDate.setDate(searchDate.getDate() + 1);
              const [h, m] = autoConfig.startTime.split(':');
              searchDate.setHours(parseInt(h), parseInt(m), 0, 0);
            }
          }
          attempts++;
        }
      }
      
      toast.success(`Automatically scheduled ${unscheduledGroups.length} defenses!`);
      setShowAutoModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const schedulesWithDetails = defenseSchedules.map(s => ({
      ...s,
      evaluators: s.evaluators?.map(e => e.name) || []
    }));
    
    const doc = generateDefenseSchedulePDF(schedulesWithDetails);
    downloadPDF(doc, `Defense_Schedule_${new Date().toISOString().split('T')[0]}`);
  };

  const columns = [
    { key: 'groupName', label: 'Group' },
    { 
      key: 'members', 
      label: 'Group Members',
      render: (_, row) => {
        const group = groups.find(g => g.id === row.groupId);
        return group?.members?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '-';
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
      render: (evaluators) => evaluators?.map(e => e.name).join(', ') || '-'
    }
  ];

  const pendingColumns = [
    { key: 'name', label: 'Group' },
    { key: 'approvedTitle', label: 'Project Title', render: (title) => (typeof title === 'object' ? title?.title : title) || 'N/A' },
    { key: 'department', label: 'Department' },
    { 
      key: 'evaluators', 
      label: 'Assigned Evaluators',
      render: (evaluators) => evaluators?.map(e => e.name).join(', ') || '-'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Defense Scheduling</h1>
          <p className="text-gray-500">Schedule and manage final project defenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportPDF} icon={Download}>
            Export PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowAutoModal(true)} icon={Sparkles}>
            Auto Schedule
          </Button>
        </div>
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
                  Notifications will be sent to all students and evaluators.
                </p>
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
        </div>
      </Modal>
    </div>
  );
};

export default DefenseSchedule;