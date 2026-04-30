const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProgressReport = sequelize.define('ProgressReport', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `prog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'file_url'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'file_name'
  },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed'),
    defaultValue: 'pending'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  isOverdue: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_overdue'
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  }
}, {
  tableName: 'progress_reports',
  timestamps: true,
  underscored: true
});

module.exports = ProgressReport;