const AcademicYear = require('../models/AcademicYear');
const SystemSetting = require('../models/SystemSetting');
const RegistrationControl = require('../models/RegistrationControl');
const ProjectDomain = require('../models/ProjectDomain');
const Venue = require('../models/Venue');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Evaluator = require('../models/Evaluator');
const Proposal = require('../models/Proposal');
const ProposalTitle = require('../models/ProposalTitle');
const ProgressReport = require('../models/ProgressReport');
const FinalDraft = require('../models/FinalDraft');
const DefenseSchedule = require('../models/DefenseSchedule');
const AdvisorRepository = require('../models/AdvisorRepository');
const User = require('../models/User');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validationResult } = require('express-validator');
const { notifyNewAcademicYear, notifySemesterChange } = require('./notificationController');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const cache = require('../utils/cache');
const backupService = require('../services/backupService');

// @desc    Get current academic year
// @route   GET /api/academic/current
// @access  Private
const getCurrentAcademicYear = async (req, res) => {
  try {
    // Try to get from cache first
    const cached = cache.getCache(cache.CACHE_KEYS.ACADEMIC_YEAR);
    if (cached) {
      return res.json(cached);
    }

    const currentYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    const response = {
      success: true,
      academicYear: {
        id: currentYear?.id || null,
        yearName: currentYear?.yearName || null,
        current: currentYear?.yearName || null,
        semester: currentYear?.semester || null,
        status: currentYear?.status || 'pending_setup',
        startDate: currentYear?.startDate || null
      }
    };

    // Cache the response for 5 minutes
    cache.setCache(cache.CACHE_KEYS.ACADEMIC_YEAR, response, 300);

    res.json(response);
  } catch (error) {
    console.error('Get current academic year error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Start new academic year
// @route   POST /api/academic/start
// @access  Private/Faculty-Head
const startNewAcademicYear = async (req, res) => {
  try {
    const { yearName, startDate } = req.body;

    // Check if year already exists
    const existingYear = await AcademicYear.findOne({
      where: { yearName }
    });

    if (existingYear) {
      return res.status(400).json({
        success: false,
        error: 'Academic year already exists'
      });
    }

    // Find the previous active academic year to archive it
    const previousYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    // Create new academic year
    const newYear = await AcademicYear.create({
      yearName,
      semester: '1',
      status: 'active',
      startDate
    });

    // If there was a previous year, archive it and deactivate its students
    if (previousYear) {
      console.log('Archiving previous academic year:', previousYear.yearName, 'ID:', previousYear.id);

      // Mark previous year as archived
      previousYear.status = 'archived';
      await previousYear.save();

      // Deactivate all students from the previous academic year
      // Students are linked to groups via group_members, and groups are linked to academic_year
      const previousYearId = previousYear.id;

      // Find all student users from the previous year's groups and deactivate them
      await sequelize.query(`
        UPDATE users 
        SET status = 'inactive' 
        WHERE id IN (
          SELECT DISTINCT gm.user_id 
          FROM group_members gm 
          INNER JOIN groups g ON gm.group_id = g.id 
          WHERE g.academic_year_id = ?
        ) AND role = 'student'
      `, {
        replacements: [previousYearId]
      });

      console.log('Deactivated students from previous year');
    }

    // Send notifications to all users about new academic year (except faculty-head) asynchronously
    setImmediate(async () => {
      try {
        const allUsers = await User.findAll({
          where: {
            status: 'active',
            role: { [Op.ne]: 'faculty-head' }
          },
          attributes: ['id', 'name', 'email', 'role']
        });

        if (allUsers.length > 0) {
          // Pass the new academic year ID to the notification function
          await notifyNewAcademicYear(allUsers, yearName, newYear.id);
          console.log(`✅ New academic year notification sent to ${allUsers.length} users`);
        }
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
      }
    });

    // Clear the academic year cache so the new year is reflected immediately
    cache.delCache(cache.CACHE_KEYS.ACADEMIC_YEAR);
    console.log(`🗑️  Cleared academic year cache after starting new year: ${yearName}`);

    res.status(201).json({
      success: true,
      message: `Academic Year ${yearName} started successfully`,
      academicYear: {
        id: newYear.id,
        yearName: newYear.yearName,
        current: newYear.yearName,
        semester: newYear.semester,
        status: newYear.status,
        startDate: newYear.startDate
      },
      previousYear: previousYear ? {
        id: previousYear.id,
        yearName: previousYear.yearName,
        status: 'archived',
        studentsDeactivated: true
      } : null
    });
  } catch (error) {
    console.error('Start academic year error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Switch semester
// @route   PUT /api/academic/semester
// @access  Private/Faculty-Head
const switchSemester = async (req, res) => {
  try {
    const { semester } = req.body;

    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    if (!activeYear) {
      return res.status(404).json({
        success: false,
        error: 'No active academic year found'
      });
    }

    // Validate semester transition
    if (activeYear.semester === semester) {
      return res.status(400).json({
        success: false,
        error: `Already in Semester ${semester}`
      });
    }

    if (activeYear.semester === '2' && semester === '1') {
      return res.status(400).json({
        success: false,
        error: 'Cannot go back to Semester 1'
      });
    }

    activeYear.semester = semester;
    await activeYear.save();

    // Clear the academic year cache so the new semester is reflected immediately
    cache.delCache(cache.CACHE_KEYS.ACADEMIC_YEAR);
    console.log(`🗑️  Cleared academic year cache after semester switch to ${semester}`);

    // Notify all users except faculty-head about semester switch asynchronously
    setImmediate(async () => {
      try {
        const allUsers = await User.findAll({
          where: {
            status: 'active',
            role: { [Op.ne]: 'faculty-head' }
          },
          attributes: ['id', 'name', 'email', 'role']
        });

        if (allUsers.length > 0) {
          await notifySemesterChange(allUsers, semester);
          console.log(`✅ Semester change notification sent to ${allUsers.length} users`);
        }
      } catch (notificationError) {
        console.error('Failed to send semester change notifications:', notificationError);
      }
    });

    res.json({
      success: true,
      message: `Switched to Semester ${semester}`,
      academicYear: {
        id: activeYear.id,
        yearName: activeYear.yearName,
        current: activeYear.yearName,
        semester: activeYear.semester,
        status: activeYear.status
      }
    });
  } catch (error) {
    console.error('Switch semester error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get system settings
// @route   GET /api/academic/settings
// @access  Private/Admin
const getSystemSettings = async (req, res) => {
  try {
    // Try to get from cache first
    const cached = cache.getCache(cache.CACHE_KEYS.SYSTEM_SETTINGS);
    if (cached) {
      return res.json(cached);
    }

    const settings = await SystemSetting.findAll();

    const settingsObject = {};
    settings.forEach(s => {
      settingsObject[s.key] = s.value;
    });

    const response = {
      success: true,
      settings: settingsObject
    };

    // Cache the response for 10 minutes
    cache.setCache(cache.CACHE_KEYS.SYSTEM_SETTINGS, response, 600);

    res.json(response);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get password minimum length (public endpoint)
// @route   GET /api/academic/settings/password-min-length
// @access  Public
const getPasswordMinLength = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ where: { key: 'password_min_length' } });
    const minLength = setting ? parseInt(setting.value, 10) : 8;

    res.json({
      success: true,
      password_min_length: minLength
    });
  } catch (error) {
    console.error('Get password min length error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update system setting
// @route   PUT /api/academic/settings/:key
// @access  Private/Admin
const updateSystemSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    let setting = await SystemSetting.findOne({ where: { key } });

    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = await SystemSetting.create({ key, value });
    }

    // Clear system settings cache so new value is fetched on next request
    cache.delCache(cache.CACHE_KEYS.SYSTEM_SETTINGS);
    
    // Also clear password min length cache if that's what was updated
    if (key === 'password_min_length') {
      cache.delCache(cache.CACHE_KEYS.SYSTEM_SETTINGS);
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get registration status
// @route   GET /api/academic/registration
// @access  Public
const getRegistrationStatus = async (req, res) => {
  try {
    // Try to get from cache first
    const cached = cache.getCache(cache.CACHE_KEYS.REGISTRATION_STATUS);
    if (cached) {
      return res.json(cached);
    }

    let control = await RegistrationControl.findOne();

    if (!control) {
      control = await RegistrationControl.create({ isOpen: true });
    }

    const response = {
      success: true,
      isOpen: control.isOpen
    };

    // Cache the response for 2 minutes
    cache.setCache(cache.CACHE_KEYS.REGISTRATION_STATUS, response, 120);

    res.json(response);
  } catch (error) {
    console.error('Get registration status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Toggle registration
// @route   PUT /api/academic/registration
// @access  Private/Admin
const toggleRegistration = async (req, res) => {
  try {
    let control = await RegistrationControl.findOne();

    if (!control) {
      control = await RegistrationControl.create({
        isOpen: true,
        updatedBy: req.user.id
      });
    } else {
      control.isOpen = !control.isOpen;
      control.updatedBy = req.user.id;
      await control.save();
    }

    // Clear registration status cache
    cache.delCache(cache.CACHE_KEYS.REGISTRATION_STATUS);

    res.json({
      success: true,
      message: `Registration ${control.isOpen ? 'opened' : 'closed'} successfully`,
      isOpen: control.isOpen
    });
  } catch (error) {
    console.error('Toggle registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Get all project domains
// @route   GET /api/academic/domains
// @access  Private
const getProjectDomains = async (req, res) => {
  try {
    const domains = await ProjectDomain.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      domains: domains.map(d => d.name)
    });
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Add project domain
// @route   POST /api/academic/domains
// @access  Private/Faculty-Head
const addProjectDomain = async (req, res) => {
  try {
    const { name } = req.body;

    const existingDomain = await ProjectDomain.findOne({
      where: { name }
    });

    if (existingDomain) {
      return res.status(400).json({ 
        success: false, 
        error: 'Domain already exists' 
      });
    }

    const domain = await ProjectDomain.create({ name });

    res.status(201).json({
      success: true,
      message: 'Domain added successfully',
      domain: domain.name
    });
  } catch (error) {
    console.error('Add domain error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Delete project domain
// @route   DELETE /api/academic/domains/:name
// @access  Private/Faculty-Head
const deleteProjectDomain = async (req, res) => {
  try {
    const { name } = req.params;

    const domain = await ProjectDomain.findOne({
      where: { name }
    });

    if (!domain) {
      return res.status(404).json({ 
        success: false, 
        error: 'Domain not found' 
      });
    }

    await domain.destroy();

    res.json({
      success: true,
      message: 'Domain deleted successfully'
    });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Get all venues
// @route   GET /api/academic/venues
// @access  Private
const getVenues = async (req, res) => {
  try {
    const venues = await Venue.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      venues
    });
  } catch (error) {
    console.error('Get venues error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Add venue
// @route   POST /api/academic/venues
// @access  Private/Faculty-Head
const addVenue = async (req, res) => {
  try {
    const { name } = req.body;

    const venue = await Venue.create({ name });

    res.status(201).json({
      success: true,
      message: 'Venue added successfully',
      venue
    });
  } catch (error) {
    console.error('Add venue error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Delete venue
// @route   DELETE /api/academic/venues/:id
// @access  Private/Faculty-Head
const deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await Venue.findByPk(id);

    if (!venue) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }

    await venue.destroy();

    res.json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Clear cache
// @route   POST /api/academic/cache/clear
// @access  Private/Admin
const clearCache = async (req, res) => {
  try {
    // Get stats before clearing
    const statsBefore = cache.getStats();
    
    // Clear all application cache
    const deletedCount = cache.clearCache();
    
    // Get stats after clearing
    const statsAfter = cache.getStats();
    
    console.log(`Cache cleared by: ${req.user.email}`);
    console.log(`Keys deleted: ${deletedCount}`);

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      stats: {
        before: statsBefore,
        after: statsAfter,
        keysDeleted: deletedCount
      }
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get cache statistics
// @route   GET /api/academic/cache/stats
// @access  Private/Admin
const getCacheStats = async (req, res) => {
  try {
    const stats = cache.getStats();
    const isEnabled = cache.isCacheEnabled();
    const defaultTTL = cache.getDefaultTTL();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        enabled: isEnabled,
        defaultTTL: defaultTTL,
        sizeKB: (stats.size / 1024).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create backup (with compression)
// @route   POST /api/academic/backup/create
// @access  Private/Admin
const createBackup = async (req, res) => {
  try {
    const result = await backupService.createBackup(req.user.email);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      ...result
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: 
        (error && typeof error === 'object' && error.message) 
          ? (error.stderr 
              ? `${error.message} (Details: ${error.stderr.trim()})` 
              : error.message)
          : (typeof error === 'string' 
              ? error 
              : 'Failed to create backup. Please check server logs for details.')
    });
  }
};

// @desc    Get backup list
// @route   GET /api/academic/backup/list
// @access  Private/Admin
const getBackupList = async (req, res) => {
  try {
    const result = await backupService.getBackupList();
    
    res.json(result);
  } catch (error) {
    console.error('Get backup list error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Restore backup
// @route   POST /api/academic/backup/restore
// @access  Private/Admin
const restoreBackup = async (req, res) => {
  try {
    const { backupFile } = req.body;

    console.log('[Restore API] Restore requested for file:', backupFile);

    if (!backupFile) {
      return res.status(400).json({
        success: false,
        error: 'Backup file is required'
      });
    }

    const result = await backupService.restoreBackup(backupFile);

    console.log('[Restore API] Restore result:', result);

    res.json(result);
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to restore backup'
    });
  }
};

// @desc    Delete backup
// @route   DELETE /api/academic/backup/:filename
// @access  Private/Admin
const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backupService.deleteBackup(filename);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete backup'
    });
  }
};

// @desc    Download backup
// @route   GET /api/academic/backup/download/:filename
// @access  Private/Admin
const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = backupService.getBackupFilePath(filename);
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download backup'
    });
  }
};

// @desc    Get backup statistics
// @route   GET /api/academic/backup/stats
// @access  Private/Admin
const getBackupStats = async (req, res) => {
  try {
    const stats = await backupService.getStats();
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Get backup stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update backup settings
// @route   PUT /api/academic/backup/settings
// @access  Private/Admin
const updateBackupSettings = async (req, res) => {
  try {
    const { autoBackup, backupFrequency, backupRetention } = req.body;
    
    const updates = {};
    if (autoBackup !== undefined) updates.autoBackup = autoBackup; // Pass camelCase key to backupService
    if (backupFrequency !== undefined) updates.backup_frequency = backupFrequency;
    if (backupRetention !== undefined) updates.backup_retention = backupRetention;
    
    const result = await backupService.updateSettings(updates);
    
    if (result) {
      // Clear system settings cache so updated backup settings are fetched on next request
      cache.delCache(cache.CACHE_KEYS.SYSTEM_SETTINGS);
      
      res.json({
        success: true,
        message: 'Backup settings updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update backup settings'
      });
    }
  } catch (error) {
    console.error('Update backup settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update backup settings'
    });
  }
};

// @desc    Stop current backup process
// @route   POST /api/academic/backup/stop
// @access  Private/Admin
const stopBackup = async (req, res) => {
  try {
    const result = await backupService.stopBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Stop backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop backup'
    });
  }
};

// @desc    Get current backup status
// @route   GET /api/academic/backup/status
// @access  Private/Admin
const getBackupStatus = async (req, res) => {
  try {
    const status = backupService.getBackupStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get backup status'
    });
  }
};

module.exports = {
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
};