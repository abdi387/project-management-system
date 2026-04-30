const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AdvisorRepository = sequelize.define('AdvisorRepository', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  advisorId: {
    type: DataTypes.STRING(50),
    allowNull: false,
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
  semester: {
    type: DataTypes.ENUM('1', '2'),
    allowNull: false
  },
  data: {
    type: DataTypes.JSON,
    allowNull: false
  },
  archivedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'archived_at'
  }
}, {
  tableName: 'advisor_repository',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['advisor_id', 'academic_year_id', 'semester']
    }
  ]
});

module.exports = AdvisorRepository;