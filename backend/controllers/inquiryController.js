const { Inquiry, User } = require('../models');
const { validationResult } = require('express-validator');
const { notifyAdminSupport, notifyInquiryResponse } = require('./notificationController');

// @desc    Submit inquiry (public)
// @route   POST /api/inquiries
// @access  Public
const submitInquiry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, message } = req.body;

    const inquiry = await Inquiry.create({
      name,
      email,
      message,
      status: 'pending'
    });

    // Notify all admins with email asynchronously
    setImmediate(async () => {
      try {
        const admins = await User.findAll({
          where: { role: 'admin' },
          attributes: ['id', 'name', 'email']
        });

        if (admins.length > 0) {
          await notifyAdminSupport(admins, name, email, message, inquiry.id);
          console.log(`✅ Inquiry notification sent to ${admins.length} admins`);
        }
      } catch (notifError) {
        console.error('❌ Failed to send inquiry notification:', notifError);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. Our team will respond to you soon.',
      inquiry
    });
  } catch (error) {
    console.error('Submit inquiry error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get all inquiries (admin only)
// @route   GET /api/inquiries
// @access  Private/Admin
const getInquiries = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const inquiries = await Inquiry.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: inquiries.length,
      inquiries
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Mark inquiry as resolved
// @route   PUT /api/inquiries/:id/resolve
// @access  Private/Admin
const resolveInquiry = async (req, res) => {
  try {
    const { response, status } = req.body; // Admin's response message and status
    const inquiry = await Inquiry.findByPk(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found'
      });
    }

    console.log('Resolving inquiry:', inquiry.id);
    console.log('Admin response:', response);
    console.log('Status:', status);
    console.log('Inquirer email:', inquiry.email);
    console.log('Inquirer name:', inquiry.name);

    // Update status if provided
    if (status) {
      inquiry.status = status;
    }
    
    // Update response if provided
    if (response !== undefined) {
      inquiry.response = response;
    }
    
    if (status === 'resolved') {
      inquiry.resolvedAt = new Date();
    }
    
    await inquiry.save();

    console.log('Inquiry saved - status:', inquiry.status, 'response:', inquiry.response);

    // Send email notification to inquirer asynchronously
    if (response && inquiry.email && inquiry.name) {
      setImmediate(async () => {
        try {
          console.log('Sending email notification to:', inquiry.email);
          const emailResult = await notifyInquiryResponse(
            inquiry.email,
            inquiry.name,
            response,
            inquiry.message,
            inquiry.id
          );
          console.log('Email notification result:', emailResult);
        } catch (emailError) {
          console.error('Failed to send inquiry response email:', emailError);
          // Don't fail the response if email fails
        }
      });
    } else {
      console.log('Skipping email - missing response, email, or name');
    }

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      inquiry
    });
  } catch (error) {
    console.error('Resolve inquiry error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private/Admin
const deleteInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findByPk(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inquiry not found' 
      });
    }

    await inquiry.destroy();

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

module.exports = {
  submitInquiry,
  getInquiries,
  resolveInquiry,
  deleteInquiry
};