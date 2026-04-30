const { DefenseSchedule, Group, User, Venue, AcademicYear, Evaluator } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { notifyDefenseSchedule, notifyDeptHeadDefenseScheduled, notifyDefenseDuty } = require('./notificationController');

// Safe attributes to select from Group model
const SAFE_GROUP_ATTRIBUTES = [
  'id', 'name', 'department', 'leaderId', 'advisorId', 
  'academicYearId', 'proposalStatus', 'approvedTitle', 
  'progressStatus', 'finalDraftStatus', 'createdAt', 'updatedAt'
];

// @desc    Create defense schedule
// @route   POST /api/defense
// @access  Private/Faculty-Head
const createDefenseSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { groupId, date, time, venueId } = req.body;

    // Verify group exists
    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'Evaluators',
          through: { attributes: [] }
        }
      ],
      transaction
    });

    if (!group) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Group not found' 
      });
    }

    // Check if group has evaluators
    if (!group.Evaluators || group.Evaluators.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Group must have evaluators assigned before scheduling defense' 
      });
    }

    // Check if final draft is approved by at least the advisor
    if (group.finalDraftStatus !== 'fully-approved' && group.finalDraftStatus !== 'advisor-approved') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Final draft must be approved by advisor before scheduling defense' 
      });
    }

    // Verify venue exists
    const venue = await Venue.findByPk(venueId, { transaction });
    if (!venue) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Venue not found' 
      });
    }

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' },
      transaction
    });

    if (!activeYear) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'No active academic year' 
      });
    }

    // Check if schedule already exists
    const existingSchedule = await DefenseSchedule.findOne({
      where: {
        groupId,
        academicYearId: activeYear.id
      },
      transaction
    });

    if (existingSchedule) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Defense already scheduled for this group' 
      });
    }

    // Check for evaluator conflicts
    const evaluatorIds = group.Evaluators.map(e => e.id);
    if (evaluatorIds.length > 0) {
      // Find all groups that share at least one evaluator with the current group
      const conflictingGroups = await Group.findAll({
        attributes: ['id'],
        include: [{
          model: User,
          as: 'Evaluators',
          where: { id: { [Op.in]: evaluatorIds } },
          attributes: [] // No need for User attributes
        }],
        transaction
      });
      const conflictingGroupIds = conflictingGroups.map(g => g.id);

      // Check if any of these conflicting groups have a schedule at the same time
      const scheduleConflict = await DefenseSchedule.findOne({
        where: {
          date,
          time,
          groupId: { [Op.in]: conflictingGroupIds }
        },
        transaction
      });

      if (scheduleConflict) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: `An evaluator for this group is already busy at ${time} on ${date}` });
      }
    }

    // Check venue availability
    const venueConflict = await DefenseSchedule.findOne({
      where: {
        venueId,
        date,
        time
      },
      transaction
    });

    if (venueConflict) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Venue is already booked for this date and time' 
      });
    }

    // Create schedule
    const schedule = await DefenseSchedule.create({
      groupId,
      academicYearId: activeYear.id,
      semester: activeYear.semester,
      date,
      time,
      venueId
    }, { transaction });

    await transaction.commit();

    // Fetch complete schedule with relations
    const completeSchedule = await DefenseSchedule.findByPk(schedule.id, {
      include: [
        {
          model: Group,
          as: 'Group',
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'studentId'],
              through: { attributes: [] }
            },
            {
              model: User,
              as: 'Evaluators',
              attributes: ['id', 'name', 'email'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: Venue,
          as: 'Venue',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Defense scheduled successfully',
      schedule: completeSchedule
    });
  } catch (error) {
    // Check if the transaction has already been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error('Create defense schedule error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get all defense schedules
// @route   GET /api/defense
// @access  Private
const getDefenseSchedules = async (req, res) => {
  try {
    const { department, semester } = req.query;

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    const where = {};
    if (activeYear) where.academicYearId = activeYear.id;
    if (semester) where.semester = semester;

    const schedules = await DefenseSchedule.findAll({
      where,
      include: [
        {
          model: Group,
          as: 'Group',
          where: department ? { department } : {},
          attributes: ['id', 'name', 'department', 'approvedTitle'],
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'studentId', 'section'],
              through: { attributes: [] }
            },
            {
              model: User,
              as: 'Evaluators',
              attributes: ['id', 'name', 'email'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: Venue,
          as: 'Venue',
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    // Format response
    const formattedSchedules = schedules.map(s => {
      let projectTitle = 'N/A';
      if (s.Group.approvedTitle) {
        try {
          const parsed = typeof s.Group.approvedTitle === 'string' ? JSON.parse(s.Group.approvedTitle) : s.Group.approvedTitle;
          projectTitle = parsed.title || s.Group.approvedTitle;
        } catch (e) {
          projectTitle = s.Group.approvedTitle; // Fallback to raw string if JSON parsing fails
        }
      }

      return {
        id: s.id,
        groupId: s.groupId,
        academicYearId: s.academicYearId,
        semester: s.semester,
        groupName: s.Group.name,
        department: s.Group.department,
        projectTitle,
        members: s.Group.Members,
        evaluators: s.Group.Evaluators,
        date: s.date,
        time: s.time,
        venue: s.Venue.name
      };
    });

    res.json({
      success: true,
      count: formattedSchedules.length,
      schedules: formattedSchedules
    });
  } catch (error) {
    console.error('Get defense schedules error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get defense schedule by group ID
// @route   GET /api/defense/group/:groupId
// @access  Private
const getDefenseScheduleByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    const schedule = await DefenseSchedule.findOne({
      where: {
        groupId,
        academicYearId: activeYear?.id,
        semester: activeYear?.semester
      },
      include: [
        {
          model: Group,
          as: 'Group',
          attributes: ['id', 'name', 'approvedTitle'],
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'studentId'],
              through: { attributes: [] }
            },
            {
              model: User,
              as: 'Evaluators',
              attributes: ['id', 'name', 'email'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: Venue,
          as: 'Venue',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'No defense schedule found for this group'
      });
    }

    // Format response
    const formattedSchedule = {
      id: schedule.id,
      groupId: schedule.groupId,
      academicYearId: schedule.academicYearId,
      semester: schedule.semester,
      groupName: schedule.Group.name,
      projectTitle: schedule.Group.approvedTitle ?
        (typeof schedule.Group.approvedTitle === 'string' ?
          JSON.parse(schedule.Group.approvedTitle).title :
          schedule.Group.approvedTitle.title) : 'N/A',
      members: schedule.Group.Members,
      evaluators: schedule.Group.Evaluators,
      date: schedule.date,
      time: schedule.time,
      venue: schedule.Venue.name
    };

    res.json({
      success: true,
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Get defense schedule by group error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Update defense schedule
// @route   PUT /api/defense/:id
// @access  Private/Faculty-Head
const updateDefenseSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { date, time, venueId } = req.body;
    const scheduleId = req.params.id;

    const schedule = await DefenseSchedule.findByPk(scheduleId, {
      transaction
    });

    if (!schedule) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Defense schedule not found' 
      });
    }

    // Check venue availability if changing venue/date/time
    if (venueId && (venueId !== schedule.venueId || date !== schedule.date || time !== schedule.time)) {
      const venueConflict = await DefenseSchedule.findOne({
        where: {
          venueId,
          date: date || schedule.date,
          time: time || schedule.time,
          id: { [Op.ne]: scheduleId }
        },
        transaction
      });

      if (venueConflict) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'Venue is already booked for this date and time' 
        });
      }
    }

    // Update fields
    if (date) schedule.date = date;
    if (time) schedule.time = time;
    if (venueId) schedule.venueId = venueId;

    await schedule.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Defense schedule updated successfully',
      schedule
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update defense schedule error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Delete defense schedule
// @route   DELETE /api/defense/:id
// @access  Private/Faculty-Head
const deleteDefenseSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const scheduleId = req.params.id;

    const schedule = await DefenseSchedule.findByPk(scheduleId, {
      transaction
    });

    if (!schedule) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Defense schedule not found' 
      });
    }

    await schedule.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Defense schedule deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete defense schedule error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Automatically generate defense schedules
// @route   POST /api/defense/generate
// @access  Private/Faculty-Head
const generateDefenseSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { startDate, startTime, duration, venueIds, groupIds } = req.body;

    if (!startDate || !startTime || !duration || !venueIds || venueIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Missing required scheduling parameters.' });
    }

    // Always get active academic year (needed for creating schedules)
    const activeYear = await AcademicYear.findOne({ where: { status: 'active' }, transaction });
    if (!activeYear) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'No active academic year found.' });
    }

    // If groupIds are provided (from frontend filtering), use them directly
    // Otherwise, fall back to backend filtering (legacy behavior)
    let unscheduledGroups = [];
    
    if (groupIds && groupIds.length > 0) {
      // Frontend already filtered by semester, just fetch these groups
      unscheduledGroups = await Group.findAll({
        where: { id: groupIds },
        attributes: SAFE_GROUP_ATTRIBUTES,
        include: [
          { model: User, as: 'Evaluators', through: { attributes: [] } },
          { model: User, as: 'Members', attributes: ['id', 'name'], through: { attributes: [] } }
        ],
        transaction
      });

      if (unscheduledGroups.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: 'No groups found with provided IDs.' });
      }
    } else {
      // Legacy behavior - filter by finalDraftStatus (for backward compatibility)
      const scheduledGroupIds = (await DefenseSchedule.findAll({
        attributes: ['groupId'],
        where: { academicYearId: activeYear.id },
        transaction
      })).map(s => s.groupId);

      const readyGroups = await Group.findAll({
        where: {
          academicYearId: activeYear.id,
          finalDraftStatus: { [Op.in]: ['advisor-approved', 'fully-approved'] },
          id: { [Op.notIn]: scheduledGroupIds }
        },
        attributes: SAFE_GROUP_ATTRIBUTES,
        include: [
          { model: User, as: 'Evaluators', through: { attributes: [] } },
          { model: User, as: 'Members', attributes: ['id', 'name'], through: { attributes: [] } }
        ],
        transaction
      });

      unscheduledGroups = readyGroups.filter(g => g.Evaluators && g.Evaluators.length > 0);

      if (unscheduledGroups.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: 'No eligible groups to schedule.' });
      }
    }
    
    const venues = await Venue.findAll({ where: { id: { [Op.in]: venueIds } }, transaction });
    if(venues.length !== venueIds.length) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: 'One or more venues not found.' });
    }

    // Scheduling Algorithm
    const panelGroups = {};
    unscheduledGroups.forEach(g => {
      const evaluatorIds = g.Evaluators.map(e => e.id).sort().join('-');
      if (!panelGroups[evaluatorIds]) {
        panelGroups[evaluatorIds] = { evaluators: g.Evaluators, groups: [] };
      }
      panelGroups[evaluatorIds].groups.push(g);
    });

    const panels = Object.values(panelGroups).sort((a, b) => b.groups.length - a.groups.length);
    const schedulesToCreate = [];
    const evaluatorBusySlots = new Set();
    const venueBusySlots = new Set();

    let currentDate = new Date(startDate);
    const [startH, startM] = startTime.split(':').map(Number);
    currentDate.setHours(startH, startM, 0, 0);

    let groupsRemaining = unscheduledGroups.length;
    let safetyCounter = 0;
    const MAX_SLOTS_CHECK = 5000;

    const getKey = (date, time) => `${date.toISOString().split('T')[0]}-${time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    while (groupsRemaining > 0 && safetyCounter < MAX_SLOTS_CHECK) {
      const morningEnd = new Date(currentDate).setHours(12, 0, 0, 0);
      const afternoonStart = new Date(currentDate).setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(currentDate).setHours(17, 0, 0, 0);

      if (currentDate.getTime() >= afternoonEnd) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(startH, startM, 0, 0);
        safetyCounter++;
        continue;
      }

      if (currentDate.getTime() >= morningEnd && currentDate.getTime() < afternoonStart) {
        currentDate.setHours(14, 0, 0, 0);
      }

      const slotEndTime = new Date(currentDate.getTime() + duration * 60000);

      if ((currentDate.getTime() < afternoonStart && slotEndTime.getTime() > morningEnd) || (slotEndTime.getTime() > afternoonEnd)) {
          if (currentDate.getTime() < afternoonStart) {
            currentDate.setHours(14, 0, 0, 0);
          } else {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(startH, startM, 0, 0);
          }
          safetyCounter++;
          continue;
      }

      const slotKey = getKey(currentDate, currentDate);

      for (const venue of venues) {
        if (venueBusySlots.has(`${venue.id}-${slotKey}`)) continue;

        for (const panel of panels) {
          if (panel.groups.length === 0) continue;
          
          const isPanelFree = panel.evaluators.every(e => !evaluatorBusySlots.has(`${e.id}-${slotKey}`));

          if (isPanelFree) {
            const group = panel.groups.shift();
            schedulesToCreate.push({
              groupId: group.id,
              academicYearId: activeYear.id,
              semester: activeYear.semester,
              date: new Date(currentDate).toISOString().split('T')[0],
              time: new Date(currentDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              venueId: venue.id,
            });

            venueBusySlots.add(`${venue.id}-${slotKey}`);
            panel.evaluators.forEach(e => evaluatorBusySlots.add(`${e.id}-${slotKey}`));
            groupsRemaining--;
            break;
          }
        }
      }
      currentDate = slotEndTime;
      safetyCounter++;
    }

    if (groupsRemaining > 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: `Could not schedule all groups. Only ${schedulesToCreate.length} of ${unscheduledGroups.length} could be scheduled. Try adjusting parameters.` });
    }

    const createdSchedules = await DefenseSchedule.bulkCreate(schedulesToCreate, { transaction, returning: true });

    // Commit transaction FIRST before sending emails
    await transaction.commit();

    // Send notifications asynchronously (don't block the response)
    // Wrap in setImmediate to avoid blocking the response
    setImmediate(async () => {
      try {
        // Get all unique group IDs and fetch their details with venues and evaluators
        const scheduleGroupIds = createdSchedules.map(s => s.groupId);
        const groups = await Group.findAll({
          where: { id: scheduleGroupIds },
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'Evaluators',
              through: { attributes: [] },
              attributes: ['id', 'name', 'email']
            }
          ]
        });

        // Get venue names
        const scheduleVenueIds = [...new Set(createdSchedules.map(s => s.venueId))];
        const venuesList = await Venue.findAll({
          where: { id: scheduleVenueIds },
          attributes: ['id', 'name']
        });
        const venueMap = {};
        venuesList.forEach(v => { venueMap[v.id] = v.name; });

        // Get department heads for each department with email
        const departments = [...new Set(groups.map(g => g.department))];
        const deptHeadsByDept = {};
        const deptHeads = await User.findAll({
          where: {
            role: 'dept-head',
            department: { [Op.in]: departments },
            status: 'active'
          },
          attributes: ['id', 'name', 'email', 'department']
        });
        deptHeads.forEach(dh => {
          if (!deptHeadsByDept[dh.department]) {
            deptHeadsByDept[dh.department] = [];
          }
          deptHeadsByDept[dh.department].push(dh);
        });

        // Track notifications sent
        const notifiedGroups = new Set();
        const notifiedDepts = new Set();
        const notifiedEvaluators = new Set();

        // Send notifications for each schedule
        for (const schedule of createdSchedules) {
          const group = groups.find(g => g.id === schedule.groupId);
          if (!group) continue;

          const venueName = venueMap[schedule.venueId] || 'TBD';
          const memberIds = group.Members?.map(m => m.id) || [];
          const evaluators = group.Evaluators || [];

          // Notify group members (only once per group)
          if (memberIds.length > 0 && !notifiedGroups.has(group.id)) {
            try {
              await notifyDefenseSchedule(
                group,
                memberIds,
                schedule.date,
                schedule.time,
                venueName
              );
              notifiedGroups.add(group.id);
            } catch (emailError) {
              console.error(`Failed to send email to group ${group.name} members:`, emailError.message);
            }
          }

          // Notify department heads (only once per department)
          const deptHeadsForDept = deptHeadsByDept[group.department] || [];
          if (deptHeadsForDept.length > 0 && !notifiedDepts.has(group.department)) {
            try {
              await notifyDeptHeadDefenseScheduled(
                deptHeadsForDept,
                group.name,
                group.department,
                schedule.date,
                schedule.time,
                venueName
              );
              notifiedDepts.add(group.department);
            } catch (emailError) {
              console.error(`Failed to send email to ${group.department} department heads:`, emailError.message);
            }
          }

          // Notify evaluators (only once per evaluator)
          for (const evaluator of evaluators) {
            if (!notifiedEvaluators.has(evaluator.id)) {
              try {
                await notifyDefenseDuty(
                  evaluator,
                  group.name,
                  schedule.date,
                  schedule.time,
                  venueName
                );
                notifiedEvaluators.add(evaluator.id);
              } catch (emailError) {
                console.error(`Failed to send email to evaluator ${evaluator.name}:`, emailError.message);
              }
            }
          }
        }

        console.log(`✅ Defense schedule notifications sent to ${notifiedGroups.size} groups, ${notifiedDepts.size} departments, and ${notifiedEvaluators.size} evaluators`);
      } catch (notifError) {
        console.error('❌ Failed to send defense schedule notifications:', notifError);
        // Don't fail the entire operation if notifications fail
      }
    });

    res.status(201).json({
      success: true,
      message: `Successfully generated ${createdSchedules.length} defense schedules.`,
      schedules: createdSchedules
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Generate defense schedule error:', error);
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
};

module.exports = {
  createDefenseSchedule,
  getDefenseSchedules,
  getDefenseScheduleByGroup,
  updateDefenseSchedule,
  deleteDefenseSchedule,
  generateDefenseSchedule
};