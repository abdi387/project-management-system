const express = require('express');
const router = express.Router();
const {
  getAllSections,
  getSectionsByDepartment,
  upsertSection,
  deleteSection,
  bulkSaveSections,
  getSectionsGroupedByDepartment
} = require('../controllers/sectionController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/', getAllSections);
router.get('/department/:department', getSectionsByDepartment);

// Protected routes (require authentication)
router.use(protect);
router.use(authorize('student', 'advisor', 'dept-head', 'faculty-head', 'admin'));

// Get sections grouped by department
router.get('/grouped', getSectionsGroupedByDepartment);

// Create or update section (admin & faculty-head only)
router.post('/', authorize('admin', 'faculty-head'), upsertSection);

// Bulk save sections (admin & faculty-head only)
router.post('/bulk', authorize('admin', 'faculty-head'), bulkSaveSections);

// Delete section (admin & faculty-head only)
router.delete('/:id', authorize('admin', 'faculty-head'), deleteSection);

module.exports = router;
