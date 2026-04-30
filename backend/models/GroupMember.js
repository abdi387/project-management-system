const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GroupMember = sequelize.define('GroupMember', {
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
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'group_members',
  timestamps: true,
  underscored: true
});

// Don't define associations here - they will be defined in index.js
// Remove the associate function or keep it empty

module.exports = GroupMember;