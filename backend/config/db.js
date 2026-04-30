const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Debug: Print what's being loaded (remove after fixing)
console.log('🔍 Environment variables:');
console.log('DB_USER:', process.env.DB_USER ? '✅ Loaded' : '❌ Not loaded');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Loaded' : '❌ Not loaded (empty is ok)');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_HOST:', process.env.DB_HOST);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
      evict: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Connected successfully');
    
    if (process.env.NODE_ENV === 'development') {
      // Sync with alter in development so newly added model fields are created automatically
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced with model changes (alter applied)');
    }
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };