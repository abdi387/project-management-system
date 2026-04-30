const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  submitProgressReport,
  getProgressReportsByGroup,
  getProgressReportsByAdvisor,
  addFeedback,
  checkOverdueReports
} = require('../controllers/progressController');
const { protect, authorize, checkActive } = require('../middleware/auth');

// Validation
const reportValidation = [
  body('groupId').notEmpty().withMessage('Group ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('fileUrl').optional({ nullable: true, checkFalsy: true })
];

const feedbackValidation = [
  body('feedback').notEmpty().withMessage('Feedback is required')
];

// All routes require authentication
router.use(protect);
router.use(checkActive);

// Student routes
router.post('/', authorize('student'), reportValidation, submitProgressReport);
router.get('/group/:groupId', getProgressReportsByGroup);

// Advisor routes
router.get('/advisor/:advisorId', authorize('advisor', 'admin'), getProgressReportsByAdvisor);
router.put('/:id/feedback', authorize('advisor'), feedbackValidation, addFeedback);

// Admin routes
router.post('/check-overdue', authorize('admin'), checkOverdueReports);

module.exports = router;