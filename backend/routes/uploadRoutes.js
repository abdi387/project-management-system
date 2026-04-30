const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const progressUpload = require('../middleware/progressUpload');
const { protect } = require('../middleware/auth');
const { uploadProfilePicture, uploadProgressFile } = require('../controllers/uploadController');

// Debug middleware to check authentication
router.use((req, res, next) => {
  console.log('Upload route accessed');
  console.log('Headers:', req.headers);
  next();
});

// Protect all upload routes
router.use(protect);

// Upload profile picture
router.post('/profile-picture', (req, res, next) => {
  console.log('Processing profile picture upload');
  next();
}, upload.single('image'), uploadProfilePicture);

// Upload progress report document
router.post('/progress-report', (req, res, next) => {
  console.log('Processing progress report upload');
  next();
}, progressUpload.single('file'), uploadProgressFile);

// Test route to check if upload route is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Upload route is working',
    user: req.user.id 
  });
});

module.exports = router;