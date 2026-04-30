// Load environment variables FIRST before anything else
require('dotenv').config();

const { sendEmail, sendPasswordResetEmail, sendAccountApprovalEmail } = require('../config/email');

// Debug: Show loaded env vars (hide password)
console.log('🔍 Checking environment variables...');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***loaded***' : 'NOT SET');
console.log('');

// Test email sending
async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');

  // Test 1: Basic email
  console.log('📧 Test 1: Sending basic test email...');
  const testEmail = await sendEmail({
    to: process.env.EMAIL_USER, // Send to yourself for testing
    subject: 'Test Email - FYP System',
    html: `
      <h1>Test Email</h1>
      <p>If you received this, your email configuration is working!</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    `
  });
  console.log('Result:', testEmail);

  // Test 2: Password reset email
  console.log('\n📧 Test 2: Sending password reset email...');
  const resetEmail = await sendPasswordResetEmail(
    process.env.EMAIL_USER,
    'test-reset-token-12345',
    'Test User'
  );
  console.log('Result:', resetEmail);

  // Test 3: Account approval email
  console.log('\n📧 Test 3: Sending account approval email...');
  const approvalEmail = await sendAccountApprovalEmail(
    process.env.EMAIL_USER,
    'Test Student'
  );
  console.log('Result:', approvalEmail);

  console.log('\n✅ All tests completed!');
  console.log('\n📬 Check your inbox at:', process.env.EMAIL_USER);
  console.log('⚠️  Also check spam folder if you don\'t see the emails');
}

// Run test
testEmail().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.log('\n💡 Troubleshooting:');
  console.log('1. Check if .env file has correct email credentials');
  console.log('2. Make sure you\'re using Gmail App Password, not regular password');
  console.log('3. Verify 2FA is enabled on your Google account');
  console.log('4. Check if port 587 is not blocked by firewall');
});
