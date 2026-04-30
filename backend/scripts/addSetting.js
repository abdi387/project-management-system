const { sequelize } = require('../config/db');
const SystemSetting = require('../models/SystemSetting');

const addSetting = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('\n⚙️ Adding/updating maximum_groups_per_advisor setting...');
    
    // Add or update the maximum_groups_per_advisor setting
    const [setting, created] = await SystemSetting.findOrCreate({
      where: { key: 'maximum_groups_per_advisor' },
      defaults: { key: 'maximum_groups_per_advisor', value: '2' }
    });
    
    if (created) {
      console.log('✅ Created setting: maximum_groups_per_advisor = 2');
    } else {
      // Only update if the value is different from what we want
      if (setting.value !== '2') {
        setting.value = '2';
        await setting.save();
        console.log('✅ Updated setting: maximum_groups_per_advisor = 2');
      } else {
        console.log('ℹ️ Setting already exists with value: maximum_groups_per_advisor = 2');
      }
    }

    console.log('\n✅ Setting added/updated successfully!');
  } catch (error) {
    console.error('❌ Error adding setting:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
};

addSetting();

