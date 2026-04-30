/**
 * Migration script to add dept_status and dept_approved_at columns to final_drafts table
 * Run: node scripts/migrateDeptStatus.js
 */

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('🔄 Starting migration...');
    
    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'final_drafts' 
      AND COLUMN_NAME = 'dept_status'
    `, { type: QueryTypes.SELECT });

    if (results && results.COLUMN_NAME) {
      console.log('✅ dept_status column already exists, skipping...');
    } else {
      console.log('➕ Adding dept_status column...');
      await sequelize.query(`
        ALTER TABLE final_drafts 
        ADD COLUMN dept_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
      `);
      console.log('✅ dept_status column added successfully');
    }

    // Check for dept_approved_at
    const [results2] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'final_drafts' 
      AND COLUMN_NAME = 'dept_approved_at'
    `, { type: QueryTypes.SELECT });

    if (results2 && results2.COLUMN_NAME) {
      console.log('✅ dept_approved_at column already exists, skipping...');
    } else {
      console.log('➕ Adding dept_approved_at column...');
      await sequelize.query(`
        ALTER TABLE final_drafts 
        ADD COLUMN dept_approved_at DATETIME NULL
      `);
      console.log('✅ dept_approved_at column added successfully');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

