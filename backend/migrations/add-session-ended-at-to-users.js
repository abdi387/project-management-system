'use strict';

/**
 * Migration: Add session_ended_at column to users table
 * Purpose: Track when a user's previous session ended (for "Last active" display)
 * Date: 2026-04-03
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'session_ended_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Tracks when the user\'s previous session ended'
    });

    // Add index for faster queries
    await queryInterface.addIndex('users', ['session_ended_at'], {
      name: 'users_session_ended_at_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'users_session_ended_at_index');
    await queryInterface.removeColumn('users', 'session_ended_at');
  }
};
