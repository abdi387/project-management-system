const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Proposal = sequelize.define('Proposal', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approvedTitleIndex: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_title_index',
    validate: {
      min: 0,
      max: 2
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  }
}, {
  tableName: 'proposals',
  timestamps: true,
  underscored: true
});

module.exports = Proposal;