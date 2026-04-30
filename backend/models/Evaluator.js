const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Evaluator = sequelize.define('Evaluator', {
  groupId: {
    type: DataTypes.STRING(50),
    field: 'group_id',
    primaryKey: true,
    references: {
      model: 'groups',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.STRING(50),
    field: 'user_id',
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'assigned_at'
  }
}, {
  tableName: 'evaluators',
  timestamps: false,
  underscored: true
});

module.exports = Evaluator;
