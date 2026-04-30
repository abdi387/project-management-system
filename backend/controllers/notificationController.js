const { Notification, User, Group, AcademicYear } = require('../models');
const { sequelize } = require('../config/db');
const { validationResult } = require('express-validator');
const { sendProposalSubmissionEmail, sendProgressSubmissionEmail, sendProgressFeedbackEmail, sendFinalDraftApprovalEmailToDeptHead, sendFinalDraftApprovalEmailToStudents, sendGroupFormationEmail, sendEvaluatorAssignmentEmail, sendEvaluatorAssignmentToStudentsEmail, sendEvaluatorAssignmentToDeptHeadEmail, sendDefenseScheduleEmailToStudents, sendDefenseScheduleEmailToDeptHead, sendDefenseDutyEmail, sendInquirySubmissionEmail, sendInquiryResponseEmail, sendRegistrationApprovalEmail, sendRegistrationRejectionEmail, sendNewAcademicYearEmail, sendSemesterChangeEmail, sendSemesterChangeToDeptHeadEmail, sendSemesterChangeToAdvisorEmail, sendFinalDraftSubmissionEmail, sendProposalApprovalEmail, sendProposalRejectionEmail, sendAdvisorProjectClaimEmail } = require('../config/email');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const { unreadOnly, limit = 50, academicYearId, semester } = req.query;

    // Get current academic year context
    const currentYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    const where = { userId: req.user.id };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    // Filter by academic year and semester if available
    if (currentYear) {
      where.academicYearId = currentYear.id;
      if (semester) {
        where.semester = semester;
      } else if (currentYear.semester) {
        where.semester = currentYear.semester;
      }
    }

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Calculate unread count with the same filters
    const unreadWhere = { userId: req.user.id, isRead: false };
    if (currentYear) {
      unreadWhere.academicYearId = currentYear.id;
      if (semester) {
        unreadWhere.semester = semester;
      } else if (currentYear.semester) {
        unreadWhere.semester = currentYear.semester;
      }
    }

    res.json({
      success: true,
      count: notifications.length,
      unreadCount: await Notification.count({
        where: unreadWhere
      }),
      notifications
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Notification not found' 
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.user.id,
          isRead: false
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Notification not found' 
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Clear all notifications for user
// @route   DELETE /api/notifications/clear-all
// @access  Private
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.destroy({
      where: {
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      message: 'All notifications cleared successfully'
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Create notification (internal use)
// @access  Internal
const createNotification = async (userId, type, title, message, link = null, academicYearId = null, semester = null) => {
  try {
    console.log(`Creating notification for user ${userId}: ${title}`);

    const notification = await Notification.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      link,
      academicYearId,
      semester,
      isRead: false
    });

    console.log(`Notification created with ID: ${notification.id}`);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// @desc    Create notification for multiple users
// @access  Internal
const createBulkNotifications = async (userIds, type, title, message, link = null, academicYearId = null, semester = null) => {
  try {
    if (!userIds || userIds.length === 0) {
      console.log('No users to notify');
      return [];
    }

    console.log(`Creating bulk notifications for ${userIds.length} users: ${title}`);

    const notifications = userIds.map(userId => ({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${userId}`,
      userId,
      type,
      title,
      message,
      link,
      academicYearId,
      semester,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const created = await Notification.bulkCreate(notifications);
    console.log(`Successfully created ${created.length} notifications`);
    return created;
  } catch (error) {
    console.error('Create bulk notifications error:', error);
    return [];
  }
};

// Notification type helpers

// Helper to get current academic year context
const getCurrentAcademicYearContext = async () => {
  try {
    const currentYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });
    return currentYear ? {
      academicYearId: currentYear.id,
      semester: currentYear.semester
    } : { academicYearId: null, semester: null };
  } catch (error) {
    console.error('Error getting academic year context:', error);
    return { academicYearId: null, semester: null };
  }
};

const notifyProjectClaim = async (groupId, advisorName, memberIds, advisorEmail = null) => {
  const title = 'Advisor Assigned';
  const message = `${advisorName} has claimed your project as advisor.`;
  const link = '/student/group';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all group members
  try {
    const members = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'email']
    });

    const group = await Group.findByPk(groupId, {
      attributes: ['name']
    });

    for (const member of members) {
      if (member.email) {
        const emailResult = await sendAdvisorProjectClaimEmail(
          member.email,
          member.name,
          group?.name || 'Your Group',
          advisorName,
          advisorEmail
        );

        if (!emailResult.success) {
          console.error('Failed to send advisor claim email to:', member.email, emailResult.error);
        } else {
          console.log('Advisor claim email sent to:', member.email);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(memberIds, 'project-claim', title, message, link, context.academicYearId, context.semester);
};

const notifyProposalApproval = async (groupId, approvedTitle, memberIds, domain = 'Unknown') => {
  const title = 'Congratulations! Proposal Approved';
  const message = `Your project proposal "${approvedTitle}" has been approved!`;
  const link = '/student/proposal';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all group members
  try {
    const members = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'email']
    });

    const group = await Group.findByPk(groupId, {
      attributes: ['name']
    });

    for (const member of members) {
      if (member.email) {
        const emailResult = await sendProposalApprovalEmail(
          member.email,
          member.name,
          group?.name || 'Your Group',
          approvedTitle,
          domain
        );

        if (!emailResult.success) {
          console.error('Failed to send proposal approval email to:', member.email, emailResult.error);
        } else {
          console.log('Proposal approval email sent to:', member.email);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(memberIds, 'proposal-approved', title, message, link, context.academicYearId, context.semester);
};

const notifyProposalRejection = async (groupId, memberIds, feedback) => {
  const title = 'Proposal Rejected';
  const message = feedback || 'Your project proposal has been rejected. Please submit a new proposal.';
  const link = '/student/proposal';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all group members
  try {
    const members = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'email']
    });

    const group = await Group.findByPk(groupId, {
      attributes: ['name']
    });

    for (const member of members) {
      if (member.email) {
        const emailResult = await sendProposalRejectionEmail(
          member.email,
          member.name,
          group?.name || 'Your Group',
          feedback || 'No feedback provided'
        );

        if (!emailResult.success) {
          console.error('Failed to send proposal rejection email to:', member.email, emailResult.error);
        } else {
          console.log('Proposal rejection email sent to:', member.email);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(memberIds, 'proposal-rejected', title, message, link, context.academicYearId, context.semester);
};

const notifyProgressFeedback = async (group, memberIds, reportTitle, advisorName, feedback) => {
  const title = 'New Feedback';
  const message = 'Your advisor has provided feedback on your progress report.';
  const link = '/student/progress';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all group members asynchronously (in parallel)
  try {
    const members = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'email']
    });

    // Send all emails in parallel for better performance
    const emailPromises = members.map(async (member) => {
      if (member.email) {
        try {
          const emailResult = await sendProgressFeedbackEmail(
            member.email,
            member.name,
            group.name,
            reportTitle,
            advisorName,
            feedback || 'No specific feedback provided. Please check the system for details.'
          );

          if (!emailResult.success) {
            console.error('Failed to send progress feedback email to:', member.email, emailResult.error);
          } else {
            console.log('✅ Progress feedback email sent to:', member.email);
          }
        } catch (emailError) {
          console.error('❌ Email sending error for', member.email, ':', emailError.message);
        }
      }
    });

    // Wait for all emails to be sent (but don't block the main response)
    await Promise.allSettled(emailPromises);
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(memberIds, 'progress-feedback', title, message, link, context.academicYearId, context.semester);
};

const notifyFinalDraftApproval = async (group, memberIds, stage, advisorName, draftTitle) => {
  const title = `Final Draft ${stage === 'advisor' ? 'Advisor' : 'Department'} Approved`;
  const message = stage === 'advisor'
    ? 'Your final draft has been approved by your advisor. You can now view the approval status.'
    : 'Your final draft has been approved by the department head.';
  const link = '/student/final-draft';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all group members for advisor approval
  if (stage === 'advisor') {
    try {
      const members = await User.findAll({
        where: { id: memberIds },
        attributes: ['id', 'name', 'email']
      });

      for (const member of members) {
        if (member.email) {
          const emailResult = await sendFinalDraftApprovalEmailToStudents(
            member.email,
            member.name,
            group.name,
            draftTitle,
            advisorName
          );
          
          if (!emailResult.success) {
            console.error('Failed to send final draft approval email to:', member.email, emailResult.error);
          } else {
            console.log('Final draft approval email sent to:', member.email);
          }
        }
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
      // Don't fail the notification if email fails
    }
  }

  return await createBulkNotifications(memberIds, 'draft-approved', title, message, link, context.academicYearId, context.semester);
};

const notifyDefenseSchedule = async (group, memberIds, date, time, venue) => {
  const title = 'Defense Scheduled';
  const message = `Your defense is scheduled for ${new Date(date).toLocaleDateString()} at ${time} in ${venue}.`;
  const link = '/student/defense-schedule';
  const context = await getCurrentAcademicYearContext();

  // Get project title
  let projectTitle = 'Untitled Project';
  if (group.approvedTitle) {
    try {
      const parsed = typeof group.approvedTitle === 'string' ? JSON.parse(group.approvedTitle) : group.approvedTitle;
      projectTitle = parsed.title || projectTitle;
    } catch (e) {
      projectTitle = group.approvedTitle;
    }
  }

  // Send emails to all group members
  try {
    const members = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'email']
    });

    for (const member of members) {
      if (member.email) {
        const emailResult = await sendDefenseScheduleEmailToStudents(
          member.email,
          member.name,
          group.name,
          projectTitle,
          date,
          time,
          venue
        );
        
        if (!emailResult.success) {
          console.error('Failed to send defense schedule email to:', member.email, emailResult.error);
        } else {
          console.log('Defense schedule email sent to:', member.email);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(memberIds, 'defense-schedule', title, message, link, context.academicYearId, context.semester);
};

// Notify department head when defense schedules are generated for their department
const notifyDeptHeadDefenseScheduled = async (deptHeads, groupName, department, date, time, venue) => {
  const title = 'Defense Schedule Generated';
  const message = `Group "${groupName}" (${department}) defense scheduled for ${new Date(date).toLocaleDateString()} at ${time} in ${venue}.`;
  const link = '/dept-head/defense-schedule';
  const context = await getCurrentAcademicYearContext();

  const deptHeadIds = deptHeads.map(dh => dh.id || dh);

  // Send emails to department heads
  try {
    for (const deptHead of deptHeads) {
      const deptHeadId = deptHead.id || deptHead;
      const deptHeadEmail = deptHead.email;
      const deptHeadName = deptHead.name || 'Department Head';
      
      if (deptHeadEmail) {
        const emailResult = await sendDefenseScheduleEmailToDeptHead(
          deptHeadEmail,
          deptHeadName,
          groupName,
          department,
          date,
          time,
          venue
        );
        
        if (!emailResult.success) {
          console.error('Failed to send defense schedule email to:', deptHeadEmail, emailResult.error);
        } else {
          console.log('Defense schedule email sent to:', deptHeadEmail);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(deptHeadIds, 'defense-scheduled', title, message, link, context.academicYearId, context.semester);
};

const notifyEvaluatorAssignment = async (evaluator, groupName, projectTitle, department) => {
  const evaluatorId = evaluator.id || evaluator;
  const title = 'Evaluator Assignment';
  const message = `You have been assigned by the Faculty Head to evaluate Group "${groupName}" (${department}).`;
  const link = '/advisor/AdvisorEvaluations';
  const context = await getCurrentAcademicYearContext();

  // Send email to evaluator
  try {
    if (evaluator.email && evaluator.name) {
      const emailResult = await sendEvaluatorAssignmentEmail(
        evaluator.email,
        evaluator.name,
        groupName,
        projectTitle,
        department
      );
      
      if (!emailResult.success) {
        console.error('Failed to send evaluator assignment email to:', evaluator.email, emailResult.error);
      } else {
        console.log('Evaluator assignment email sent to:', evaluator.email);
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createNotification(evaluatorId, 'evaluator-assigned', title, message, link, context.academicYearId, context.semester);
};

// Notify advisor when group submits final draft
const notifyFinalDraftSubmission = async (advisor, groupName, draftTitle, department) => {
  if (!advisor) return null;

  const advisorId = advisor.id || advisor;
  const title = 'Final Draft Submitted';
  const message = `Group "${groupName}" has submitted their final draft: "${draftTitle}".`;
  const link = '/advisor/final-approval';
  const context = await getCurrentAcademicYearContext();

  // Send email to advisor
  try {
    if (advisor.email && advisor.name) {
      const emailResult = await sendFinalDraftSubmissionEmail(
        advisor.email,
        advisor.name,
        groupName,
        draftTitle,
        department
      );
      
      if (!emailResult.success) {
        console.error('Failed to send final draft submission email to:', advisor.email, emailResult.error);
      } else {
        console.log('Final draft submission email sent to:', advisor.email);
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createNotification(advisorId, 'draft-submission', title, message, link, context.academicYearId, context.semester);
};

// Notify group members when evaluators are assigned to their project
const notifyEvaluatorsAssignedToGroup = async (groupId, memberIds, evaluatorNames) => {
  const title = 'Evaluators Assigned';
  const message = `${evaluatorNames} ${evaluatorNames.includes(',') ? 'have' : 'has'} been assigned to evaluate your project.`;
  const link = '/student/evaluators';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all group members asynchronously
  try {
    const members = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'email']
    });

    // Get group name for email
    const group = await Group.findByPk(groupId, { attributes: ['name'] });
    const groupName = group?.name || 'Your Group';

    // Send all emails in parallel for better performance
    const emailPromises = members.map(async (member) => {
      if (member.email) {
        try {
          const emailResult = await sendEvaluatorAssignmentToStudentsEmail(
            member.email,
            member.name,
            groupName,
            evaluatorNames
          );

          if (!emailResult.success) {
            console.error('Failed to send evaluator assignment email to student:', member.email, emailResult.error);
          } else {
            console.log('✅ Evaluator assignment email sent to student:', member.email);
          }
        } catch (emailError) {
          console.error('❌ Email sending error for student', member.email, ':', emailError.message);
        }
      }
    });

    // Wait for all emails to be sent (but don't block)
    await Promise.allSettled(emailPromises);
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(memberIds, 'evaluators-assigned-group', title, message, link, context.academicYearId, context.semester);
};

// Notify department head when evaluators are assigned to a group in their department
const notifyDeptHeadEvaluatorsAssigned = async (deptHeads, groupName, department, evaluatorNames) => {
  const title = 'Evaluators Assigned to Group';
  const message = `Evaluators have been assigned to group "${groupName}" in your department.`;
  const link = null; // No link - informational only
  const context = await getCurrentAcademicYearContext();

  const deptHeadIds = deptHeads.map(dh => dh.id || dh);

  // Send emails to department heads
  try {
    for (const deptHead of deptHeads) {
      const deptHeadId = deptHead.id || deptHead;
      const deptHeadEmail = deptHead.email;
      const deptHeadName = deptHead.name || 'Department Head';

      if (deptHeadEmail) {
        try {
          const emailResult = await sendEvaluatorAssignmentToDeptHeadEmail(
            deptHeadEmail,
            deptHeadName,
            groupName,
            department,
            evaluatorNames
          );

          if (!emailResult.success) {
            console.error('Failed to send evaluator assignment email to dept head:', deptHeadEmail, emailResult.error);
          } else {
            console.log('✅ Evaluator assignment email sent to dept head:', deptHeadEmail);
          }
        } catch (emailError) {
          console.error('❌ Email sending error for dept head', deptHeadEmail, ':', emailError.message);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(deptHeadIds, 'evaluators-assigned-dept', title, message, link, context.academicYearId, context.semester);
};

// Notify evaluators when they are assigned to evaluate a group
const notifyEvaluatorsAssigned = async (evaluators, groupName, approvedTitle, department) => {
  const title = 'Evaluation Assignment';
  const message = `You have been assigned to evaluate the project "${approvedTitle}" by ${groupName}.`;
  const link = '/advisor/AdvisorEvaluations';
  const context = await getCurrentAcademicYearContext();

  const evaluatorIds = evaluators.map(ev => ev.id || ev);

  // Send emails to evaluators
  try {
    for (const evaluator of evaluators) {
      const evaluatorId = evaluator.id || evaluator;
      const evaluatorEmail = evaluator.email;
      const evaluatorName = evaluator.name || 'Advisor';
      
      if (evaluatorEmail) {
        const emailResult = await sendEvaluatorAssignmentEmail(
          evaluatorEmail,
          evaluatorName,
          groupName,
          approvedTitle,
          department
        );
        
        if (!emailResult.success) {
          console.error('Failed to send evaluator assignment email to:', evaluatorEmail, emailResult.error);
        } else {
          console.log('Evaluator assignment email sent to:', evaluatorEmail);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(evaluatorIds, 'evaluators-assigned', title, message, link, context.academicYearId, context.semester);
};

const notifyDefenseDuty = async (evaluator, groupName, date, time, venue) => {
  const evaluatorId = evaluator.id || evaluator;
  const title = 'Defense Evaluation Duty';
  const message = `You are assigned to evaluate ${groupName} on ${new Date(date).toLocaleDateString()} at ${time} in ${venue}.`;
  const link = '/advisor/schedule';
  const context = await getCurrentAcademicYearContext();

  // Send email to evaluator
  try {
    if (evaluator.email && evaluator.name) {
      const emailResult = await sendDefenseDutyEmail(
        evaluator.email,
        evaluator.name,
        groupName,
        date,
        time,
        venue
      );
      
      if (!emailResult.success) {
        console.error('Failed to send defense duty email to:', evaluator.email, emailResult.error);
      } else {
        console.log('Defense duty email sent to:', evaluator.email);
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createNotification(evaluatorId, 'defense-duty', title, message, link, context.academicYearId, context.semester);
};

const notifySemesterChange = async (users, semester) => {
  const phase = semester === '1' ? 'Documentation Phase' : 'Implementation Phase';
  const title = `Semester ${semester} Started`;
  const message = `The academic year has moved to Semester ${semester} (${phase}). Some functionalities have been updated accordingly.`;
  const link = null; // No link - informational only
  const context = await getCurrentAcademicYearContext();

  const userIds = users.map(u => u.id || u);

  // Send emails to all users with role-specific content
  try {
    // Separate users by role for specialized emails
    const deptHeads = users.filter(u => u.role === 'dept-head');
    const advisors = users.filter(u => u.role === 'advisor');
    const otherUsers = users.filter(u => !['dept-head', 'advisor'].includes(u.role));

    // Send specialized emails to department heads
    for (const deptHead of deptHeads) {
      if (deptHead.email && deptHead.department) {
        try {
          const emailResult = await sendSemesterChangeToDeptHeadEmail(
            deptHead.email,
            deptHead.name || 'Department Head',
            semester.toString(),
            deptHead.department
          );

          if (!emailResult.success) {
            console.error('Failed to send semester change email to dept head:', deptHead.email, emailResult.error);
          } else {
            console.log('✅ Semester change email sent to dept head:', deptHead.email);
          }
        } catch (emailError) {
          console.error('❌ Email sending error for dept head', deptHead.email, ':', emailError.message);
        }
      }
    }

    // Send specialized emails to advisors
    for (const advisor of advisors) {
      if (advisor.email) {
        try {
          const emailResult = await sendSemesterChangeToAdvisorEmail(
            advisor.email,
            advisor.name || 'Advisor',
            semester.toString()
          );

          if (!emailResult.success) {
            console.error('Failed to send semester change email to advisor:', advisor.email, emailResult.error);
          } else {
            console.log('✅ Semester change email sent to advisor:', advisor.email);
          }
        } catch (emailError) {
          console.error('❌ Email sending error for advisor', advisor.email, ':', emailError.message);
        }
      }
    }

    // Send general email to other users (students, admin, etc.)
    for (const user of otherUsers) {
      const userId = user.id || user;
      const userEmail = user.email;
      const userName = user.name || 'User';
      const userRole = user.role;

      if (userEmail) {
        try {
          const emailResult = await sendSemesterChangeEmail(
            userEmail,
            userName,
            semester.toString(),
            userRole
          );

          if (!emailResult.success) {
            console.error('Failed to send semester change email to:', userEmail, emailResult.error);
          } else {
            console.log('Semester change email sent to:', userEmail);
          }
        } catch (emailError) {
          console.error('❌ Email sending error for user', userEmail, ':', emailError.message);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(userIds, 'semester-change', title, message, link, context.academicYearId, semester.toString());
};

const notifySemesterTermination = async (userIds) => {
  const title = 'Semester Terminated';
  const message = 'The academic semester has been terminated. The system is now in read-only mode.';
  const link = '/faculty-head/academic-year';
  const context = await getCurrentAcademicYearContext();

  return await createBulkNotifications(userIds, 'semester-terminated', title, message, link, context.academicYearId, context.semester);
};

const notifyNewAcademicYear = async (users, yearName, academicYearId = null) => {
  const title = 'New Academic Year Started';
  const message = `The new academic year ${yearName} has begun with Semester 1 (Documentation Phase). All previous semester data has been archived.`;
  const link = null; // No link - informational only
  
  const userIds = users.map(u => u.id || u);

  // Send emails to all users
  try {
    for (const user of users) {
      const userId = user.id || user;
      const userEmail = user.email;
      const userName = user.name || 'User';
      const userRole = user.role;

      if (userEmail) {
        const emailResult = await sendNewAcademicYearEmail(
          userEmail,
          userName,
          yearName,
          userRole
        );

        if (!emailResult.success) {
          console.error('Failed to send new academic year email to:', userEmail, emailResult.error);
        } else {
          console.log('New academic year email sent to:', userEmail);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  // New academic year starts with semester 1
  return await createBulkNotifications(userIds, 'year-started', title, message, link, academicYearId, '1');
};

const notifyGroupFormation = async (groupName, memberIds, department) => {
  const title = 'Group Assignment';
  const message = `You have been assigned to ${groupName} in the ${department} department.`;
  const link = '/student/group';
  const context = await getCurrentAcademicYearContext();

  return await createBulkNotifications(memberIds, 'group-formed', title, message, link, context.academicYearId, context.semester);
};

// Notify ALL students in department about group formation (for department head's group generation)
const notifyGroupFormationToAllStudents = async (department, groupsCreated) => {
  const title = 'Groups Formed';
  const message = `Department has formed ${groupsCreated.length} group(s). Check your group assignment.`;
  const link = '/student/group';
  const context = await getCurrentAcademicYearContext();

  // Send emails to all students in the formed groups
  try {
    for (const group of groupsCreated) {
      if (group.Members && group.Members.length > 0) {
        const memberNames = group.Members.map(m => m.name);
        
        for (const member of group.Members) {
          if (member.email) {
            const emailResult = await sendGroupFormationEmail(
              member.email,
              member.name,
              group.name,
              department,
              member.Section?.name || member.section || 'N/A',
              memberNames
            );
            
            if (!emailResult.success) {
              console.error('Failed to send group formation email to:', member.email, emailResult.error);
            } else {
              console.log('Group formation email sent to:', member.email);
            }
          }
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  // Also create in-app notifications for all students
  const allStudentIds = [];
  groupsCreated.forEach(group => {
    if (group.Members) {
      group.Members.forEach(m => allStudentIds.push(m.id));
    }
  });

  return await createBulkNotifications(allStudentIds, 'group-formed', title, message, link, context.academicYearId, context.semester);
};

const notifyRegistrationApproval = async (studentId, approved) => {
  const title = approved ? 'Registration Approved' : 'Registration Rejected';
  const message = approved
    ? 'Your registration has been approved. You can now log in to the system.'
    : 'Your registration has been rejected. Please contact your department.';
  const context = await getCurrentAcademicYearContext();

  return await createNotification(studentId,
    approved ? 'registration-approved' : 'registration-rejected',
    title, message, null, context.academicYearId, context.semester);
};

const notifyProgressSubmission = async (advisor, groupName, reportTitle, department) => {
  if (!advisor) return null;

  const advisorId = advisor.id || advisor;
  const title = 'Progress Report Submitted';
  const message = `${groupName} has submitted a progress report: "${reportTitle}".`;
  const link = '/advisor/progress-review';
  const context = await getCurrentAcademicYearContext();

  // Send email to advisor
  try {
    if (advisor.email && advisor.name) {
      const emailResult = await sendProgressSubmissionEmail(
        advisor.email,
        advisor.name,
        groupName,
        reportTitle,
        department
      );
      
      if (!emailResult.success) {
        console.error('Failed to send progress submission email to:', advisor.email, emailResult.error);
      } else {
        console.log('Progress submission email sent to:', advisor.email);
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createNotification(advisorId, 'progress-submission', title, message, link, context.academicYearId, context.semester);
};

const notifyDeptHeadNewRegistration = async (deptHeadIds, studentName) => {
  const title = 'New Student Registration';
  const message = `${studentName} has registered and is awaiting approval.`;
  const link = '/dept-head/registrations';
  const context = await getCurrentAcademicYearContext();

  return await createBulkNotifications(deptHeadIds, 'new-registration', title, message, link, context.academicYearId, context.semester);
};

const notifyAdminSupport = async (admins, name, email, message, inquiryId) => {
  const title = 'New Support Inquiry';
  const supportMessage = `From ${name} (${email}): ${message}`;
  const link = '/admin/inquiries';
  const context = await getCurrentAcademicYearContext();

  const adminIds = admins.map(a => a.id || a);

  // Send emails to admins
  try {
    for (const admin of admins) {
      const adminId = admin.id || admin;
      const adminEmail = admin.email;
      const adminName = admin.name || 'Admin';
      
      if (adminEmail) {
        const emailResult = await sendInquirySubmissionEmail(
          adminEmail,
          adminName,
          name,
          email,
          message,
          inquiryId
        );
        
        if (!emailResult.success) {
          console.error('Failed to send inquiry submission email to:', adminEmail, emailResult.error);
        } else {
          console.log('Inquiry submission email sent to:', adminEmail);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }

  return await createBulkNotifications(adminIds, 'system-support', title, supportMessage, link, context.academicYearId, context.semester);
};

// NEW function to send inquiry response to inquirer
const notifyInquiryResponse = async (inquirerEmail, inquirerName, responseMessage, originalMessage, inquiryId) => {
  try {
    if (inquirerEmail && inquirerName) {
      const emailResult = await sendInquiryResponseEmail(
        inquirerEmail,
        inquirerName,
        responseMessage,
        originalMessage,
        inquiryId
      );
      
      if (!emailResult.success) {
        console.error('Failed to send inquiry response email to:', inquirerEmail, emailResult.error);
      } else {
        console.log('Inquiry response email sent to:', inquirerEmail);
      }
      
      return { success: true };
    }
    return { success: false, error: 'Invalid inquirer details' };
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    return { success: false, error: emailError.message };
  }
};

// NEW: Notify department head about new proposal submission
const notifyDeptHeadNewProposal = async (deptHeads, groupName, studentName, proposalTitle, department) => {
  const title = 'New Proposal Submission';
  const message = `${studentName} from Group "${groupName}" has submitted a new proposal: "${proposalTitle}".`;
  const link = '/dept-head/proposals';
  const context = await getCurrentAcademicYearContext();

  // deptHeads can be array of IDs or full user objects with email
  const deptHeadIds = deptHeads.map(dh => dh.id || dh);
  
  console.log(`Preparing to notify department heads: ${deptHeadIds.length} recipients`);
  
  // Send emails to department heads
  try {
    for (const deptHead of deptHeads) {
      const deptHeadId = deptHead.id || deptHead;
      const deptHeadEmail = deptHead.email;
      const deptHeadName = deptHead.name || 'Department Head';
      
      if (deptHeadEmail) {
        const emailResult = await sendProposalSubmissionEmail(
          deptHeadEmail,
          deptHeadName,
          groupName,
          studentName,
          proposalTitle,
          department
        );
        
        if (!emailResult.success) {
          console.error('Failed to send proposal email to:', deptHeadEmail, emailResult.error);
        } else {
          console.log('Proposal submission email sent to:', deptHeadEmail);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }
  
  return await createBulkNotifications(deptHeadIds, 'proposal-submission', title, message, link, context.academicYearId, context.semester);
};

// NEW: Notify group members that proposal was submitted
const notifyProposalSubmission = async (groupName, memberIds) => {
  const title = 'Proposal Submitted';
  const message = `Your group has successfully submitted a proposal for "${groupName}".`;
  const link = '/student/proposal';
  const context = await getCurrentAcademicYearContext();

  console.log(`Preparing to notify group members: ${memberIds.length} recipients`);
  return await createBulkNotifications(memberIds, 'proposal-submission', title, message, link, context.academicYearId, context.semester);
};

// NEW: Notify faculty head about a draft ready for evaluator assignment
const notifyFacultyHeadEvaluatorAssignment = async (facultyHeadIds, groupName, department) => {
  if (!facultyHeadIds || facultyHeadIds.length === 0) return null;

  const title = 'Ready for Evaluator Assignment';
  const message = `Group "${groupName}" (${department}) has an approved final draft and is ready for evaluator assignment.`;
  const link = '/faculty-head/EvaluatorManager';
  const context = await getCurrentAcademicYearContext();

  return await createBulkNotifications(facultyHeadIds, 'evaluator-assignment-ready', title, message, link, context.academicYearId, context.semester);
};

// Notify department head that a draft is ready for their review (after advisor approval)
const notifyDeptHeadDraftReadyForReview = async (deptHeads, groupName, department, draftTitle, advisorName) => {
  if (!deptHeads || deptHeads.length === 0) return null;

  const title = 'Final Draft Ready for Department Review';
  const message = `Group "${groupName}" (${department}) has a final draft approved by their advisor and is ready for your review.`;
  const link = '/dept-head/final-drafts';
  const context = await getCurrentAcademicYearContext();

  const deptHeadIds = deptHeads.map(dh => dh.id || dh);
  
  console.log(`Notifying dept heads about draft ready for review: ${deptHeadIds.length} recipients`);
  
  // Send emails to department heads
  try {
    for (const deptHead of deptHeads) {
      const deptHeadId = deptHead.id || deptHead;
      const deptHeadEmail = deptHead.email;
      const deptHeadName = deptHead.name || 'Department Head';
      
      if (deptHeadEmail) {
        const emailResult = await sendFinalDraftApprovalEmailToDeptHead(
          deptHeadEmail,
          deptHeadName,
          groupName,
          draftTitle,
          department,
          advisorName
        );
        
        if (!emailResult.success) {
          console.error('Failed to send final draft approval email to:', deptHeadEmail, emailResult.error);
        } else {
          console.log('Final draft approval email sent to:', deptHeadEmail);
        }
      }
    }
  } catch (emailError) {
    console.error('Email sending error:', emailError.message);
    // Don't fail the notification if email fails
  }
  
  return await createBulkNotifications(deptHeadIds, 'draft-ready-for-review', title, message, link, context.academicYearId, context.semester);
};

module.exports = {
  // Standard CRUD
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,

  // Internal helpers
  createNotification,
  createBulkNotifications,

  // Notification type helpers
  notifyProjectClaim,
  notifyProposalApproval,
  notifyProposalRejection,
  notifyProgressFeedback,
  notifyFinalDraftApproval,
  notifyDefenseSchedule,
  notifyDeptHeadDefenseScheduled,
  notifyEvaluatorAssignment,
  notifyEvaluatorsAssignedToGroup,
  notifyDeptHeadEvaluatorsAssigned,
  notifyEvaluatorsAssigned,
  notifyDefenseDuty,
  notifySemesterChange,
  notifySemesterTermination,
  notifyNewAcademicYear,
  notifyGroupFormation,
  notifyGroupFormationToAllStudents,
  notifyRegistrationApproval,
  notifyProgressSubmission,
  notifyFinalDraftSubmission,
  notifyDeptHeadNewRegistration,
  notifyAdminSupport,
  notifyInquiryResponse,
  notifyDeptHeadNewProposal,
  notifyProposalSubmission,
  notifyFacultyHeadEvaluatorAssignment,
  notifyDeptHeadDraftReadyForReview
};
