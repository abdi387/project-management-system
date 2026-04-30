const { User, Section } = require('../models');
const { sequelize } = require('../config/db');

const fixUserSections = async () => {
  try {
    console.log('🔧 Starting to fix user sections...');

    // Find all users where section starts with "section-"
    const usersWithWrongSections = await User.findAll({
      where: {
        section: {
          [require('sequelize').Op.like]: 'section-%'
        }
      }
    });

    console.log(`📊 Found ${usersWithWrongSections.length} users with incorrect section data`);

    let fixedCount = 0;

    for (const user of usersWithWrongSections) {
      try {
        // Find the section record by ID
        const sectionRecord = await Section.findByPk(user.section);

        if (sectionRecord) {
          // Update user section to the section name
          await user.update({ section: sectionRecord.name });
          console.log(`✅ Fixed user ${user.email}: ${user.section} -> ${sectionRecord.name}`);
          fixedCount++;
        } else {
          console.log(`❌ Section record not found for user ${user.email} with section ID: ${user.section}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing user ${user.email}:`, error.message);
      }
    }

    console.log(`🎉 Fixed ${fixedCount} out of ${usersWithWrongSections.length} users`);
    console.log('✅ User sections fix completed');

  } catch (error) {
    console.error('❌ Error in fixUserSections:', error);
  } finally {
    await sequelize.close();
  }
};

// Run the fix
fixUserSections();