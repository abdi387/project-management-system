const { sequelize } = require('../config/db');
const AcademicYear = require('../models/AcademicYear');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const setupAcademicYear = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if there's already an active academic year
    const activeYear = await AcademicYear.findOne({
      where: { status: 'active' }
    });

    if (activeYear) {
      console.log('✅ Active academic year already exists:');
      console.log(`   Year: ${activeYear.yearName}`);
      console.log(`   Semester: ${activeYear.semester}`);
      console.log(`   Status: ${activeYear.status}`);
    } else {
      // Create a new active academic year
      const currentYear = new Date().getFullYear();
      const yearName = `${currentYear}/${currentYear + 1}`;

      console.log(`🔄 Creating academic year: ${yearName}...`);

      const newYear = await AcademicYear.create({
        yearName: yearName,
        semester: '1',
        status: 'active',
        startDate: new Date()
      });

      console.log('✅ Academic year created successfully:');
      console.log(`   Year: ${newYear.yearName}`);
      console.log(`   Semester: ${newYear.semester}`);
      console.log(`   Status: ${newYear.status}`);
    }

  } catch (error) {
    console.error('❌ Error setting up academic year:', error.message);
    if (error.original) {
      console.error('Database error:', error.original.message);
    }
  } finally {
    await sequelize.close();
    process.exit();
  }
};

setupAcademicYear();
