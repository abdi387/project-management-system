const { User, PasswordResetToken, Section } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail, sendAccountApprovalEmail, sendAccountRejectionEmail, sendAccountCreationEmail, sendStudentRegistrationEmail } = require('../config/email');
const { sequelize } = require('../config/db');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { notifyDeptHeadNewRegistration } = require('./notificationController');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register a new user (student only)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let { email, password, name, studentId, department, section, cgpa, gender } = req.body;

    email = String(email || '').trim();
    name = String(name || '').trim();
    studentId = String(studentId || '').trim();
    department = String(department || '').trim();
    section = section ? String(section).trim().toUpperCase() : '';
    gender = String(gender || '').trim();
    const cgpaValue = parseFloat(cgpa);

    console.log('Student registration submitted:', { email, name, studentId, department, section, cgpa: cgpaValue, gender });

    // Strict server-side validation to avoid database errors
    if (!email || !password || !name || !studentId || !department || !section || !gender) {
      return res.status(400).json({
        success: false,
        error: 'All registration fields are required.'
      });
    }

    if (Number.isNaN(cgpaValue) || cgpaValue < 2.0 || cgpaValue > 4.0) {
      return res.status(400).json({
        success: false,
        error: 'CGPA must be a number between 2.0 and 4.0.'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Check if studentId exists
    const studentIdExists = await User.findOne({ where: { studentId } });
    if (studentIdExists) {
      return res.status(400).json({
        success: false,
        error: 'Student ID already registered'
      });
    }

    // Validate section against configured sections for the department
    let sectionId = null;
    if (section) {
      const validSection = await Section.findOne({
        where: {
          name: section,
          department,
          isActive: true
        }
      });

      if (!validSection) {
        return res.status(400).json({
          success: false,
          error: 'Invalid section. Please select a valid section for your department.'
        });
      }
      sectionId = validSection.id;
    }

    // Create user with pending status, storing the section foreign key id
    const user = await User.create({
      email,
      password,
      name,
      role: 'student',
      status: 'pending',
      studentId,
      department,
      section: sectionId,
      cgpa: cgpaValue,
      gender
    });

    console.log('Student user created:', user.id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    userResponse.section = section;

    // Send email notification to department head and create in-app notification asynchronously
    setImmediate(async () => {
      try {
        const deptHead = await User.findOne({
          where: {
            role: 'dept-head',
            department: department
          }
        });

        if (deptHead) {
          console.log('Sending registration notification to department head:', deptHead.email);
          
          // Send email
          const emailResult = await sendStudentRegistrationEmail(
            deptHead.email,
            deptHead.name,
            name,
            email,
            studentId,
            department
          );

          if (!emailResult.success) {
            console.error('❌ Failed to send registration email to dept head:', emailResult.error);
          } else {
            console.log('✅ Registration email sent to dept head:', deptHead.email, 'Message ID:', emailResult.messageId);
          }

          // Create in-app notification for department head
          try {
            await notifyDeptHeadNewRegistration([deptHead.id], name);
            console.log('✅ In-app notification created for dept head:', deptHead.id);
          } catch (notifError) {
            console.error('❌ Failed to create in-app notification for dept head:', notifError);
          }
        } else {
          console.log('⚠️ No department head found for department:', department);
        }
      } catch (emailError) {
        console.error('❌ Department head notification error:', emailError.message);
        // Don't fail the registration if email fails
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted! Please wait for Department Head approval.',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        success: false,
        error: 'Database error during registration. Please contact the administrator.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user with password included
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check user status
    if (user.status === 'pending') {
      return res.status(403).json({ 
        success: false, 
        error: 'Your registration is still pending approval from your Department Head.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        error: 'Your account is not active. Please contact administrator.'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error. Please try again.' 
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    // Return user with sessionEndedAt included
    const userResponse = user.toJSON();
    
    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, profilePicture } = req.body;
    const user = await User.findByPk(req.user.id);

    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Logout user (client side only - token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Record when the user's session ended
    if (req.user) {
      req.user.sessionEndedAt = new Date();
      await req.user.save({ hooks: false });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// ==================== PASSWORD RESET FUNCTIONS ====================

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });

    // Always return success message to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Create or update reset token in database
    const [resetTokenRecord, created] = await PasswordResetToken.findOrCreate({
      where: { userId: user.id },
      defaults: {
        userId: user.id,
        token: resetToken,
        expiresAt: resetTokenExpiry
      }
    });

    if (!created) {
      // Update existing token
      resetTokenRecord.token = resetToken;
      resetTokenRecord.expiresAt = resetTokenExpiry;
      await resetTokenRecord.save();
    }

    // Send email asynchronously (non-blocking) - fire and forget
    sendPasswordResetEmail(user.email, resetToken, user.name).then(emailResult => {
      if (!emailResult.success) {
        console.error('Failed to send reset email:', emailResult.error);
      } else {
        console.log('✅ Password reset email sent to:', user.email);
      }
    }).catch(emailError => {
      console.error('Password reset email error:', emailError.message);
    });

    // Respond immediately to user
    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
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

    const { token } = req.params;
    const { password } = req.body;

    // Find valid reset token
    const resetTokenRecord = await PasswordResetToken.findOne({
      where: {
        token,
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'email', 'name']
      }]
    });

    if (!resetTokenRecord || !resetTokenRecord.User) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const user = resetTokenRecord.User;

    // Update user password - DO NOT hash manually
    // The User model's beforeUpdate hook will handle hashing automatically
    user.password = password;
    await user.save({ transaction });

    // Delete used reset token
    await resetTokenRecord.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Verify reset token
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const resetTokenRecord = await PasswordResetToken.findOne({
      where: {
        token,
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetTokenRecord) {
      return res.json({
        success: false,
        valid: false,
        error: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      valid: true
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Initiate password reset for logged-in user
// @route   POST /api/auth/reset-password-initiate
// @access  Private
const resetPasswordInitiate = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Create or update reset token in database
    const [resetTokenRecord, created] = await PasswordResetToken.findOrCreate({
      where: { userId: user.id },
      defaults: {
        userId: user.id,
        token: resetToken,
        expiresAt: resetTokenExpiry
      }
    });

    if (!created) {
      // Update existing token
      resetTokenRecord.token = resetToken;
      resetTokenRecord.expiresAt = resetTokenExpiry;
      await resetTokenRecord.save();
    }

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.name);

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send reset email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset link sent to your email!'
    });
  } catch (error) {
    console.error('Reset password initiate error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Change password with current password verification
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
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

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Find user with password
    const user = await User.findByPk(userId, {
      attributes: { include: ['password'] }
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update user password - DO NOT hash manually
    // The User model's beforeUpdate hook will handle hashing automatically
    user.password = newPassword;
    await user.save({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Heartbeat to keep session alive
// @route   POST /api/auth/heartbeat
// @access  Private
const heartbeat = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Update user's lastLogin time
    req.user.lastLogin = new Date();
    await req.user.save({ hooks: false });

    res.json({
      success: true,
      message: 'Heartbeat received',
      lastLogin: req.user.lastLogin
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  resetPasswordInitiate,
  changePassword,
  heartbeat
};
