require('dotenv').config();

console.log('🔍 Testing .env file loading:');
console.log('================================');
console.log('DB_HOST:', process.env.DB_HOST || '❌ NOT LOADED');
console.log('DB_USER:', process.env.DB_USER || '❌ NOT LOADED');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Loaded (hidden)' : '✅ Loaded (empty)');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NOT LOADED');
console.log('PORT:', process.env.PORT || '❌ NOT LOADED');
console.log('================================');

if (!process.env.DB_USER) {
  console.log('\n❌ ERROR: .env file not loading correctly!');
  console.log('Please check:');
  console.log('1. .env file exists in backend folder');
  console.log('2. .env file has correct content');
  console.log('3. You have restarted the terminal after creating .env');
} else {
  console.log('\n✅ .env file loaded successfully!');
}