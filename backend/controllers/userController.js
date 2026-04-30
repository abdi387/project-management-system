const User = require('../models/User');
const Section = require('../models/Section');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { notifyRegistrationApproval } = require('./notificationController');
const { sendAccountCreationEmail, sendRegistrationApprovalEmail, sendRegistrationRejectionEmail } = require('../config/email');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Evaluator = require('../models/Evaluator');
const Proposal = require('../models/Proposal');
const ProposalTitle = require('../models/ProposalTitle');
const ProgressReport = require('../models/ProgressReport');
const FinalDraft = require('../models/FinalDraft');
const DefenseSchedule = require('../models/DefenseSchedule');
const AdvisorRepository = require('../models/AdvisorRepository');
const { sequelize } = require('../config/db');

// @desc    Get all users (with filters)
// @route   GET /api/users
// @access  Private (with role-based filtering)
const getUsers = async (req, res) => {
  try {
    const { role, status, department, search } = req.query;
    
    // Build filter object
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    
    // Department heads can only see their own department
    if (req.user.role === 'dept-head') {
      where.department = req.user.department;
    }
    // If department is specified in query, use it (admin only)
    else if (department && req.user.role === 'admin') {
      where.department = department;
    }

    // Add search functionality
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { studentId: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    const where = { role };
    
    // Department heads can only see their department
    if (req.user.role === 'dept-head') {
      where.department = req.user.department;
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Get users by department
// @route   GET /api/users/department/:department
// @access  Private
const getUsersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { role, status } = req.query;
    
    // Check permission
    if (req.user.role === 'dept-head' && req.user.department !== department) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view this department' 
      });
    }

    const where = { department };
    if (role) where.role = role;
    if (status) where.status = status;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users by department error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check permission
    if (req.user.role === 'dept-head' && user.department !== req.user.department) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view this user' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// Resolve a section name or section id to the stored section foreign key id.
const resolveSectionId = async (sectionInput, department) => {
  if (!sectionInput) return null;

  const value = String(sectionInput).trim();
  if (!value) return null;

  // If the input already matches a section id, verify its department if provided.
  const byId = await Section.findByPk(value);
  if (byId) {
    if (department && byId.department !== department) {
      throw new Error('Section does not belong to the selected department.');
    }
    return byId.id;
  }

  const normalizedSection = value.toUpperCase();
  const validSection = await Section.findOne({
    where: {
      name: normalizedSection,
      department,
      isActive: true
    }
  });

  if (!validSection) {
    throw new Error('Invalid section. Please select a valid section for the given department.');
  }

  return validSection.id;
};

// @desc    Create new user (admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      email, password, name, role, department,
      studentId, section, cgpa, gender, status
    } = req.body;

    console.log('Creating new user:', { email, name, role, department });

    // Check if user exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Check studentId if provided
    if (studentId) {
      const existingStudentId = await User.findOne({
        where: { studentId }
      });
      if (existingStudentId) {
        return res.status(400).json({
          success: false,
          error: 'Student ID already exists'
        });
      }
    }

    let sectionId = null;
    if (role === 'student') {
      try {
        sectionId = await resolveSectionId(section, department);
      } catch (sectionError) {
        return res.status(400).json({
          success: false,
          error: sectionError.message
        });
      }
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role,
      department: role !== 'admin' && role !== 'faculty-head' ? department : null,
      status: status || 'active',
      studentId: role === 'student' ? studentId : null,
      section: role === 'student' ? sectionId : null,
      cgpa: role === 'student' ? parseFloat(cgpa) : null,
      gender: role === 'student' ? gender : null
    });

    console.log('User created successfully:', user.id);

    // Send account creation email asynchronously (don't block response)
    setImmediate(async () => {
      console.log('Sending account creation email to:', email);
      try {
        const emailResult = await sendAccountCreationEmail(email, name, password, role);
        if (!emailResult.success) {
          console.error('❌ Failed to send account creation email:', emailResult.error);
        } else {
          console.log('✅ Account creation email sent successfully to:', email, 'Message ID:', emailResult.messageId);
        }
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError.message);
        // Don't fail the user creation if email fails
      }
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully. Account creation email will be sent shortly.',
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Create user error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Fields that can be updated
    const updatableFields = [
      'name', 'email', 'role', 'department', 'status',
      'section', 'cgpa', 'profilePicture', 'phone', 'studentId', 'gender'
    ];

    // Update only provided fields
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Handle password update separately
    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false, 
        error: error.errors.map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Update own profile (for any authenticated user)
// @route   PUT /api/users/profile/me
// @access  Private
const updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from auth token
    const { name, profilePicture, phone } = req.body;

    console.log(`Updating profile for user: ${userId}`);
    console.log(`Profile picture length: ${profilePicture?.length || 0}`);

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Only allow updating specific fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (profilePicture !== undefined) {
      // Optional: Validate that it's a valid data URL
      if (profilePicture && !profilePicture.startsWith('data:image')) {
        console.warn('Profile picture might not be a valid data URL');
      }
      user.profilePicture = profilePicture;
    }

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    console.log('Profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update own profile error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false, 
        error: error.errors.map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete the last admin user' 
        });
      }
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Approve student registration
// @route   PUT /api/users/:id/approve
// @access  Private/Dept-Head
const approveStudent = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        error: 'User is not a student'
      });
    }

    // Check department permission
    if (req.user.role === 'dept-head' && user.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve students from other departments'
      });
    }

    user.status = 'active';
    await user.save();

    // Send registration approval email asynchronously (don't block response)
    setImmediate(async () => {
      // Send registration approval email to student
      try {
        const emailResult = await sendRegistrationApprovalEmail(
          user.email,
          user.name,
          user.department,
          user.studentId
        );
        if (!emailResult.success) {
          console.error('Failed to send registration approval email:', emailResult.error);
        } else {
          console.log('Registration approval email sent to:', user.email);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError.message);
      }

      // Notify student about approval
      try {
        await notifyRegistrationApproval(user.id, true);
      } catch (notifError) {
        console.error('Failed to send approval notification:', notifError);
      }
    });

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Student approved successfully. Approval email will be sent shortly.',
      user: userResponse
    });
  } catch (error) {
    console.error('Approve student error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Reject student registration
// @route   PUT /api/users/:id/reject
// @access  Private/Dept-Head
const rejectStudent = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ 
        success: false, 
        error: 'User is not a student' 
      });
    }

    // Check department permission
    if (req.user.role === 'dept-head' && user.department !== req.user.department) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to reject students from other departments' 
      });
    }

    user.status = 'rejected';
    await user.save();

    // Send registration rejection email asynchronously (don't block response)
    setImmediate(async () => {
      // Send registration rejection email to student
      try {
        const rejectionReason = req.body.reason || 'Your registration did not meet the requirements. Please contact your department for more information.';
        const emailResult = await sendRegistrationRejectionEmail(
          user.email,
          user.name,
          user.department,
          rejectionReason
        );
        if (!emailResult.success) {
          console.error('Failed to send registration rejection email:', emailResult.error);
        } else {
          console.log('Registration rejection email sent to:', user.email);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError.message);
      }

      // Notify student about rejection
      try {
        await notifyRegistrationApproval(user.id, false);
      } catch (notifError) {
        console.error('Failed to send rejection notification:', notifError);
      }
    });

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Student rejected. Rejection email will be sent shortly.',
      user: userResponse
    });
  } catch (error) {
    console.error('Reject student error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get pending students for department
// @route   GET /api/users/pending/:department
// @access  Private/Dept-Head
const getPendingStudents = async (req, res) => {
  try {
    const { department } = req.params;

    // Verify department matches logged in user's department
    if (req.user.department !== department && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this department'
      });
    }

    const students = await User.findAll({
      where: {
        role: 'student',
        department,
        status: 'pending'
      },
      attributes: { exclude: ['password'] },
      include: [{ model: Section, as: 'Section', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    console.error('Get pending students error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Deactivate all students (when starting new academic year)
// @route   PUT /api/users/students/deactivate-all
// @access  Private/Faculty-Head
const deactivateStudents = async (req, res) => {
  try {
    const result = await User.update(
      { status: 'inactive' },
      {
        where: {
          role: 'student',
          status: 'active'
        }
      }
    );

    res.json({
      success: true,
      message: `Successfully deactivated ${result[0]} students`,
      deactivatedCount: result[0]
    });
  } catch (error) {
    console.error('Deactivate students error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// TEMPORARY: Test route to check stored profile picture
const testGetProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'name', 'profilePicture']
    });
    res.json({
      success: true,
      user,
      hasPicture: !!user?.profilePicture,
      pictureLength: user?.profilePicture?.length || 0,
      pictureStart: user?.profilePicture?.substring(0, 50) || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Reset all system data except users
// @route   DELETE /api/users/reset-data
// @access  Private/Admin
const resetSystemData = async (req, res) => {
  try {
    console.log('Reset system data requested by:', req.user.email);

    const transaction = await sequelize.transaction();

    // Delete in order to respect foreign key constraints
    // 1. Delete group members first (they reference groups and users)
    const groupMembersDeleted = await GroupMember.destroy({ where: {}, transaction });
    console.log('Deleted group members:', groupMembersDeleted);

    // 2. Delete evaluators
    const evaluatorsDeleted = await Evaluator.destroy({ where: {}, transaction });
    console.log('Deleted evaluators:', evaluatorsDeleted);

    // 3. Delete defense schedules
    const defenseSchedulesDeleted = await DefenseSchedule.destroy({ where: {}, transaction });
    console.log('Deleted defense schedules:', defenseSchedulesDeleted);

    // 4. Delete final drafts
    const finalDraftsDeleted = await FinalDraft.destroy({ where: {}, transaction });
    console.log('Deleted final drafts:', finalDraftsDeleted);

    // 5. Delete progress reports
    const progressReportsDeleted = await ProgressReport.destroy({ where: {}, transaction });
    console.log('Deleted progress reports:', progressReportsDeleted);

    // 6. Delete proposal titles
    const proposalTitlesDeleted = await ProposalTitle.destroy({ where: {}, transaction });
    console.log('Deleted proposal titles:', proposalTitlesDeleted);

    // 7. Delete proposals
    const proposalsDeleted = await Proposal.destroy({ where: {}, transaction });
    console.log('Deleted proposals:', proposalsDeleted);

    // 8. Delete advisor repositories
    const advisorRepositoriesDeleted = await AdvisorRepository.destroy({ where: {}, transaction });
    console.log('Deleted advisor repositories:', advisorRepositoriesDeleted);

    // 9. Delete groups last
    const groupsDeleted = await Group.destroy({ where: {}, transaction });
    console.log('Deleted groups:', groupsDeleted);

    await transaction.commit();

    console.log('System data reset by admin:', req.user.email);
    console.log('Total records deleted:', 
      groupMembersDeleted + evaluatorsDeleted + defenseSchedulesDeleted + 
      finalDraftsDeleted + progressReportsDeleted + proposalTitlesDeleted + 
      proposalsDeleted + advisorRepositoriesDeleted + groupsDeleted);

    res.json({
      success: true,
      message: 'All system data has been reset successfully. User accounts are preserved.'
    });
  } catch (error) {
    console.error('Reset system data error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset system data',
      details: error.toString()
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  approveStudent,
  rejectStudent,
  getPendingStudents,
  getUsersByRole,
  getUsersByDepartment,
  updateOwnProfile,
  testGetProfile,
  deactivateStudents,
  resetSystemData
};