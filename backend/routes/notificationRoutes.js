const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');
const { protect, checkActive } = require('../middleware/auth');

// All routes require authentication
router.use(protect);
router.use(checkActive);

// Notification routes
router.get('/', getUserNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/clear-all', clearAllNotifications);

module.exports = router;