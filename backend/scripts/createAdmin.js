const { sequelize } = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const createAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Check if admin already exists
    const adminExists = await User.findOne({ 
      where: { 
        role: 'admin',
        email: 'admin@gmail.com' 
      } 
    });
    
    if (!adminExists) {
      // Create admin user
      const admin = await User.create({
        id: 'admin-001',
        email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'admin123', // This will be hashed by the model hook
        name: 'System Administrator',
        role: 'admin',
        status: 'active'
      });
      
      console.log('\n✅ Admin user created successfully!');
      console.log(`📧 Email: ${admin.email}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
      console.log('\nYou can now login with these credentials.\n');
    } else {
      console.log('ℹ️ Admin user already exists');
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Password: admin123');
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    
    // More detailed error logging
    if (error.name === 'SequelizeValidationError') {
      console.error('Validation errors:', error.errors.map(e => e.message));
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('Unique constraint error:', error.errors.map(e => e.message));
    }
  } finally {
    await sequelize.close();
    process.exit();
  }
};

// Run the function
createAdmin();