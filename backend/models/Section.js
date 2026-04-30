const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Section = sequelize.define('Section', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  department: {
    type: DataTypes.ENUM('Computer Science', 'Information Technology', 'Information Systems'),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sections',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'sections_department_index',
      fields: ['department']
    },
    {
      name: 'sections_name_index',
      fields: ['name']
    }
  ],
  hooks: {
    beforeCreate: async (section) => {
      // Ensure section name is uppercase
      if (section.name) {
        section.name = section.name.toUpperCase();
      }
    },
    beforeUpdate: async (section) => {
      if (section.changed('name') && section.name) {
        section.name = section.name.toUpperCase();
      }
    }
  }
});

// Class method to get sections by department
Section.getByDepartment = async function(department, isActive = true) {
  const where = { department };
  if (isActive !== null) where.isActive = isActive;
  
  return await this.findAll({
    where,
    order: [['name', 'ASC']]
  });
};

// Class method to get all sections
Section.getAllSections = async function() {
  return await this.findAll({
    order: [['department', 'ASC'], ['name', 'ASC']]
  });
};

// Class method to create or update section
Section.upsertSection = async function(sectionData) {
  const { name, department, isActive, capacity, description } = sectionData;
  
  // Check if section already exists
  const existing = await this.findOne({
    where: { name, department }
  });
  
  if (existing) {
    return await existing.update({ isActive, capacity, description });
  } else {
    return await this.create(sectionData);
  }
};

module.exports = Section;
