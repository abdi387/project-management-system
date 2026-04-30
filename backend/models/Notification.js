const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  academicYearId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'academic_year_id',
    references: {
      model: 'academic_years',
      key: 'id'
    }
  },
  semester: {
    type: DataTypes.ENUM('1', '2'),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM(
      'project-claim', 'proposal-approved', 'proposal-rejected',
      'progress-feedback', 'draft-approved', 'defense-schedule',
      'evaluator-assigned', 'defense-duty', 'semester-change',
      'semester-terminated', 'year-started', 'evaluators-assigned-group',
      'group-formed', 'registration-approved', 'registration-rejected',
      'progress-submission', 'draft-submission', 'draft-escalation',
      'defense-scheduled', 'new-registration', 'proposal-submission',
      'system-support', 'year-closed'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  link: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'is_read']
    },
    {
      fields: ['user_id', 'academic_year_id', 'semester']
    }
  ]
});

module.exports = Notification;