const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DefenseSchedule = sequelize.define('DefenseSchedule', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `def-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  groupId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'group_id',
    references: {
      model: 'groups',
      key: 'id'
    }
  },
  academicYearId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'academic_year_id',
    references: {
      model: 'academic_years',
      key: 'id'
    }
  },
  semester: {
    type: DataTypes.ENUM('1', '2'),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  venueId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'venue_id',
    references: {
      model: 'venues',
      key: 'id'
    }
  }
}, {
  tableName: 'defense_schedules',
  timestamps: true,
  underscored: true
});

module.exports = DefenseSchedule;