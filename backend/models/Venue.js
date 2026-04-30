const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Venue = sequelize.define('Venue', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `venue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'venues',
  timestamps: true,
  underscored: true
});

module.exports = Venue;