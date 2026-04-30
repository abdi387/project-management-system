const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProjectDomain = sequelize.define('ProjectDomain', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'project_domains',
  timestamps: true,
  underscored: true
});

module.exports = ProjectDomain;