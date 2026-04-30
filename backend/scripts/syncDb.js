const path = require('path');
const { sequelize } = require('../config/db');
const models = require('../models');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const syncDatabase = async () => {
  try {
    console.log('🔄 Connecting to database...');
    console.log('📊 Database configuration:', {
      database: process.env.DB_NAME || 'fyp_management',
      user: process.env.DB_USER || 'root',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306
    });
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Sync all models with force:false to preserve data, alter:true to update schema
    console.log('🔄 Synchronizing models...');
    
    // Log which models are being synced
    const modelNames = Object.keys(models);
    console.log('📦 Models to sync:', modelNames.join(', '));
    
    // Using { alter: true } will update the table schema to match the model
    await sequelize.sync({ alter: true });
    
    console.log('✅ All models synchronized successfully');
    
    // List all tables in the database
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'fyp_management'}'
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n📊 Tables in database:');
    if (results.length === 0) {
      console.log('   No tables found');
    } else {
      results.forEach(row => {
        const tableName = row.TABLE_NAME || Object.values(row)[0];
        console.log(`   - ${tableName}`);
      });
    }
    
    // Get count of records in each table
    console.log('\n📈 Record counts:');
    for (const row of results) {
      const tableName = row.TABLE_NAME || Object.values(row)[0];
      try {
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const count = countResult[0].count || Object.values(countResult[0])[0];
        console.log(`   - ${tableName}: ${count} records`);
      } catch (err) {
        console.log(`   - ${tableName}: unable to count`);
      }
    }

    console.log('\n✅ Database sync completed successfully!');

  } catch (error) {
    console.error('❌ Database sync error:', error);
    
    // Provide more detailed error information
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeAccessDeniedError') {
      console.error('\n🔍 Connection troubleshooting:');
      console.error('   1. Make sure MySQL is running in XAMPP');
      console.error('   2. Check your database credentials in .env file');
      console.error('   3. Verify the database exists (run: CREATE DATABASE fyp_management)');
      console.error('   4. Check if MySQL port 3306 is available');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('\n🔍 Database error troubleshooting:');
      console.error('   1. Check for syntax errors in your models');
      console.error('   2. Verify all model associations are correct');
      console.error('   3. Try running with { force: true } instead of { alter: true }');
    }
    
    console.error('\n❌ Full error details:', {
      name: error.name,
      message: error.message,
      parent: error.parent?.message,
      sql: error.sql,
      stack: error.stack
    });
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('👋 Database connection closed');
    process.exit();
  }
};

// Run the sync function
syncDatabase();