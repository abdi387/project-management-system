const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getGroups,
  getGroupById,
  getGroupByStudentId,
  generateGroups,
  deleteGroups,
  assignAdvisor,
  assignEvaluators,
  getGroupsForEvaluator,
  getAvailableProjects,
} = require('../controllers/groupController');
const { protect, authorize, checkActive } = require('../middleware/auth');

// All routes require authentication
router.use(protect);
router.use(checkActive);

// Public-ish routes (accessible by multiple roles)
router.get('/', getGroups);
router.get('/available-projects', authorize('advisor'), getAvailableProjects);
router.get('/evaluator/:evaluatorId', getGroupsForEvaluator);
router.get('/student/:studentId', getGroupByStudentId);
router.get('/:id', getGroupById);

// Department head routes
router.post('/generate', 
  authorize('dept-head'),
  [
    body('department').isIn(['Computer Science', 'Information Technology', 'Information Systems']),
    body('maxPerGroup').isInt({ min: 2, max: 10 })
  ],
  generateGroups
);

// Delete route for undo functionality (department head only)
router.delete('/',
  authorize('dept-head'),
  deleteGroups
);

// Advisor routes
router.put('/:id/assign-advisor',
  authorize('advisor'),
  [body('advisorId').notEmpty()],
  assignAdvisor
);

// Faculty head routes
router.post('/:id/evaluators',
  authorize('faculty-head'),
  [body('evaluatorIds').isArray().withMessage('Evaluator IDs must be an array')],
  assignEvaluators
);

module.exports = router;