const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AcademicYear = sequelize.define('AcademicYear', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  yearName: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'year_name',
    validate: {
      is: /^\d{4}\/\d{4}$/ // Format: 2023/2024
    }
  },
  semester: {
    type: DataTypes.ENUM('1', '2'),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending_setup', 'active', 'archived'),
    defaultValue: 'pending_setup'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'end_date'
  }
}, {
  tableName: 'academic_years',
  timestamps: true,
  underscored: true
});

module.exports = AcademicYear;