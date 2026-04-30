const { cache } = require('../utils/cache');
const { sequelize } = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const clearCache = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    console.log('🗑️  Clearing all cache...');
    cache.clearAll();
    
    console.log('✅ Cache cleared successfully');

  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
};

clearCache();
