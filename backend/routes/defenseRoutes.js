const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createDefenseSchedule,
  getDefenseSchedules,
  getDefenseScheduleByGroup,
  updateDefenseSchedule,
  deleteDefenseSchedule,
  generateDefenseSchedule
} = require('../controllers/defenseController');
const { protect, authorize, checkActive } = require('../middleware/auth');

// Validation
const scheduleValidation = [
  body('groupId').notEmpty().withMessage('Group ID is required'),
  body('date').isDate().withMessage('Valid date is required'),
  body('time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid time in HH:MM format is required'),
  body('venueId').notEmpty().withMessage('Venue ID is required')
];

// All routes require authentication
router.use(protect);
router.use(checkActive);

// Public-ish routes (accessible by multiple roles)
router.get('/', getDefenseSchedules);
router.get('/group/:groupId', getDefenseScheduleByGroup);

// Faculty head only routes
router.post('/', authorize('faculty-head'), scheduleValidation, createDefenseSchedule);
router.put('/:id', authorize('faculty-head'), updateDefenseSchedule);
router.delete('/:id', authorize('faculty-head'), deleteDefenseSchedule);

// Add the new route for auto-generation
router.post('/generate', authorize('faculty-head'), generateDefenseSchedule);

module.exports = router;