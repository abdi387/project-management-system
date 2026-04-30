const { ProgressReport, Group, User, AcademicYear } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const { notifyProgressSubmission, notifyProgressFeedback } = require('./notificationController');

// @desc    Submit a progress report
// @route   POST /api/progress
// @access  Private (Student)
const submitProgressReport = async (req, res) => {
  try {
    const { groupId, title, description, fileUrl, fileName, semester, deadline } = req.body;
    const academicYearId = req.body.academicYearId;

    // Check if group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Check if user is a member of the group
    const isMember = await group.hasMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // Check if there's an existing pending report
    const existingReport = await ProgressReport.findOne({
      where: {
        groupId,
        semester,
        status: 'pending'
      }
    });

    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        error: 'A pending report already exists for this semester' 
      });
    }

    if (!fileUrl || !fileUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a document URL or upload a progress report file.'
      });
    }

    // Calculate if report is overdue
    const isOverdue = new Date() > new Date(deadline);

    const report = await ProgressReport.create({
      groupId,
      academicYearId,
      semester,
      title,
      description,
      fileUrl,
      fileName,
      deadline,
      status: 'pending',
      isOverdue,
      submittedAt: new Date()
    });

    // Notify the group's advisor asynchronously
    setImmediate(async () => {
      try {
        const groupWithAdvisor = await Group.findByPk(groupId, {
          attributes: ['id', 'name', 'advisorId', 'department'],
          include: [{
            model: User,
            as: 'Advisor',
            attributes: ['id', 'name', 'email']
          }]
        });

        if (groupWithAdvisor?.Advisor) {
          await notifyProgressSubmission(
            groupWithAdvisor.Advisor,
            groupWithAdvisor.name,
            title,
            groupWithAdvisor.department
          );
          console.log(`✅ Progress submission notification sent to advisor of ${groupWithAdvisor.name}`);
        }
      } catch (notifError) {
        console.error('❌ Failed to send progress submission notification:', notifError);
      }
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Submit progress report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get progress reports by group
// @route   GET /api/progress/group/:groupId
// @access  Private
const getProgressReportsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const reports = await ProgressReport.findAll({
      where: { groupId },
      order: [['submittedAt', 'DESC']],
      include: [
        {
          model: Group,
          as: 'Group',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Get progress reports by group error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get progress reports by advisor
// @route   GET /api/progress/advisor/:advisorId
// @access  Private (Advisor, Admin)
const getProgressReportsByAdvisor = async (req, res) => {
  try {
    const { advisorId } = req.params;

    // Get all groups mentored by this advisor
    const groups = await Group.findAll({
      where: { advisorId },
      attributes: ['id', 'name']
    });

    const groupIds = groups.map(g => g.id);

    // Get all progress reports for these groups
    const reports = await ProgressReport.findAll({
      where: {
        groupId: { [Op.in]: groupIds }
      },
      include: [
        {
          model: Group,
          as: 'Group',
          attributes: ['id', 'name'],
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'studentId', 'section'],
              through: { attributes: [] }
            }
          ]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ success: true, reports, groups });
  } catch (error) {
    console.error('Get progress reports by advisor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add feedback to a progress report
// @route   PUT /api/progress/:id/feedback
// @access  Private (Advisor)
const addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const report = await ProgressReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    // Check if advisor is the group's advisor
    const group = await Group.findByPk(report.groupId);
    if (group.advisorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to give feedback on this report'
      });
    }

    report.feedback = feedback;
    report.status = 'reviewed';
    report.reviewedAt = new Date();
    await report.save();

    // Notify group members about the feedback asynchronously
    setImmediate(async () => {
      try {
        const groupWithMembers = await Group.findByPk(report.groupId, {
          include: [
            {
              model: User,
              as: 'Members',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'Advisor',
              attributes: ['id', 'name']
            }
          ]
        });

        const memberIds = groupWithMembers?.Members?.map(m => m.id) || [];
        const advisorName = groupWithMembers?.Advisor?.name || 'Your Advisor';
        const groupName = groupWithMembers?.name || 'Your Group';

        if (memberIds.length > 0) {
          await notifyProgressFeedback(
            groupWithMembers,
            memberIds,
            report.title,
            advisorName,
            feedback || 'No specific feedback provided. Please check the system for details.'
          );
          console.log(`✅ Progress feedback email sent to ${memberIds.length} group members for report: ${report.title}`);
        } else {
          console.log('⚠️ No group members found to notify for feedback');
        }
      } catch (notifError) {
        console.error('❌ Failed to send progress feedback notification:', notifError.message);
      }
    });

    res.json({ success: true, report, message: 'Feedback added successfully. Group members will be notified via email.' });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Check and update overdue reports
// @route   POST /api/progress/check-overdue
// @access  Private (Admin)
const checkOverdueReports = async (req, res) => {
  try {
    const today = new Date();

    // Find all pending reports with past deadlines
    const overdueReports = await ProgressReport.findAll({
      where: {
        status: 'pending',
        deadline: { [Op.lt]: today }
      }
    });

    // Update isOverdue flag
    for (const report of overdueReports) {
      if (!report.isOverdue) {
        report.isOverdue = true;
        await report.save();
      }
    }

    res.json({ 
      success: true, 
      message: `Checked ${overdueReports.length} reports`,
      updatedCount: overdueReports.length 
    });
  } catch (error) {
    console.error('Check overdue reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  submitProgressReport,
  getProgressReportsByGroup,
  getProgressReportsByAdvisor,
  addFeedback,
  checkOverdueReports
};
