const { sequelize } = require('../config/db');
const SystemSetting = require('../models/SystemSetting');
const { Op } = require('sequelize');

async function cleanupPasswordSettings() {
  console.log('Cleaning up duplicate password length settings...');

  // Delete both keys if exist
  await SystemSetting.destroy({ where: { key: { [Op.or]: ['passwordMinLength', 'password_min_length'] } } });

  // Create single `password_min_length = 8`
  await SystemSetting.upsert({ key: 'password_min_length', value: '8' });

  console.log('✅ Fixed: Single `password_min_length=8`');
  console.log('Restart backend for changes.');
}

cleanupPasswordSettings().catch(console.error);

