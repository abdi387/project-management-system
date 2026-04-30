const { Section } = require('../models');

// @desc    Get all sections
// @route   GET /api/sections
// @access  Private (All authenticated users)
const getAllSections = async (req, res) => {
  try {
    const sections = await Section.getAllSections();
    
    res.json({
      success: true,
      sections
    });
  } catch (error) {
    console.error('Get all sections error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get sections by department
// @route   GET /api/sections/department/:department
// @access  Private (All authenticated users)
const getSectionsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { isActive } = req.query;
    
    const sections = await Section.getByDepartment(
      department,
      isActive !== undefined ? isActive === 'true' : null
    );
    
    res.json({
      success: true,
      sections
    });
  } catch (error) {
    console.error('Get sections by department error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create or update section
// @route   POST /api/sections
// @access  Private/Admin & Faculty Head
const upsertSection = async (req, res) => {
  try {
    const { name, department, isActive, capacity, description } = req.body;
    
    // Validate required fields
    if (!name || !department) {
      return res.status(400).json({
        success: false,
        error: 'Section name and department are required'
      });
    }
    
    // Validate department
    const validDepartments = ['Computer Science', 'Information Technology', 'Information Systems'];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid department. Must be: Computer Science, Information Technology, or Information Systems'
      });
    }
    
    const section = await Section.upsertSection({
      name,
      department,
      isActive: isActive !== undefined ? isActive : true,
      capacity: capacity || null,
      description: description || null
    });
    
    res.status(200).json({
      success: true,
      message: 'Section saved successfully',
      section
    });
  } catch (error) {
    console.error('Upsert section error:', error);
    
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

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private/Admin & Faculty Head
const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }
    
    await section.destroy();
    
    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Bulk save sections for a department
// @route   POST /api/sections/bulk
// @access  Private/Admin & Faculty Head
const bulkSaveSections = async (req, res) => {
  try {
    const { sections } = req.body;
    
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sections array is required'
      });
    }
    
    const savedSections = [];
    
    for (const sectionData of sections) {
      const { name, department, isActive, capacity, description } = sectionData;
      
      if (!name || !department) {
        continue;
      }
      
      const section = await Section.upsertSection({
        name,
        department,
        isActive: isActive !== undefined ? isActive : true,
        capacity: capacity || null,
        description: description || null
      });
      
      savedSections.push(section);
    }
    
    res.status(200).json({
      success: true,
      message: `${savedSections.length} sections saved successfully`,
      sections: savedSections
    });
  } catch (error) {
    console.error('Bulk save sections error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get sections grouped by department
// @route   GET /api/sections/grouped
// @access  Private (All authenticated users)
const getSectionsGroupedByDepartment = async (req, res) => {
  try {
    const allSections = await Section.getAllSections();
    
    const grouped = {
      'Computer Science': [],
      'Information Technology': [],
      'Information Systems': []
    };
    
    allSections.forEach(section => {
      if (grouped[section.department]) {
        grouped[section.department].push(section);
      }
    });
    
    res.json({
      success: true,
      sections: grouped
    });
  } catch (error) {
    console.error('Get sections grouped error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getAllSections,
  getSectionsByDepartment,
  upsertSection,
  deleteSection,
  bulkSaveSections,
  getSectionsGroupedByDepartment
};
