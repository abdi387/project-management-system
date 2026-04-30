# 📧 Email & Password Reset Setup Guide

## ✅ What Has Been Installed

### Backend Libraries (March 19, 2026)

```json
{
  "nodemailer": "^8.0.3",           // Email sending
  "uuid": "^13.0.0",                 // Token generation
  "helmet": "^8.1.0",                // Security headers
  "express-rate-limit": "^8.3.1",   // Rate limiting
  "express-session": "^1.19.0",     // Session management
  "cookie-parser": "^1.4.7",        // Cookie handling
  "compression": "^1.8.1",          // Response compression
  "morgan": "^1.10.1"               // HTTP logging
}
```

---

## 🔧 Configuration Steps

### Step 1: Update Email Configuration

Edit `backend/.env` file with your email credentials:

```env
# For Gmail (Recommended)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM="FYP Management System <noreply@fyp-system.com>"

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Step 2: Gmail App Password Setup

1. **Enable 2FA** on your Google Account
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password (no spaces)
   - Paste it in `.env` as `EMAIL_PASS`

3. **Test Configuration**
   ```bash
   cd backend
   node scripts/testEmail.js
   ```

---

## 🎯 Features Implemented

### 1. Password Reset Flow

**Endpoints:**
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify-reset-token/:token` - Verify token validity

**Usage Example:**
```javascript
// Request password reset
await axios.post('http://localhost:5001/api/auth/forgot-password', {
  email: 'student@example.com'
});

// Reset password
await axios.post('http://localhost:5001/api/auth/reset-password/abc123', {
  password: 'NewPassword123'
});
```

### 2. Email Templates

**Available Templates:**
- ✅ Password Reset Email
- ✅ Account Approval Email
- ✅ Account Rejection Email
- ✅ Custom Email (sendEmail function)

**Location:** `backend/config/email.js`

---

## 📁 New Files Created

```
backend/
├── config/
│   └── email.js              # Email service configuration
├── models/
│   └── PasswordResetToken.js # Password reset token model
├── scripts/
│   └── testEmail.js          # Email test script
├── .env                       # Environment variables
├── .env.example              # Environment template
└── INSTALLATION_SUMMARY.md   # Installation details
```

---

## 🗄️ Database Changes

### New Table: `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expiresAt DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

**To create this table:**
1. The model is auto-synced when the server starts
2. OR run: `npm run sync-db`

---

## 🧪 Testing

### Test Email Sending

```bash
cd backend
node scripts/testEmail.js
```

**Expected Output:**
```
🧪 Testing Email Configuration...

📧 Test 1: Sending basic test email...
✅ Email sent: <message-id>
Result: { success: true, ... }

📧 Test 2: Sending password reset email...
✅ Email sent: <message-id>
Result: { success: true, ... }

✅ All tests completed!
📬 Check your inbox at: your-email@gmail.com
```

### Test Password Reset Flow

1. **Request Reset:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@gmail.com"}'
   ```

2. **Check Email** - You should receive a password reset email

3. **Reset Password:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/reset-password/YOUR_TOKEN \
     -H "Content-Type: application/json" \
     -d '{"password":"NewPassword123"}'
   ```

---

## 🔐 Security Features

1. **Token Expiry** - Reset tokens expire after 1 hour
2. **One-Time Use** - Tokens are deleted after use
3. **Email Enumeration Protection** - Same response for existing/non-existing emails
4. **Password Requirements** - Minimum 6 characters + 1 number
5. **Rate Limiting** - Prevents brute force attacks (configured in server.js)

---

## 📝 Usage in Code

### Send Password Reset Email

```javascript
const { sendPasswordResetEmail } = require('./config/email');

await sendPasswordResetEmail(
  'student@example.com',
  'reset-token-12345',
  'John Doe'
);
```

### Send Account Approval Email

```javascript
const { sendAccountApprovalEmail } = require('./config/email');

await sendAccountApprovalEmail(
  'student@example.com',
  'John Doe'
);
```

### Send Custom Email

```javascript
const { sendEmail } = require('./config/email');

await sendEmail({
  to: 'student@example.com',
  subject: 'Welcome to FYP System',
  html: '<h1>Welcome!</h1><p>Your account is ready.</p>'
});
```

---

## 🐛 Troubleshooting

### Email Not Sending?

1. **Check .env configuration**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

2. **Verify Gmail App Password**
   - Must be 16 characters (no spaces)
   - Not your regular Gmail password
   - 2FA must be enabled

3. **Check Firewall**
   - Port 587 must be open
   - Try: `telnet smtp.gmail.com 587`

4. **Review Console Logs**
   ```bash
   npm run dev
   # Look for email-related logs
   ```

### "Invalid Credentials" Error?

- Using wrong password type (need App Password, not regular)
- App Password has spaces (remove them)
- 2FA not enabled (required for App Password)

### Database Table Missing?

```bash
cd backend
npm run sync-db
```

---

## 📋 Next Steps

### Frontend Implementation (To Be Done)

1. **Forgot Password Page**
   - Create `src/pages/auth/ForgotPassword.jsx`
   - Email input field
   - Submit button

2. **Reset Password Page**
   - Create `src/pages/auth/ResetPassword.jsx`
   - Token from URL params
   - New password + confirm password fields

3. **Email Notifications Integration**
   - Integrate account approval email in dept-head approval flow
   - Integrate account rejection email

4. **Success/Error Messages**
   - Toast notifications
   - Loading states

---

## 📞 Support

If you encounter any issues:

1. Check the logs: `backend/logs/` (if using morgan)
2. Test email configuration: `node scripts/testEmail.js`
3. Verify database connection
4. Check `.env` file exists and has correct values

---

## 🎉 Success Indicators

You'll know everything is working when:

- ✅ `node scripts/testEmail.js` runs successfully
- ✅ You receive test emails in your inbox
- ✅ Password reset endpoint returns success
- ✅ Reset tokens are created in database
- ✅ Password can be reset using email link

---

**Created:** March 19, 2026  
**Last Updated:** March 19, 2026  
**Version:** 1.0
