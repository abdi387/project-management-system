const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCurrentAcademicYear,
  startNewAcademicYear,
  switchSemester,
  getSystemSettings,
  updateSystemSetting,
  getPasswordMinLength,
  getRegistrationStatus,
  toggleRegistration,
  getProjectDomains,
  addProjectDomain,
  deleteProjectDomain,
  getVenues,
  addVenue,
  deleteVenue,
  clearCache,
  getCacheStats,
  createBackup,
  getBackupList,
  restoreBackup,
  deleteBackup,
  downloadBackup,
  getBackupStats,
  updateBackupSettings,
  stopBackup,
  getBackupStatus
} = require('../controllers/academicYearController');
const { protect, authorize, checkActive } = require('../middleware/auth');

// Public routes
router.get('/registration', getRegistrationStatus);
router.get('/settings/password-min-length', getPasswordMinLength);

// All other routes require authentication
router.use(protect);
router.use(checkActive);

// Academic year routes
router.get('/current', getCurrentAcademicYear);
router.post('/start', authorize('faculty-head'), 
  body('yearName').matches(/^\d{4}\/\d{4}$/).withMessage('Year must be in format YYYY/YYYY'),
  body('startDate').isDate().withMessage('Valid start date is required'),
  startNewAcademicYear
);
router.put('/semester', authorize('faculty-head'),
  body('semester').isIn(['1', '2']).withMessage('Semester must be 1 or 2'),
  switchSemester
);

// System settings - FIXED: Allow faculty-head to update settings
router.get('/settings', authorize('faculty-head', 'admin', 'dept-head'), getSystemSettings);
router.put('/settings/:key', authorize('faculty-head', 'admin'), updateSystemSetting); // FIXED: Added faculty-head
router.put('/registration/toggle', authorize('admin'), toggleRegistration);

// Cache management
router.get('/cache/stats', authorize('admin'), getCacheStats);
router.post('/cache/clear', authorize('admin'), clearCache);

// Backup management
router.get('/backup/stats', authorize('admin'), getBackupStats);
router.get('/backup/list', authorize('admin'), getBackupList);
router.get('/backup/download/:filename', authorize('admin'), downloadBackup);
router.get('/backup/status', authorize('admin'), getBackupStatus);
router.post('/backup/create', authorize('admin'), createBackup);
router.post('/backup/restore', authorize('admin'), restoreBackup);
router.post('/backup/stop', authorize('admin'), stopBackup);
router.delete('/backup/:filename', authorize('admin'), deleteBackup);
router.put('/backup/settings', authorize('admin'), updateBackupSettings);

// Project domains (faculty head)
router.get('/domains', getProjectDomains);
router.post('/domains', authorize('faculty-head'),
  body('name').notEmpty().withMessage('Domain name is required'),
  addProjectDomain
);
router.delete('/domains/:name', authorize('faculty-head'), deleteProjectDomain);

// Venues (faculty head)
router.get('/venues', getVenues);
router.post('/venues', authorize('faculty-head'),
  body('name').notEmpty().withMessage('Venue name is required'),
  addVenue
);
router.delete('/venues/:id', authorize('faculty-head'), deleteVenue);

module.exports = router;