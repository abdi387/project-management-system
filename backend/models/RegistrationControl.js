const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RegistrationControl = sequelize.define('RegistrationControl', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  isOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_open'
  },
  updatedBy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'registration_control',
  timestamps: true,
  underscored: true
});

module.exports = RegistrationControl;