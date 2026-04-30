const { sequelize } = require('../config/db');
const { QueryInterface } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const runMigration = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const queryInterface = sequelize.getQueryInterface();

    // Import Sequelize types for the migration
    const Sequelize = require('sequelize');

    console.log('🔄 Running migration: add-session-ended-at-to-users...');

    // Check if column already exists
    const tableInfo = await queryInterface.describeTable('users');
    
    if (tableInfo.session_ended_at) {
      console.log('✅ Column session_ended_at already exists in users table');
    } else {
      // Run the up migration
      await queryInterface.addColumn('users', 'session_ended_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tracks when the user\'s previous session ended'
      });

      await queryInterface.addIndex('users', ['session_ended_at'], {
        name: 'users_session_ended_at_index'
      });

      console.log('✅ Migration completed: session_ended_at column added');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
  } finally {
    await sequelize.close();
    process.exit();
  }
};

runMigration();
