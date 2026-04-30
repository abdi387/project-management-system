const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  submitProposal,
  getProposalsByDepartment,
  getProposalByGroupId,
  approveProposal,
  rejectProposal
} = require('../controllers/proposalController');
const { protect, authorize, checkActive } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { generateTitleSuggestions, getAIHealth } = require('../services/aiTitleSuggestionService');

// Validation for proposal submission
const proposalValidation = [
  body('groupId').notEmpty().withMessage('Group ID is required'),
  body('titles').isArray({ min: 3, max: 3 }).withMessage('Exactly 3 titles are required'),
  body('titles.*.title').notEmpty().withMessage('Title is required')
    .isLength({ min: 10 }).withMessage('Title must be at least 10 characters'),
  body('titles.*.domain').notEmpty().withMessage('Domain is required'),
  body('titles.*.description').notEmpty().withMessage('Description is required')
    .isLength({ min: 50 }).withMessage('Description must be at least 50 characters')
];

// AI Title Suggestion routes (NO authentication required - publicly accessible for students)
// Rate limit AI suggestions: 10 per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: 'Too many AI requests. Please wait 1 minute.',
    errorType: 'rate_limit'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Try again in 1 minute.',
      errorType: 'rate_limit',
      retryAfter: 60
    });
  }
});

// AI Healthcheck (public)
router.get('/ai-health', (req, res) => {
  res.json({
    success: true,
    endpoint: '/api/proposals/ai-health',
    ...getAIHealth()
  });
});

// AI Title Suggestions (rate limited, public)
router.post('/ai-suggest-titles', aiLimiter, async (req, res) => {
  try {
    const { domain, keywords, interests, description } = req.body;

    // Sanitize & validate inputs
    const cleanQuery = {
      domain: (domain || '').trim().substring(0, 100),
      keywords: (keywords || '').trim().substring(0, 200),
      interests: (interests || '').trim().substring(0, 200),
      description: (description || '').trim().substring(0, 1000)
    };

    if (!cleanQuery.domain && !cleanQuery.keywords && !cleanQuery.interests && !cleanQuery.description) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one input field'
      });
    }

    const result = await generateTitleSuggestions(cleanQuery);
    res.json(result);

  } catch (error) {
    console.error('AI Title Generation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorType: 'server'
    });
  }
});

// All routes below require authentication
router.use(protect);
router.use(checkActive);

// Student routes (authenticated)
router.post('/', authorize('student'), proposalValidation, submitProposal);
router.get('/group/:groupId', getProposalByGroupId);

// Department head routes (authenticated)
router.get('/department/:department', authorize('dept-head', 'admin', 'faculty-head'), getProposalsByDepartment); // ADDED faculty-head
router.put('/:id/approve', authorize('dept-head'), approveProposal);
router.put('/:id/reject', authorize('dept-head'), rejectProposal);

module.exports = router;