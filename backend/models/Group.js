const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `grp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  department: {
    type: DataTypes.ENUM('Computer Science', 'Information Technology', 'Information Systems'),
    allowNull: false
  },
  leaderId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'leader_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  advisorId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'advisor_id',
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
  approvedTitle: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'approved_title'
  },
  proposalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    field: 'proposal_status'
  },
  progressStatus: {
    type: DataTypes.ENUM('not-started', 'in-progress', 'reviewed'),
    defaultValue: 'not-started',
    field: 'progress_status'
  },
  finalDraftStatus: {
    type: DataTypes.ENUM('not-submitted', 'submitted', 'advisor-approved', 'fully-approved'),
    defaultValue: 'not-submitted',
    field: 'final_draft_status'
  },
  isReadyForDefense: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_ready_for_defense'
  }
}, {
  tableName: 'groups',
  timestamps: true,
  underscored: true
});

// Don't define associations here - they will be defined in index.js

module.exports = Group;