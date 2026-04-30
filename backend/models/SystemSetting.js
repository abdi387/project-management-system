const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  underscored: true
});

module.exports = SystemSetting;