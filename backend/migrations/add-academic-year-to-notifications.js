'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('notifications', 'academic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'academic_years',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('notifications', 'semester', {
      type: Sequelize.ENUM('1', '2'),
      allowNull: true
    });

    await queryInterface.addIndex('notifications', ['user_id', 'academic_year_id', 'semester']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('notifications', ['user_id', 'academic_year_id', 'semester']);
    await queryInterface.removeColumn('notifications', 'semester');
    await queryInterface.removeColumn('notifications', 'academic_year_id');
  }
};
