const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  submitInquiry,
  getInquiries,
  resolveInquiry,
  deleteInquiry
} = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/auth');

// Public route
router.post('/', 
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  submitInquiry
);

// Admin only routes
router.get('/', protect, authorize('admin'), getInquiries);
router.put('/:id/resolve', protect, authorize('admin'), resolveInquiry);
router.delete('/:id', protect, authorize('admin'), deleteInquiry);

module.exports = router;