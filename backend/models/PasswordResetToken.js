const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_id', // Map to snake_case in database
    references: {
      model: 'users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'password_reset_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['token']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Associations will be defined in models/index.js

module.exports = PasswordResetToken;
