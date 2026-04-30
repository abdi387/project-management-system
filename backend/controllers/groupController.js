const { Group, User, GroupMember, Evaluator, AcademicYear, SystemSetting, Section } = require('../models');
const { sequelize } = require('../config/db');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { notifyGroupFormation, notifyGroupFormationToAllStudents, notifyProjectClaim, notifyEvaluatorsAssignedToGroup, notifyEvaluatorsAssigned, notifyDeptHeadEvaluatorsAssigned, createBulkNotifications, createNotification } = require('./notificationController');

// Safe attributes to select (excluding isReadyForDefense which is missing in DB)
const SAFE_GROUP_ATTRIBUTES = [
  'id', 'name', 'department', 'leaderId', 'advisorId', 
  'academicYearId', 'proposalStatus', 'approvedTitle', 
  'progressStatus', 'finalDraftStatus', 'createdAt', 'updatedAt'
];

// @desc    Get all groups (with filters)
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    const { department, academicYearId, advisorId } = req.query;
    
    // Build filter object
    const where = {};
    if (department) where.department = department;
    
    // Validate and set academicYearId - ensure it's a valid number
    if (academicYearId) {
      const parsedYearId = parseInt(academicYearId, 10);
      if (!isNaN(parsedYearId) && parsedYearId > 0) {
        where.academicYearId = parsedYearId;
      }
    }
    
    if (advisorId) where.advisorId = advisorId;

    // If user is department head, only show their department
    if (req.user.role === 'dept-head') {
      where.department = req.user.department;
    }

    const groups = await Group.findAll({
      where,
      attributes: SAFE_GROUP_ATTRIBUTES,
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa', 'gender', 'profilePicture'],
          through: { attributes: [] },
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Leader',
          attributes: ['id', 'name', 'email'],
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Advisor',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: User,
          as: 'Evaluators',
          attributes: ['id', 'name', 'email', 'department'],
          through: { attributes: [] }
        },
        {
          model: AcademicYear,
          as: 'AcademicYear',
          attributes: ['id', 'yearName', 'semester']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('❌ Get groups error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching group with ID: ${id}`);

    const group = await Group.findByPk(id, {
      attributes: SAFE_GROUP_ATTRIBUTES,
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa', 'gender', 'profilePicture'],
          through: { attributes: [] },
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Leader',
          attributes: ['id', 'name', 'email'],
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Advisor',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: User,
          as: 'Evaluators',
          attributes: ['id', 'name', 'email', 'department'],
          through: { attributes: [] }
        },
        {
          model: AcademicYear,
          as: 'AcademicYear',
          attributes: ['id', 'yearName', 'semester']
        }
      ]
    });

    if (!group) {
      console.log(`❌ Group not found: ${id}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Group not found' 
      });
    }

    console.log(`✅ Group found: ${group.name}`);
    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('❌ Get group by id error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get group by student ID
// @route   GET /api/groups/student/:studentId
// @access  Private
const getGroupByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('🔍 Fetching group for student ID:', studentId);

    // First find the user
    const user = await User.findByPk(studentId);
    
    if (!user) {
      console.log('❌ User not found with ID:', studentId);
      return res.status(404).json({ 
        success: false, 
        error: 'Student not found' 
      });
    }

    console.log('✅ Found user:', user.id, user.role);

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    // Find the group through GroupMember
    const groupMember = await GroupMember.findOne({
      where: { userId: user.id },
      include: [
        {
          model: Group,
          as: 'Group',
          required: true,
          attributes: SAFE_GROUP_ATTRIBUTES,
          where: activeYear ? { academicYearId: activeYear.id } : {},
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa', 'gender', 'profilePicture'],
              through: { attributes: [] },
              include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
            },
            {
              model: User,
              as: 'Leader',
              attributes: ['id', 'name', 'email'],
              include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
            },
            {
              model: User,
              as: 'Advisor',
              attributes: ['id', 'name', 'email', 'department']
            },
            {
              model: User,
              as: 'Evaluators',
              attributes: ['id', 'name', 'email', 'department'],
              through: { attributes: [] }
            },
            {
              model: AcademicYear,
              as: 'AcademicYear',
              attributes: ['id', 'yearName', 'semester']
            }
          ]
        }
      ]
    });

    if (!groupMember || !groupMember.Group) {
      console.log('❌ No group found for user:', user.id);
      return res.status(404).json({ 
        success: false, 
        error: 'No group found for this student in the current academic year' 
      });
    }

    console.log('✅ Group found:', groupMember.Group.name);

    res.json({
      success: true,
      group: groupMember.Group
    });
  } catch (error) {
    console.error('❌ Get group by student id error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Create groups automatically (group by section first)
// @route   POST /api/groups/generate
// @access  Private/Dept-Head
const generateGroups = async (req, res) => {
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

    const { department, maxPerGroup, academicYearId } = req.body;

    // Get active academic year if not specified
    let targetYearId = academicYearId;
    if (!targetYearId) {
      const activeYear = await AcademicYear.findOne({
        where: { status: 'active' }
      });
      if (!activeYear) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'No active academic year found' 
        });
      }
      targetYearId = activeYear.id;
    }

    // Get all active students in department
    const allStudents = await User.findAll({
      where: {
        role: 'student',
        department,
        status: 'active'
      },
      include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }],
      order: [['cgpa', 'DESC']],
      transaction
    });

    if (allStudents.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'No active students found in this department' 
      });
    }

    // Check if students are already in groups
    const studentsInGroups = await GroupMember.findAll({
      include: [{
        model: Group,
        as: 'Group',
        where: { academicYearId: targetYearId },
        attributes: []
      }],
      attributes: ['userId'],
      transaction
    });

    const groupedStudentIds = new Set(studentsInGroups.map(s => s.userId));
    
    // Filter out students already in groups
    const availableStudents = allStudents.filter(s => !groupedStudentIds.has(s.id));

    if (availableStudents.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'No available students to group. All students are already in groups.' 
      });
    }

    // A smaller final group is allowed if there are fewer than maxPerGroup remaining.
    // This lets newly arrived students be grouped even when they do not fill a complete group.

    // Group students by section first
    const studentsBySection = availableStudents.reduce((acc, student) => {
      const section = student.section || 'Uncategorized';
      if (!acc[section]) acc[section] = [];
      acc[section].push(student);
      return acc;
    }, {});

    const createdGroups = [];
    let groupCounter = 1;

    // Process each section separately
    for (const [section, sectionStudents] of Object.entries(studentsBySection)) {
      // Sort section students by CGPA
      sectionStudents.sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0));
      const sectionLabel = sectionStudents[0]?.Section?.name || section;
      
      // Calculate groups for this section
      const numGroupsForSection = Math.ceil(sectionStudents.length / maxPerGroup);
      
      // Select leaders (top students from this section)
      const sectionLeaders = sectionStudents.slice(0, numGroupsForSection);
      const remainingSectionStudents = sectionStudents.slice(numGroupsForSection);
      
      // Shuffle remaining students
      const shuffled = [...remainingSectionStudents].sort(() => Math.random() - 0.5);
      
      // Create groups for this section
      for (let i = 0; i < numGroupsForSection; i++) {
        const leader = sectionLeaders[i];
        
        // Create group with section in name for clarity
        const group = await Group.create({
          id: `grp-${Date.now()}-${groupCounter}-${Math.random().toString(36).substr(2, 5)}`,
          name: `Group ${groupCounter} (Sec ${sectionLabel})`,
          department,
          leaderId: leader.id,
          academicYearId: targetYearId
        }, { transaction });

        // Add leader as member
        await GroupMember.create({
          groupId: group.id,
          userId: leader.id
        }, { transaction });

        // Calculate members for this group
        const membersStartIdx = i * (maxPerGroup - 1);
        const membersEndIdx = Math.min(membersStartIdx + (maxPerGroup - 1), shuffled.length);
        const membersForThisGroup = shuffled.slice(membersStartIdx, membersEndIdx);
        
        // Collect member IDs for notifications
        const memberIds = [leader.id];
        
        // Add members
        for (const member of membersForThisGroup) {
          await GroupMember.create({
            groupId: group.id,
            userId: member.id
          }, { transaction });
          memberIds.push(member.id);
        }

        // Fetch complete group with members
        const completeGroup = await Group.findByPk(group.id, {
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa', 'gender'],
              through: { attributes: [] },
              include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
            },
            {
              model: User,
              as: 'Leader',
              attributes: ['id', 'name', 'email', 'section'],
              include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
            }
          ],
          transaction
        });

        createdGroups.push(completeGroup);
        groupCounter++;
      }
    }

    await transaction.commit();

    // Notify ALL students in the formed groups about group formation asynchronously
    setImmediate(async () => {
      try {
        await notifyGroupFormationToAllStudents(department, createdGroups);
        console.log(`✅ Notifications sent to students in ${createdGroups.length} groups in ${department} department`);
      } catch (notifError) {
        console.error('❌ Failed to send department-wide group formation notifications:', notifError);
        // Don't fail the response for notification failures
      }
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdGroups.length} groups`,
      groups: createdGroups
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Generate groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// @desc    Delete groups (for undo functionality)
// @route   DELETE /api/groups
// @access  Private/Dept-Head
const deleteGroups = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { groupIds } = req.body;
    
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide an array of group IDs to delete' 
      });
    }

    // Get groups with their members before deletion (for notifications)
    const groupsToDelete = await Group.findAll({
      where: { 
        id: groupIds
      },
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name']
        }
      ],
      transaction
    });

    // Check if groups can be deleted (only if no proposals/drafts)
    const groups = await Group.findAll({
      where: { 
        id: groupIds,
        [Op.or]: [
          { proposalStatus: 'pending' },
          { proposalStatus: null }
        ],
        finalDraftStatus: 'not-submitted'
      },
      transaction
    });

    if (groups.length !== groupIds.length) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Some groups cannot be deleted because they have approved proposals or submitted drafts' 
      });
    }

    // Collect member IDs for notifications
    const allMemberIds = [];
    groupsToDelete.forEach(group => {
      if (group.Members) {
        group.Members.forEach(member => allMemberIds.push(member.id));
      }
    });

    // First delete all group members (due to foreign key constraints)
    await GroupMember.destroy({
      where: { groupId: groupIds },
      transaction
    });

    // Then delete the groups
    await Group.destroy({
      where: { 
        id: groupIds
      },
      transaction
    });

    await transaction.commit();

    // Send notifications for undo (outside transaction)
    if (allMemberIds.length > 0) {
      try {
        const uniqueMemberIds = [...new Set(allMemberIds)];
        await createBulkNotifications(
          uniqueMemberIds,
          'system-support',
          'Group Assignment Removed',
          'Your group has been removed due to undo action. You are now available for regrouping.',
          null
        );
        console.log(`✅ Undo notifications sent to ${uniqueMemberIds.length} students`);
      } catch (notifError) {
        console.error('❌ Failed to send undo notifications:', notifError);
      }
    }

    res.json({
      success: true,
      message: `Successfully deleted ${groupIds.length} groups`
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete groups error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Assign advisor to group
// @route   PUT /api/groups/:id/assign-advisor
// @access  Private/Advisor
const assignAdvisor = async (req, res) => {
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

    const { advisorId } = req.body;
    const groupId = req.params.id;

    const group = await Group.findByPk(groupId, { transaction });
    
    if (!group) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Group not found' 
      });
    }

    if (group.advisorId) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Group already has an advisor' 
      });
    }

    // Check advisor's max groups - first try new key, then fallback to old key
    let maxGroupsSetting = await SystemSetting.findOne({
      where: { key: 'maximum_groups_per_advisor' }
    });
    
    // Fallback to old key if new key doesn't exist
    if (!maxGroupsSetting) {
      maxGroupsSetting = await SystemSetting.findOne({
        where: { key: 'max_groups_per_advisor' }
      });
    }
    
    const maxGroups = parseInt(maxGroupsSetting?.value || '5');

    // Get active academic year to filter current groups
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    // Count only groups in the current academic year
    const currentGroups = await Group.count({
      where: {
        advisorId,
        academicYearId: activeYear ? activeYear.id : null
      },
      transaction
    });

    if (currentGroups >= maxGroups) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Advisor has reached maximum limit of ${maxGroups} groups`
      });
    }

    group.advisorId = advisorId;
    await group.save({ transaction });

    await transaction.commit();

    // Fetch updated group
    const updatedGroup = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa'],
          through: { attributes: [] },
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Advisor',
          attributes: ['id', 'name', 'email', 'department']
        }
      ]
    });

    // Send notifications and emails to group members asynchronously
    setImmediate(async () => {
      try {
        const memberIds = updatedGroup.Members?.map(m => m.id) || [];
        const advisorName = updatedGroup.Advisor?.name || 'An advisor';
        const advisorEmail = updatedGroup.Advisor?.email || null;
        if (memberIds.length > 0) {
          await notifyProjectClaim(groupId, advisorName, memberIds, advisorEmail);
          console.log(`✅ Advisor claim notification and email sent to ${memberIds.length} group members`);
        }
      } catch (notifError) {
        console.error('❌ Failed to send advisor claim notifications:', notifError);
      }
    });

    res.json({
      success: true,
      message: 'Advisor assigned successfully',
      group: updatedGroup
    });
  } catch (error) {
    // Check if the transaction has already been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ Assign advisor error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Assign evaluators to group
// @route   POST /api/groups/:id/evaluators
// @access  Private/Faculty-Head
const assignEvaluators = async (req, res) => {
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

    const { evaluatorIds } = req.body;
    const groupId = req.params.id;

    const group = await Group.findByPk(groupId, { transaction });
    
    if (!group) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Group not found' 
      });
    }

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    if (!activeYear) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'No active academic year found'
      });
    }

    // Remove existing evaluators for this group and academic year
    await Evaluator.destroy({
      where: { 
        groupId,
        academicYearId: activeYear.id
      },
      transaction
    });

    // Add new evaluators with academicYearId and semester
    for (const evaluatorId of evaluatorIds) {
      await Evaluator.create({
        groupId,
        userId: evaluatorId,
        academicYearId: activeYear.id,
        semester: activeYear.semester
      }, { transaction });
    }

    await transaction.commit();

    // Fetch updated group
    const updatedGroup = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa'],
          through: { attributes: [] },
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Evaluators',
          attributes: ['id', 'name', 'email', 'department'],
          through: { attributes: [] }
        }
      ]
    });

    // Notify about evaluator assignment (Async - don't block response)
    setImmediate(async () => {
      try {
        // Notify group members about evaluator assignment
        const memberIds = updatedGroup.Members?.map(m => m.id) || [];
        const evaluatorNames = updatedGroup.Evaluators?.map(e => e.name).join(', ') || 'evaluators';
        if (memberIds.length > 0) {
          await notifyEvaluatorsAssignedToGroup(groupId, memberIds, evaluatorNames);
          console.log(`✅ Evaluator assignment notification sent to ${memberIds.length} group members`);
        }

        // Notify evaluators about their assignment
        const groupName = updatedGroup.name;
        const approvedTitleObj = updatedGroup.approvedTitle;
        let approvedTitle = 'Untitled Project';

        // Parse approvedTitle if it's a JSON string
        if (typeof approvedTitleObj === 'string') {
          try {
            const parsed = JSON.parse(approvedTitleObj);
            approvedTitle = parsed.title || approvedTitle;
          } catch (e) {
            approvedTitle = approvedTitleObj;
          }
        } else if (approvedTitleObj) {
          approvedTitle = approvedTitleObj.title || JSON.stringify(approvedTitleObj);
        }

        // Fetch evaluators with their details
        const evaluators = await User.findAll({
          where: { id: evaluatorIds },
          attributes: ['id', 'name', 'email']
        });

        if (evaluators.length > 0) {
          await notifyEvaluatorsAssigned(evaluators, groupName, approvedTitle, updatedGroup.department);
          console.log(`✅ Evaluation assignment notification sent to ${evaluators.length} evaluators`);
        }

        // Notify department head about evaluator assignment
        const deptHeads = await User.findAll({
          where: {
            role: 'dept-head',
            department: updatedGroup.department,
            status: 'active'
          },
          attributes: ['id', 'name', 'email']
        });

        if (deptHeads.length > 0) {
          await notifyDeptHeadEvaluatorsAssigned(deptHeads, groupName, updatedGroup.department, evaluatorNames);
          console.log(`✅ Evaluator assignment notification sent to ${deptHeads.length} department head(s)`);
        }
      } catch (notifError) {
        console.error('❌ Failed to send evaluator assignment notifications:', notifError);
      }
    });

    res.json({
      success: true,
      message: 'Evaluators assigned successfully',
      group: updatedGroup
    });
  } catch (error) {
    // Check if the transaction has already been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ Assign evaluators error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// @desc    Get groups for evaluator
// @route   GET /api/groups/evaluator/:evaluatorId
// @access  Private
const getGroupsForEvaluator = async (req, res) => {
  try {
    const { evaluatorId } = req.params;

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    if (!activeYear) {
      return res.json({
        success: true,
        count: 0,
        groups: []
      });
    }

    // First get groups where this user is an evaluator for the active academic year
    const evaluatorGroups = await Evaluator.findAll({
      where: { 
        userId: evaluatorId,
        academicYearId: activeYear.id
      },
      attributes: ['groupId']
    });

    const groupIds = evaluatorGroups.map(e => e.groupId);

    if (groupIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        groups: []
      });
    }

    // Fetch groups with basic info
    const groups = await Group.findAll({
      where: { id: groupIds },
      attributes: SAFE_GROUP_ATTRIBUTES,
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'studentId', 'section'],
          through: { attributes: [] },
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: User,
          as: 'Advisor',
          attributes: ['id', 'name']
        },
        {
          model: AcademicYear,
          as: 'AcademicYear',
          attributes: ['id', 'yearName', 'semester']
        }
      ],
      order: [['name', 'ASC']]
    });

    // For each group, fetch evaluators directly from Evaluator table with User join
    const groupsWithEvaluators = await Promise.all(groups.map(async (group) => {
      // Get all evaluators for this group from Evaluator table with User info
      const evaluatorRecords = await Evaluator.findAll({
        where: { 
          groupId: group.id,
          academicYearId: activeYear.id
        },
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'department']
        }]
      });

      const evaluators = evaluatorRecords
        .filter(e => e.User)
        .map(e => ({
          id: e.User.id,
          name: e.User.name,
          email: e.User.email,
          department: e.User.department
        }));

      // Convert to plain object and add evaluators
      const groupData = group.toJSON();
      // Provide evaluators under both PascalCase and camelCase for frontend compatibility
      groupData.Evaluators = evaluators;
      groupData.evaluators = evaluators;
      // Add semester directly on the group object for easier frontend filtering
      groupData.semester = group.AcademicYear?.semester || null;
      return groupData;
    }));

    res.json({
      success: true,
      count: groupsWithEvaluators.length,
      groups: groupsWithEvaluators
    });
  } catch (error) {
    console.error('❌ Get groups for evaluator error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get available projects (groups with approved proposals but no advisor)
// @route   GET /api/groups/available-projects
// @access  Private/Advisor
const getAvailableProjects = async (req, res) => {
  try {
    const groups = await Group.findAll({
      where: {
        advisorId: null,
        proposalStatus: 'approved'
      },
      attributes: SAFE_GROUP_ATTRIBUTES,
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'email', 'studentId', 'section', 'cgpa'],
          through: { attributes: [] },
          include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }]
        },
        {
          model: AcademicYear,
          as: 'AcademicYear',
          where: { status: 'active' },
          attributes: ['id', 'yearName', 'semester']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('❌ Get available projects error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  getGroupByStudentId,
  generateGroups,
  deleteGroups,
  assignAdvisor,
  assignEvaluators,
  getGroupsForEvaluator,
  getAvailableProjects
};
