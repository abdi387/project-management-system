'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('final_drafts', 'file_name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Original file name uploaded by the student for the final draft'
    });

    await queryInterface.addColumn('progress_reports', 'file_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Original file name uploaded by the student for the progress report'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('final_drafts', 'file_name');
    await queryInterface.removeColumn('progress_reports', 'file_name');
  }
};
