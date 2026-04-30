const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// @desc    Upload profile picture
// @route   POST /api/upload/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    console.log('📸 Upload request received');
    console.log('File:', req.file);
    console.log('User ID:', req.user.id);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ File uploaded successfully:', req.file.filename);

    // Delete old profile picture if exists
    if (user.profilePicture) {
      // Extract filename from the stored path
      const oldFileName = path.basename(user.profilePicture);
      const oldPath = path.join(__dirname, '../uploads/profiles', oldFileName);
      
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('🗑️ Old profile picture deleted:', oldFileName);
      }
    }

    // Store relative path in database (starting with /uploads/)
    const relativePath = `/uploads/profiles/${req.file.filename}`;
    user.profilePicture = relativePath;
    await user.save();

    // Create full URL for frontend
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}${relativePath}`;

    console.log('🔗 Image URL:', imageUrl);

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      imageUrl: imageUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: imageUrl
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture: ' + error.message
    });
  }
};

// @desc    Upload a progress report file
// @route   POST /api/upload/progress-report
// @access  Private
const uploadProgressFile = async (req, res) => {
  try {
    console.log('📄 Progress report upload request received');
    console.log('File:', req.file);
    console.log('User ID:', req.user.id);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No progress report file uploaded'
      });
    }

    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const relativePath = `/uploads/progress-reports/${filename}`;

    res.json({
      success: true,
      message: 'Progress report file uploaded successfully',
      filename,
      originalName,
      fileUrl: relativePath
    });
  } catch (error) {
    console.error('❌ Progress report upload error:', error);

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting progress report file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload progress report file: ' + error.message
    });
  }
};

module.exports = {
  uploadProfilePicture,
  uploadProgressFile
};