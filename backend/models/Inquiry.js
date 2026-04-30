const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Inquiry = sequelize.define('Inquiry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'response'
  },
  status: {
    type: DataTypes.ENUM('pending', 'resolved'),
    defaultValue: 'pending'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  }
}, {
  tableName: 'inquiries',
  timestamps: true,
  underscored: true
});

module.exports = Inquiry;