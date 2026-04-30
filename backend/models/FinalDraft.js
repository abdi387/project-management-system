const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FinalDraft = sequelize.define('FinalDraft', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
  userId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
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
    allowNull: false,
    field: 'semester'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_url'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'file_name'
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at'
  },
  advisorStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    field: 'advisor_status'
  },
  advisorApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'advisor_approved_at'
  },
}, {
  tableName: 'final_drafts',
  timestamps: true,
  underscored: true
});

module.exports = FinalDraft;
