const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
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
} = require('../controllers/authController');
const { protect, checkActive, getPasswordMinLength } = require('../middleware/auth');

// Registration validation - NO EMAIL DOMAIN RESTRICTION
const registerValidation = [
  body('name').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  // NO CUSTOM EMAIL VALIDATION HERE
  body('password').custom(async (value) => {
    const minLength = await getPasswordMinLength();
    if (value.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters`);
    }
    return true;
  }),
  body('studentId').notEmpty().withMessage('Student ID is required')
    .matches(/^\d{4}\/\d{2}$/).withMessage('Invalid Student ID format (e.g., 1234/14)'),
  body('department').isIn(['Computer Science', 'Information Technology', 'Information Systems'])
    .withMessage('Valid department is required'),
  body('section').notEmpty().withMessage('Section is required'),
  body('cgpa').isFloat({ min: 2.0, max: 4.0 }).withMessage('CGPA must be between 2.0 and 4.0'),
  body('gender').isIn(['male', 'female']).withMessage('Gender is required')
];

// Login validation - NO EMAIL DOMAIN RESTRICTION
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  // NO CUSTOM EMAIL VALIDATION HERE
  body('password').notEmpty().withMessage('Password is required')
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required')
];

// Reset password validation
const resetPasswordValidation = [
  body('password')
    .custom(async (value) => {
      const minLength = await getPasswordMinLength();
      if (value.length < minLength) {
        throw new Error(`Password must be at least ${minLength} characters`);
      }
      return true;
    })
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Password reset routes (public)
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

// Protected password reset routes
router.post('/reset-password-initiate', protect, checkActive, resetPasswordInitiate);
router.post('/change-password', changePasswordValidation, protect, checkActive, changePassword);

// Protected routes
router.get('/me', protect, checkActive, getMe);
router.put('/profile', protect, checkActive, updateProfile);
router.post('/logout', protect, logout);
router.post('/heartbeat', protect, heartbeat);

module.exports = router;