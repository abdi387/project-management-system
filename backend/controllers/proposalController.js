const { Proposal, ProposalTitle, Group, User, AcademicYear, ProjectDomain } = require('../models');
const { sequelize } = require('../config/db');
const { validationResult } = require('express-validator');
const { 
  notifyDeptHeadNewProposal, 
  notifyProposalSubmission,
  notifyProposalApproval,
  notifyProposalRejection
} = require('./notificationController');

// @desc    Submit proposal (3 titles)
// @route   POST /api/proposals
// @access  Private/Student
const submitProposal = async (req, res) => {
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

    const { groupId, titles } = req.body;
    
    // Verify group exists and get all members
    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'Leader',
          attributes: ['id', 'name', 'email']
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

    // Check if user is member of the group
    const isMember = group.Members && group.Members.some(m => m.id === req.user.id);
    if (!isMember && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        error: 'You are not a member of this group' 
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

    // Check if proposal already exists for this group and year
    const existingProposal = await Proposal.findOne({
      where: {
        groupId,
        academicYearId: activeYear.id
      },
      transaction
    });

    let proposal;
    
    if (existingProposal) {
      // Update existing proposal (resubmission)
      proposal = existingProposal;
      proposal.status = 'pending';
      proposal.feedback = null;
      proposal.approvedTitleIndex = null;
      await proposal.save({ transaction });

      // Delete old titles
      await ProposalTitle.destroy({
        where: { proposalId: proposal.id },
        transaction
      });
    } else {
      // Create new proposal
      proposal = await Proposal.create({
        groupId,
        academicYearId: activeYear.id,
        status: 'pending'
      }, { transaction });
    }

    // Create new titles
    for (let i = 0; i < titles.length; i++) {
      const titleData = titles[i];
      
      const domain = await ProjectDomain.findOne({
        where: { name: titleData.domain },
        transaction
      });

      if (!domain) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          error: `Domain "${titleData.domain}" not found` 
        });
      }

      await ProposalTitle.create({
        proposalId: proposal.id,
        titleIndex: i,
        title: titleData.title,
        domainId: domain.id,
        description: titleData.description
      }, { transaction });
    }

    // Update group status
    group.proposalStatus = 'pending';
    await group.save({ transaction });

    await transaction.commit();

    // Fetch complete proposal for response
    const completeProposal = await Proposal.findByPk(proposal.id, {
      include: [
        {
          model: ProposalTitle,
          as: 'Titles',
          include: [{
            model: ProjectDomain,
            as: 'Domain',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Group,
          as: 'Group',
          attributes: ['id', 'name', 'department']
        }
      ]
    });

    // Send notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const deptHeads = await User.findAll({
          where: {
            role: 'dept-head',
            department: group.department,
            status: 'active'
          },
          attributes: ['id', 'name', 'email']
        });

        const leaderName = group.Leader?.name || req.user.name || 'A student';
        const firstTitle = titles[0]?.title || 'Project Proposal';

        if (deptHeads.length > 0) {
          await notifyDeptHeadNewProposal(deptHeads, group.name, leaderName, firstTitle, group.department);
          console.log(`✅ Proposal submission notification sent to department heads`);
        }

        const memberIds = group.Members?.map(m => m.id) || [];
        if (memberIds.length > 0) {
          await notifyProposalSubmission(group.name, memberIds);
          console.log(`✅ Proposal submission notification sent to ${memberIds.length} group members`);
        }
      } catch (notifError) {
        console.error('Failed to send submission notifications:', notifError);
      }
    });

    res.status(201).json({
      success: true,
      message: existingProposal ? 'Proposal resubmitted successfully' : 'Proposal submitted successfully',
      proposal: completeProposal
    });
  } catch (error) {
    // Check if the transaction has already been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error('Submit proposal error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get proposals for department
// @route   GET /api/proposals/department/:department
// @access  Private/Dept-Head
const getProposalsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { status } = req.query;

    let groupIds = [];
    let groups;

    // Handle 'all' case - fetch proposals from all departments
    if (department === 'all') {
      // Get all groups
      groups = await Group.findAll({
        attributes: ['id']
      });
    } else {
      // Get groups for specific department
      groups = await Group.findAll({
        where: { department },
        attributes: ['id']
      });
    }

    groupIds = groups.map(g => g.id);

    // If no groups, return empty result
    if (groupIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        proposals: []
      });
    }

    const where = { groupId: groupIds };
    if (status) where.status = status;

    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' },
      // Add logging if this fails
    }).catch(err => {
      console.error('Error fetching active academic year:', err);
      return null;
    });

    if (activeYear) {
      where.academicYearId = activeYear.id;
    }

    const proposals = await Proposal.findAll({
      where,
      include: [
        {
          model: ProposalTitle,
          as: 'Titles',
          include: [{
            model: ProjectDomain,
            as: 'Domain',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Group,
          as: 'Group',
          attributes: [
            'id', 'name', 'department', 'leaderId', 'advisorId', 
            'academicYearId', 'proposalStatus', 'approvedTitle', 
            'progressStatus', 'finalDraftStatus', 'createdAt', 'updatedAt'
          ],
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'studentId', 'section']
            },
            {
              model: User,
              as: 'Leader',
              attributes: ['id', 'name']
            },
            {
              model: User,
              as: 'Evaluators',
              attributes: ['id', 'name', 'email'],
              through: { attributes: [] }
            }
          ]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({
      success: true,
      count: proposals.length,
      proposals
    });
  } catch (error) {
    console.error('Get proposals by department error:', error.message, error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get proposal by group ID
// @route   GET /api/proposals/group/:groupId
// @access  Private
const getProposalByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;

    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    const where = { groupId };
    if (activeYear) {
      where.academicYearId = activeYear.id;
    }

    const proposal = await Proposal.findOne({
      where,
      include: [
        {
          model: ProposalTitle,
          as: 'Titles',
          include: [{
            model: ProjectDomain,
            as: 'Domain',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Group,
          as: 'Group',
          include: [{
            model: User,
            as: 'Evaluators',
            attributes: ['id', 'name', 'email'],
            through: { attributes: [] }
          }]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    if (!proposal) {
      return res.status(404).json({ 
        success: false, 
        error: 'No proposal found for this group' 
      });
    }

    res.json({
      success: true,
      proposal
    });
  } catch (error) {
    console.error('Get proposal by group id error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Approve proposal (select one title)
// @route   PUT /api/proposals/:id/approve
// @access  Private/Dept-Head
const approveProposal = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { selectedTitleIndex } = req.body;
    const proposalId = req.params.id;

    const proposal = await Proposal.findByPk(proposalId, {
      include: [
        {
          model: ProposalTitle,
          as: 'Titles',
          include: [{
            model: ProjectDomain,
            as: 'Domain'
          }]
        },
        {
          model: Group,
          as: 'Group',
          include: [{
            model: User,
            as: 'Members',
            attributes: ['id']
          }]
        }
      ],
      transaction
    });

    if (!proposal) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Proposal not found' 
      });
    }

    if (proposal.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Proposal is already ${proposal.status}` 
      });
    }

    if (selectedTitleIndex < 0 || selectedTitleIndex >= proposal.Titles.length) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid title index' 
      });
    }

    const selectedTitle = proposal.Titles[selectedTitleIndex];

    // Update proposal
    proposal.status = 'approved';
    proposal.approvedTitleIndex = selectedTitleIndex;
    proposal.approvedAt = new Date();
    await proposal.save({ transaction });

    // Update group with approved title
    const group = proposal.Group;
    group.proposalStatus = 'approved';
    group.approvedTitle = JSON.stringify({
      title: selectedTitle.title,
      domain: selectedTitle.Domain?.name || 'Unknown',
      description: selectedTitle.description
    });
    await group.save({ transaction });

    await transaction.commit();

    // Send notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const memberIds = group.Members?.map(m => m.id) || [];
        if (memberIds.length > 0) {
          const domain = selectedTitle.Domain?.name || 'Unknown';
          await notifyProposalApproval(proposal.id, selectedTitle.title, memberIds, domain);
          console.log(`✅ Proposal approval notification sent to ${memberIds.length} group members`);
        }
      } catch (notifError) {
        console.error('Failed to send proposal approval notifications:', notifError);
      }
    });

    res.json({
      success: true,
      message: 'Proposal approved successfully',
      proposal: {
        ...proposal.toJSON(),
        approvedTitle: selectedTitle
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Approve proposal error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Reject proposal
// @route   PUT /api/proposals/:id/reject
// @access  Private/Dept-Head
const rejectProposal = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { feedback } = req.body;
    const proposalId = req.params.id;

    const proposal = await Proposal.findByPk(proposalId, {
      include: [{
        model: Group,
        as: 'Group',
        include: [{
          model: User,
          as: 'Members',
          attributes: ['id']
        }]
      }],
      transaction
    });

    if (!proposal) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Proposal not found' 
      });
    }

    if (proposal.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Proposal is already ${proposal.status}` 
      });
    }

    // Update proposal
    proposal.status = 'rejected';
    proposal.feedback = feedback || 'Proposal rejected. Please submit new titles.';
    await proposal.save({ transaction });

    // Update group status
    const group = proposal.Group;
    group.proposalStatus = 'rejected';
    await group.save({ transaction });

    await transaction.commit();

    // Send notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const memberIds = group.Members?.map(m => m.id) || [];
        if (memberIds.length > 0) {
          await notifyProposalRejection(group.id, memberIds, feedback);
          console.log(`✅ Proposal rejection notification sent to ${memberIds.length} group members`);
        }
      } catch (notifError) {
        console.error('Failed to send proposal rejection notifications:', notifError);
      }
    });

    res.json({
      success: true,
      message: 'Proposal rejected',
      proposal
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Reject proposal error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

module.exports = {
  submitProposal,
  getProposalsByDepartment,
  getProposalByGroupId,
  approveProposal,
  rejectProposal
};