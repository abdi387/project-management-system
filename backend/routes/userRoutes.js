const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
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
  deactivateStudents,
  resetSystemData
} = require('../controllers/userController');
const { protect, authorize, checkActive } = require('../middleware/auth');

// All routes require authentication
router.use(protect);
router.use(checkActive);

// Get all users (with filters) - accessible by admin, dept-head, faculty-head
router.get('/', authorize('admin', 'dept-head', 'faculty-head'), getUsers);

// Get users by role
router.get('/role/:role', authorize('admin', 'dept-head', 'faculty-head'), getUsersByRole);

// Get users by department
router.get('/department/:department', authorize('admin', 'dept-head', 'faculty-head'), getUsersByDepartment);

// Get pending students for department
router.get('/pending/:department', authorize('dept-head', 'admin'), getPendingStudents);

// Get single user by ID - MODIFIED: Allow users to view themselves
router.get('/:id', async (req, res, next) => {
  // If user is requesting their own data, allow it
  if (req.params.id === req.user.id) {
    return getUserById(req, res);
  }
  // Otherwise, check authorization
  return authorize('admin', 'dept-head', 'advisor')(req, res, next);
}, getUserById);

// UPDATE OWN PROFILE - Allow users to update their own profile
router.put('/profile/me', updateOwnProfile);

// Reset all system data except users (admin only) - MUST BE BEFORE /:id routes
router.delete('/reset-data', authorize('admin'), resetSystemData);

// Create new user (admin only)
router.post('/',
  authorize('admin'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['student', 'advisor', 'dept-head', 'faculty-head', 'admin'])
      .withMessage('Valid role is required')
  ],
  createUser
);

// Update user (admin only)
router.put('/:id', authorize('admin'), updateUser);

// Delete user (admin only)
router.delete('/:id', authorize('admin'), deleteUser);

// Approve student registration
router.put('/:id/approve', authorize('dept-head', 'admin'), approveStudent);

// Reject student registration
router.put('/:id/reject', authorize('dept-head', 'admin'), rejectStudent);

// Deactivate all students (for starting new academic year)
router.put('/students/deactivate-all', authorize('faculty-head', 'admin'), deactivateStudents);

module.exports = router;