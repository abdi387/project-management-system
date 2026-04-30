const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProposalTitle = sequelize.define('ProposalTitle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  proposalId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'proposal_id',
    references: {
      model: 'proposals',
      key: 'id'
    }
  },
  titleIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'title_index',
    validate: {
      min: 0,
      max: 2
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'domain_id',
    references: {
      model: 'project_domains',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'proposal_titles',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['proposal_id', 'title_index']
    }
  ]
});

module.exports = ProposalTitle;