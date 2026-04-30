const nodemailer = require('nodemailer');

// Create transporter for sending emails
// Using Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // false for TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
    // Add DNS timeout handling
    ciphers: 'SSLv3'
  },
  // Connection timeout handling
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
  // Retry DNS resolution
  dnsTimeout: 5000
});

// Verify connection on startup with retry logic
transporter.verify((error, success) => {
  if (error) {
    // Check if it's a DNS/network issue vs configuration issue
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.warn('⚠️  DNS resolution issue with SMTP server. Email may be delayed on first send.');
      console.warn('📧 This is normal on slow networks - emails will still work when sent.');
    } else if (error.message.includes('EAUTH') || error.message.includes('authentication')) {
      console.error('❌ Email authentication error: Check EMAIL_USER and EMAIL_PASS in .env');
      console.error('💡 For Gmail, use an App Password from: https://myaccount.google.com/apppasswords');
    } else {
      console.error('❌ Email configuration error:', error.message);
    }
    console.log('⚠️  Email service will attempt to connect when sending emails');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

/**
 * Send email function with retry logic for DNS issues
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
const sendEmail = async (options, retryCount = 0) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'FYP Management System <noreply@fyp-system.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
  } catch (error) {
    // Retry on DNS/network errors (max 2 retries)
    if (retryCount < 2 && (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo') || error.message.includes('ETIMEDOUT'))) {
      console.warn(`⚠️  Network error, retrying (${retryCount + 1}/2)...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Wait 2s, then 4s
      return await sendEmail(options, retryCount + 1);
    }
    
    console.error('❌ Email send error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 */
const sendPasswordResetEmail = async (to, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password/${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>You have requested to reset your password for the FYP Management System.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request a password reset, please ignore this email or contact support.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Password Reset Request - FYP Management System',
    html
  });
};

/**
 * Send account creation email with credentials
 * @param {string} to - Recipient email
 * @param {string} userName - User's name
 * @param {string} password - Default password
 * @param {string} role - User's role
 */
const sendAccountCreationEmail = async (to, userName, password, role) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

  const roleName = role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: bold; color: #667eea; }
        .credential-value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; display: inline-block; min-width: 150px; }
        .warning-box { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to FYP Management System!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Your account has been created successfully. You have been registered as a <strong>${roleName}</strong> in the FYP Management System.</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Your Login Credentials</h3>
            <div class="credential-item">
              <span class="credential-label">Email:</span><br>
              <span class="credential-value">${to}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Temporary Password:</span><br>
              <span class="credential-value">${password}</span>
            </div>
          </div>

          <div class="warning-box">
            <strong>⚠️ Important Security Notice:</strong>
            <p style="margin: 10px 0;">For security reasons, it is <strong>highly recommended</strong> to change your temporary password after your first login.</p>
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login Now</a>
          </p>

          <h3 style="color: #667eea;">📝 How to Change Your Password:</h3>
          <ol>
            <li>Click the "Login" button above and log in with your temporary password</li>
            <li>After logging in, navigate to <strong>Profile</strong> (click on your name/avatar in the top navigation)</li>
            <li>Select <strong>Change Password</strong> from the profile menu</li>
            <li>Enter your current password and create a new strong password</li>
            <li>Your new password must be at least 6 characters long and include at least one number</li>
          </ol>

          <p><strong>Need help?</strong> If you have any questions or issues logging in, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Welcome to FYP Management System - Account Created',
    html
  });
};

/**
 * Send proposal submission notification to department head
 * @param {string} to - Department head email
 * @param {string} deptHeadName - Department head's name
 * @param {string} groupName - Group name
 * @param {string} studentName - Student who submitted (group leader)
 * @param {string} proposalTitle - First proposal title
 * @param {string} department - Department name
 */
const sendProposalSubmissionEmail = async (to, deptHeadName, groupName, studentName, proposalTitle, department) => {
  const proposalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dept-head/proposals`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .proposal-box { background: #fff; border: 2px solid #11998e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .proposal-item { margin: 10px 0; }
        .proposal-label { font-weight: bold; color: #11998e; }
        .proposal-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #e8f4f8; border: 1px solid #11998e; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Proposal Submission</h1>
        </div>
        <div class="content">
          <p>Hello ${deptHeadName},</p>
          <p>A new project proposal has been submitted and requires your evaluation.</p>
          
          <div class="proposal-box">
            <h3 style="margin-top: 0; color: #11998e;">📝 Proposal Details</h3>
            <div class="proposal-item">
              <div class="proposal-label">Group:</div>
              <div class="proposal-value">${groupName}</div>
            </div>
            <div class="proposal-item">
              <div class="proposal-label">Submitted By:</div>
              <div class="proposal-value">${studentName}</div>
            </div>
            <div class="proposal-item">
              <div class="proposal-label">Proposal Title:</div>
              <div class="proposal-value">${proposalTitle}</div>
            </div>
            <div class="proposal-item">
              <div class="proposal-label">Department:</div>
              <div class="proposal-value">${department}</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Action Required:</strong>
            <p style="margin: 10px 0;">Please review and evaluate this proposal at your earliest convenience. You can view the full proposal details and provide feedback through the system.</p>
          </div>

          <p style="text-align: center;">
            <a href="${proposalUrl}" class="button">Review Proposal</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'New Proposal Submission - Requires Evaluation',
    html
  });
};

/**
 * Send progress report submission notification to advisor
 * @param {string} to - Advisor email
 * @param {string} advisorName - Advisor's name
 * @param {string} groupName - Group name
 * @param {string} reportTitle - Progress report title
 * @param {string} department - Department name
 */
const sendProgressSubmissionEmail = async (to, advisorName, groupName, reportTitle, department) => {
  const progressUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/advisor/progress-review`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .report-box { background: #fff; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .report-item { margin: 10px 0; }
        .report-label { font-weight: bold; color: #f5576c; }
        .report-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #fef5f6; border: 1px solid #f5576c; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 New Progress Report Submitted</h1>
        </div>
        <div class="content">
          <p>Hello ${advisorName},</p>
          <p>A group under your supervision has submitted a new progress report for review.</p>
          
          <div class="report-box">
            <h3 style="margin-top: 0; color: #f5576c;">📝 Progress Report Details</h3>
            <div class="report-item">
              <div class="report-label">Group:</div>
              <div class="report-value">${groupName}</div>
            </div>
            <div class="report-item">
              <div class="report-label">Report Title:</div>
              <div class="report-value">${reportTitle}</div>
            </div>
            <div class="report-item">
              <div class="report-label">Department:</div>
              <div class="report-value">${department}</div>
            </div>
            <div class="report-item">
              <div class="report-label">Status:</div>
              <div class="report-value">Pending Review</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Action Required:</strong>
            <p style="margin: 10px 0;">Please review this progress report and provide your feedback at your earliest convenience.</p>
          </div>

          <p style="text-align: center;">
            <a href="${progressUrl}" class="button">Review Progress Report</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'New Progress Report Submitted - Requires Review',
    html
  });
};

/**
 * Send progress feedback notification to students
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} reportTitle - Progress report title
 * @param {string} advisorName - Advisor's name
 * @param {string} feedback - Feedback message
 */
const sendProgressFeedbackEmail = async (to, studentName, groupName, reportTitle, advisorName, feedback) => {
  const progressUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/progress`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feedback-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .feedback-item { margin: 10px 0; }
        .feedback-label { font-weight: bold; color: #667eea; }
        .feedback-value { color: #333; padding: 5px 0; }
        .feedback-message { background: #f5f5f5; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; font-style: italic; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #e8f4f8; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 New Feedback on Progress Report</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Your advisor has provided feedback on your group's progress report.</p>
          
          <div class="feedback-box">
            <h3 style="margin-top: 0; color: #667eea;">📊 Progress Report Details</h3>
            <div class="feedback-item">
              <div class="feedback-label">Group:</div>
              <div class="feedback-value">${groupName}</div>
            </div>
            <div class="feedback-item">
              <div class="feedback-label">Report Title:</div>
              <div class="feedback-value">${reportTitle}</div>
            </div>
            <div class="feedback-item">
              <div class="feedback-label">Advisor:</div>
              <div class="feedback-value">${advisorName}</div>
            </div>
            
            <div class="feedback-item" style="margin-top: 20px;">
              <div class="feedback-label">📝 Feedback:</div>
              <div class="feedback-message">${feedback || 'No specific feedback provided. Please check the system for details.'}</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Next Steps:</strong>
            <p style="margin: 10px 0;">Please review your advisor's feedback carefully and make necessary improvements to your progress report. You may need to address the comments before proceeding.</p>
          </div>

          <p style="text-align: center;">
            <a href="${progressUrl}" class="button">View Progress Report</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions about the feedback, please contact your advisor directly.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Advisor Feedback on Progress Report',
    html
  });
};

/**
 * Send final draft approval notification to department head
 * @param {string} to - Department head email
 * @param {string} deptHeadName - Department head's name
 * @param {string} groupName - Group name
 * @param {string} draftTitle - Final draft title
 * @param {string} department - Department name
 * @param {string} advisorName - Advisor's name
 */
const sendFinalDraftApprovalEmailToDeptHead = async (to, deptHeadName, groupName, draftTitle, department, advisorName) => {
  const draftUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dept-head/final-drafts`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .draft-box { background: #fff; border: 2px solid #56ab2f; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .draft-item { margin: 10px 0; }
        .draft-label { font-weight: bold; color: #56ab2f; }
        .draft-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #56ab2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #f0f9ef; border: 1px solid #56ab2f; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Final Draft Approved by Advisor</h1>
        </div>
        <div class="content">
          <p>Hello ${deptHeadName},</p>
          <p>A group's final draft has been approved by their advisor and is now ready for your departmental review.</p>
          
          <div class="draft-box">
            <h3 style="margin-top: 0; color: #56ab2f;">📄 Final Draft Details</h3>
            <div class="draft-item">
              <div class="draft-label">Group:</div>
              <div class="draft-value">${groupName}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Draft Title:</div>
              <div class="draft-value">${draftTitle}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Department:</div>
              <div class="draft-value">${department}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Advisor:</div>
              <div class="draft-value">${advisorName}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Status:</div>
              <div class="draft-value">Ready for Department Review</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Action Required:</strong>
            <p style="margin: 10px 0;">This final draft has passed advisor approval and now requires your departmental review. Please evaluate the draft and provide your assessment.</p>
          </div>

          <p style="text-align: center;">
            <a href="${draftUrl}" class="button">Review Final Draft</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
`;

  return await sendEmail({
    to,
    subject: 'Final Draft Approved - Ready for Department Review',
    html
  });
};

/**
 * Send final draft approval notification to group members
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} draftTitle - Final draft title
 * @param {string} advisorName - Advisor's name
 */
const sendFinalDraftApprovalEmailToStudents = async (to, studentName, groupName, draftTitle, advisorName) => {
  const progressUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/final-draft`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #fff; border: 2px solid #11998e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .success-item { margin: 10px 0; }
        .success-label { font-weight: bold; color: #11998e; }
        .success-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations! Final Draft Approved</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Great news! Your final draft has been approved by your advisor.</p>
          
          <div class="celebration">🏆</div>
          
          <div class="success-box">
            <h3 style="margin-top: 0; color: #11998e;">📄 Final Draft Details</h3>
            <div class="success-item">
              <div class="success-label">Group:</div>
              <div class="success-value">${groupName}</div>
            </div>
            <div class="success-item">
              <div class="success-label">Draft Title:</div>
              <div class="success-value">${draftTitle}</div>
            </div>
            <div class="success-item">
              <div class="success-label">Advisor:</div>
              <div class="success-value">${advisorName}</div>
            </div>
            <div class="success-item">
              <div class="success-label">Status:</div>
              <div class="success-value">✅ Advisor Approved</div>
            </div>
          </div>

          <p style="text-align: center;">
            <a href="${progressUrl}" class="button">View Final Draft Status</a>
          </p>

          <p><strong>What's Next?</strong> Your final draft will now undergo departmental review. Please continue to monitor your progress and prepare for the next steps in your FYP journey.</p>

          <p><strong>Need help?</strong> If you have any questions, please contact your advisor or the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '🎉 Final Draft Approved by Advisor!',
    html
  });
};

/**
 * Send group formation notification to students
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} department - Department name
 * @param {string} section - Section
 * @param {Array} members - Array of member names
 */
const sendGroupFormationEmail = async (to, studentName, groupName, department, section, members) => {
  const groupUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/group`;

  const membersList = members.map(m => `<li>${m}</li>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .group-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .group-item { margin: 10px 0; }
        .group-label { font-weight: bold; color: #667eea; }
        .group-value { color: #333; padding: 5px 0; }
        .members-list { background: #f5f5f5; border-left: 4px solid #667eea; padding: 15px 15px 15px 30px; margin: 15px 0; }
        .members-list li { margin: 5px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #e8f4f8; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👥 Group Assignment Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>You have been assigned to a project group for the current academic year. Please review your group details and team members below.</p>
          
          <div class="group-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Group Details</h3>
            <div class="group-item">
              <div class="group-label">Group Name:</div>
              <div class="group-value">${groupName}</div>
            </div>
            <div class="group-item">
              <div class="group-label">Department:</div>
              <div class="group-value">${department}</div>
            </div>
            <div class="group-item">
              <div class="group-label">Section:</div>
              <div class="group-value">${section}</div>
            </div>
            
            <div class="group-item" style="margin-top: 20px;">
              <div class="group-label">👥 Your Team Members:</div>
              <ul class="members-list">
                ${membersList}
              </ul>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Log in to the system and navigate to your group page</li>
              <li>Review your team members and get in touch with them</li>
              <li>Start discussing and planning your project proposal</li>
              <li>Collaborate with your team to submit a proposal</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${groupUrl}" class="button">View My Group</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions about your group assignment, please contact your department head.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Group Assignment - FYP Project Team',
    html
  });
};

/**
 * Send evaluator assignment notification to group members (students)
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} evaluatorNames - Names of assigned evaluators
 */
const sendEvaluatorAssignmentToStudentsEmail = async (to, studentName, groupName, evaluatorNames) => {
  const evaluatorsUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/evaluators`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #667eea; }
        .info-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .highlight { background: #e8f4f8; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👥 Evaluators Assigned to Your Project</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Great news! The Faculty Head has assigned evaluators to your group's final year project.</p>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Assignment Details</h3>
            <div class="info-item">
              <div class="info-label">Group:</div>
              <div class="info-value">${groupName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Assigned Evaluators:</div>
              <div class="info-value">${evaluatorNames}</div>
            </div>
          </div>

          <div class="highlight">
            <strong>📌 What's Next?</strong>
            <p style="margin: 10px 0;">Your project will now be evaluated by the assigned faculty members. You will be notified about the defense schedule once it's arranged by the Faculty Head.</p>
          </div>

          <div class="highlight">
            <strong>💡 Preparation Tips:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Continue working on your project deliverables</li>
              <li>Prepare your project documentation</li>
              <li>Be ready for the defense presentation</li>
              <li>Review your project thoroughly to answer questions</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${evaluatorsUrl}" class="button">View My Evaluators</a>
          </p>

          <p><strong>Congratulations on reaching this milestone!</strong> If you have any questions, please contact your advisor or the Faculty Head.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '📋 Evaluators Assigned to Your FYP Project',
    html
  });
};

/**
 * Send evaluator assignment notification to department head
 * @param {string} to - Department head email
 * @param {string} deptHeadName - Department head's name
 * @param {string} groupName - Group name
 * @param {string} department - Department name
 * @param {string} evaluatorNames - Names of assigned evaluators
 */
const sendEvaluatorAssignmentToDeptHeadEmail = async (to, deptHeadName, groupName, department, evaluatorNames) => {
  const deptDashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dept-head/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #56ab2f; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #56ab2f; }
        .info-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #56ab2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .highlight { background: #f0f9ef; border-left: 4px solid #56ab2f; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👥 Evaluators Assigned to Group</h1>
        </div>
        <div class="content">
          <p>Hello ${deptHeadName},</p>
          <p>This is to inform you that the Faculty Head has assigned evaluators to a group in your department.</p>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #56ab2f;">📋 Assignment Details</h3>
            <div class="info-item">
              <div class="info-label">Group:</div>
              <div class="info-value">${groupName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Department:</div>
              <div class="info-value">${department}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Assigned Evaluators:</div>
              <div class="info-value">${evaluatorNames}</div>
            </div>
          </div>

          <div class="highlight">
            <strong>📌 Information:</strong>
            <p style="margin: 10px 0;">The assigned evaluators will evaluate the group's final year project. The defense schedule will be created by the Faculty Head and all stakeholders will be notified accordingly.</p>
          </div>

          <p style="text-align: center;">
            <a href="${deptDashboardUrl}" class="button">View Department Dashboard</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the Faculty Head or system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '👥 Evaluators Assigned to Group in Your Department',
    html
  });
};

/**
 * Send evaluator assignment notification to advisor
 * @param {string} to - Advisor email
 * @param {string} advisorName - Advisor's name
 * @param {string} groupName - Group name
 * @param {string} projectTitle - Approved project title
 * @param {string} department - Department name
 */
const sendEvaluatorAssignmentEmail = async (to, advisorName, groupName, projectTitle, department) => {
  const evaluationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/advisor/AdvisorEvaluations`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .assignment-box { background: #fff; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .assignment-item { margin: 10px 0; }
        .assignment-label { font-weight: bold; color: #f5576c; }
        .assignment-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #fef5f6; border: 1px solid #f5576c; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Evaluator Assignment Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${advisorName},</p>
          <p>You have been assigned by the Faculty Head to evaluate a group's final year project.</p>
          
          <div class="assignment-box">
            <h3 style="margin-top: 0; color: #f5576c;">📊 Evaluation Assignment Details</h3>
            <div class="assignment-item">
              <div class="assignment-label">Group:</div>
              <div class="assignment-value">${groupName}</div>
            </div>
            <div class="assignment-item">
              <div class="assignment-label">Project Title:</div>
              <div class="assignment-value">${projectTitle}</div>
            </div>
            <div class="assignment-item">
              <div class="assignment-label">Department:</div>
              <div class="assignment-value">${department}</div>
            </div>
            <div class="assignment-item">
              <div class="assignment-label">Role:</div>
              <div class="assignment-value">Project Evaluator</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Your Responsibilities:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review the group's project documentation and deliverables</li>
              <li>Attend the project defense session</li>
              <li>Evaluate the project based on the established criteria</li>
              <li>Provide constructive feedback to the students</li>
              <li>Submit your evaluation scores and comments</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${evaluationUrl}" class="button">View Assigned Evaluations</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions about your evaluation duties, please contact the Faculty Head or system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Evaluator Assignment - FYP Project',
    html
  });
};

/**
 * Send defense schedule notification to group members
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} projectTitle - Project title
 * @param {string} date - Defense date
 * @param {string} time - Defense time
 * @param {string} venue - Defense venue
 */
const sendDefenseScheduleEmailToStudents = async (to, studentName, groupName, projectTitle, date, time, venue) => {
  const defenseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/defense-schedule`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .schedule-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .schedule-item { margin: 10px 0; }
        .schedule-label { font-weight: bold; color: #667eea; }
        .schedule-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #e8f4f8; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Defense Schedule Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Your final year project defense has been scheduled. Please review the details below and prepare accordingly.</p>
          
          <div class="schedule-box">
            <h3 style="margin-top: 0; color: #667eea;">📅 Defense Details</h3>
            <div class="schedule-item">
              <div class="schedule-label">Group:</div>
              <div class="schedule-value">${groupName}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">Project Title:</div>
              <div class="schedule-value">${projectTitle}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">📆 Date:</div>
              <div class="schedule-value">${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">🕐 Time:</div>
              <div class="schedule-value">${time}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">📍 Venue:</div>
              <div class="schedule-value">${venue}</div>
            </div>
          </div>

          <div class="highlight">
            <strong>⏰ Important:</strong> Please arrive at least 15 minutes before your scheduled time for setup.
          </div>

          <div class="info-box">
            <strong>📌 Preparation Tips:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Prepare your final presentation slides</li>
              <li>Bring any required equipment or materials</li>
              <li>Be ready to demonstrate your project</li>
              <li>Prepare to answer questions from evaluators</li>
              <li>All group members should be present</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${defenseUrl}" class="button">View Defense Schedule</a>
          </p>

          <p><strong>Good luck with your defense!</strong> If you have any questions, please contact your advisor or the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '🎓 Your FYP Defense Schedule',
    html
  });
};

/**
 * Send defense schedule notification to department head
 * @param {string} to - Department head email
 * @param {string} deptHeadName - Department head's name
 * @param {string} groupName - Group name
 * @param {string} department - Department name
 * @param {string} date - Defense date
 * @param {string} time - Defense time
 * @param {string} venue - Defense venue
 */
const sendDefenseScheduleEmailToDeptHead = async (to, deptHeadName, groupName, department, date, time, venue) => {
  const defenseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dept-head/defense-schedule`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .schedule-box { background: #fff; border: 2px solid #56ab2f; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .schedule-item { margin: 10px 0; }
        .schedule-label { font-weight: bold; color: #56ab2f; }
        .schedule-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #56ab2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #f0f9ef; border: 1px solid #56ab2f; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Defense Schedule Generated</h1>
        </div>
        <div class="content">
          <p>Hello ${deptHeadName},</p>
          <p>A defense schedule has been generated for a group in your department.</p>
          
          <div class="schedule-box">
            <h3 style="margin-top: 0; color: #56ab2f;">🎓 Defense Details</h3>
            <div class="schedule-item">
              <div class="schedule-label">Group:</div>
              <div class="schedule-value">${groupName}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">Department:</div>
              <div class="schedule-value">${department}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">📆 Date:</div>
              <div class="schedule-value">${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">🕐 Time:</div>
              <div class="schedule-value">${time}</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-label">📍 Venue:</div>
              <div class="schedule-value">${venue}</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Information:</strong>
            <p style="margin: 10px 0;">This is to inform you that a defense schedule has been created for the above group. Evaluators have been notified of their duties.</p>
          </div>

          <p style="text-align: center;">
            <a href="${defenseUrl}" class="button">View All Defense Schedules</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the Faculty Head or system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Defense Schedule Generated - Your Department',
    html
  });
};

/**
 * Send defense duty notification to evaluator
 * @param {string} to - Evaluator email
 * @param {string} evaluatorName - Evaluator's name
 * @param {string} groupName - Group name
 * @param {string} date - Defense date
 * @param {string} time - Defense time
 * @param {string} venue - Defense venue
 */
const sendDefenseDutyEmail = async (to, evaluatorName, groupName, date, time, venue) => {
  const defenseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/advisor/schedule`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .duty-box { background: #fff; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .duty-item { margin: 10px 0; }
        .duty-label { font-weight: bold; color: #f5576c; }
        .duty-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #fef5f6; border: 1px solid #f5576c; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Defense Evaluation Duty</h1>
        </div>
        <div class="content">
          <p>Hello ${evaluatorName},</p>
          <p>You have been assigned to evaluate a final year project defense. Please review the details below.</p>
          
          <div class="duty-box">
            <h3 style="margin-top: 0; color: #f5576c;">📋 Defense Evaluation Details</h3>
            <div class="duty-item">
              <div class="duty-label">Group:</div>
              <div class="duty-value">${groupName}</div>
            </div>
            <div class="duty-item">
              <div class="duty-label">📆 Date:</div>
              <div class="duty-value">${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="duty-item">
              <div class="duty-label">🕐 Time:</div>
              <div class="duty-value">${time}</div>
            </div>
            <div class="duty-item">
              <div class="duty-label">📍 Venue:</div>
              <div class="duty-value">${venue}</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Your Responsibilities:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review the group's project documentation before the defense</li>
              <li>Attend the defense session at the scheduled time</li>
              <li>Evaluate the presentation and demonstration</li>
              <li>Ask relevant questions to assess the students' understanding</li>
              <li>Submit your evaluation scores and feedback</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${defenseUrl}" class="button">View My Schedule</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions or conflicts, please contact the Faculty Head.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Defense Evaluation Duty Assignment',
    html
  });
};

/**
 * Send inquiry submission notification to admin
 * @param {string} to - Admin email
 * @param {string} adminName - Admin's name
 * @param {string} inquirerName - Name of person who submitted inquiry
 * @param {string} inquirerEmail - Email of person who submitted inquiry
 * @param {string} message - Inquiry message
 * @param {string} inquiryId - Inquiry ID
 */
const sendInquirySubmissionEmail = async (to, adminName, inquirerName, inquirerEmail, message, inquiryId) => {
  const inquiryUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/inquiries`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .inquiry-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .inquiry-item { margin: 10px 0; }
        .inquiry-label { font-weight: bold; color: #667eea; }
        .inquiry-value { color: #333; padding: 5px 0; }
        .message-box { background: #f5f5f5; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; font-style: italic; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #e8f4f8; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📬 New Support Inquiry</h1>
        </div>
        <div class="content">
          <p>Hello ${adminName},</p>
          <p>A new support inquiry has been submitted through the website contact form.</p>
          
          <div class="inquiry-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Inquiry Details</h3>
            <div class="inquiry-item">
              <div class="inquiry-label">From:</div>
              <div class="inquiry-value">${inquirerName}</div>
            </div>
            <div class="inquiry-item">
              <div class="inquiry-label">Email:</div>
              <div class="inquiry-value">${inquirerEmail}</div>
            </div>
            <div class="inquiry-item">
              <div class="inquiry-label">Inquiry ID:</div>
              <div class="inquiry-value">#${inquiryId}</div>
            </div>
            
            <div class="inquiry-item" style="margin-top: 20px;">
              <div class="inquiry-label">📝 Message:</div>
              <div class="message-box">${message}</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Action Required:</strong>
            <p style="margin: 10px 0;">Please review this inquiry and respond to the user as soon as possible. You can manage all inquiries from the admin panel.</p>
          </div>

          <p style="text-align: center;">
            <a href="${inquiryUrl}" class="button">View All Inquiries</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '📬 New Support Inquiry Received',
    html
  });
};

/**
 * Send inquiry response notification to inquirer
 * @param {string} to - Inquirer email
 * @param {string} inquirerName - Inquirer's name
 * @param {string} responseMessage - Admin's response message
 * @param {string} originalMessage - Original inquiry message
 * @param {string} inquiryId - Inquiry ID
 */
const sendInquiryResponseEmail = async (to, inquirerName, responseMessage, originalMessage, inquiryId) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .response-box { background: #fff; border: 2px solid #11998e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .response-item { margin: 10px 0; }
        .response-label { font-weight: bold; color: #11998e; }
        .response-value { color: #333; padding: 5px 0; }
        .message-box { background: #f5f5f5; border-left: 4px solid #11998e; padding: 15px; margin: 15px 0; }
        .original-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #f0f9ef; border: 1px solid #11998e; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Inquiry Response</h1>
        </div>
        <div class="content">
          <p>Hello ${inquirerName},</p>
          <p>Good news! Our support team has responded to your inquiry.</p>
          
          <div class="response-box">
            <h3 style="margin-top: 0; color: #11998e;">📋 Response Details</h3>
            <div class="response-item">
              <div class="response-label">Inquiry ID:</div>
              <div class="response-value">#${inquiryId}</div>
            </div>
            <div class="response-item">
              <div class="response-label">Status:</div>
              <div class="response-value">✅ Resolved</div>
            </div>
            
            <div class="response-item" style="margin-top: 20px;">
              <div class="response-label">💬 Our Response:</div>
              <div class="message-box">${responseMessage || 'Thank you for your inquiry. We have addressed your concern.'}</div>
            </div>
            
            <div class="response-item" style="margin-top: 20px;">
              <div class="response-label">📝 Your Original Message:</div>
              <div class="original-box">${originalMessage}</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Additional Information:</strong>
            <p style="margin: 10px 0;">If you have any further questions or concerns, please don't hesitate to contact us again through the website contact form.</p>
          </div>

          <p><strong>Thank you</strong> for reaching out to us. We appreciate your feedback and are always here to help.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '✅ Your Inquiry Has Been Responded To',
    html
  });
};

/**
 * Send registration approval notification to student
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} department - Department name
 * @param {string} studentId - Student ID
 */
const sendRegistrationApprovalEmail = async (to, studentName, department, studentId) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #fff; border: 2px solid #11998e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .success-item { margin: 10px 0; }
        .success-label { font-weight: bold; color: #11998e; }
        .success-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
        .info-box { background: #f0f9ef; border: 1px solid #11998e; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Registration Approved!</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Great news! Your registration has been approved by your Department Head.</p>
          
          <div class="celebration">✅</div>
          
          <div class="success-box">
            <h3 style="margin-top: 0; color: #11998e;">📋 Your Account Details</h3>
            <div class="success-item">
              <div class="success-label">Name:</div>
              <div class="success-value">${studentName}</div>
            </div>
            <div class="success-item">
              <div class="success-label">Student ID:</div>
              <div class="success-value">${studentId}</div>
            </div>
            <div class="success-item">
              <div class="success-label">Department:</div>
              <div class="success-value">${department}</div>
            </div>
            <div class="success-item">
              <div class="success-label">Status:</div>
              <div class="success-value">✅ Active</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>You can now log in to the FYP Management System</li>
              <li>Use the email address you registered with as your username</li>
              <li>Use the password you created during registration</li>
              <li>Complete your profile if needed</li>
              <li>Wait for group formation announcements</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login Now</a>
          </p>

          <p><strong>Congratulations!</strong> We're excited to have you on board. If you have any questions, please contact your department.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '✅ Registration Approved - Welcome to FYP Management System!',
    html
  });
};

/**
 * Send registration rejection notification to student
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} department - Department name
 * @param {string} reason - Rejection reason (optional)
 */
const sendRegistrationRejectionEmail = async (to, studentName, department, reason) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #eb3349; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #eb3349; }
        .info-value { color: #333; padding: 5px 0; }
        .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .support-box { background: #fef5f6; border: 1px solid #eb3349; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Registration Status Update</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>We regret to inform you that your registration has been reviewed and unfortunately rejected by your Department Head.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #eb3349;">📋 Your Registration Details</h3>
            <div class="info-item">
              <div class="info-label">Name:</div>
              <div class="info-value">${studentName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Department:</div>
              <div class="info-value">${department}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">❌ Rejected</div>
            </div>
          </div>

          ${reason ? `
          <div class="reason-box">
            <strong>📝 Reason for Rejection:</strong>
            <p style="margin: 10px 0;">${reason}</p>
          </div>
          ` : ''}

          <div class="support-box">
            <strong>📌 What You Can Do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Contact your department head for clarification on the rejection reason</li>
              <li>Address the issues mentioned (if applicable)</li>
              <li>You may submit a new registration with corrected information</li>
              <li>Reach out to the IT support team if you believe this is an error</li>
            </ul>
          </div>

          <p><strong>We understand</strong> this may be disappointing, but we're here to help. Please don't hesitate to reach out to your department for guidance.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Registration Status Update',
    html
  });
};

/**
 * Send email to department head when a student submits registration
 * @param {string} to - Department head email
 * @param {string} deptHeadName - Department head's name
 * @param {string} studentName - Student's name
 * @param {string} studentEmail - Student's email
 * @param {string} studentId - Student ID
 * @param {string} department - Department name
 */
const sendStudentRegistrationEmail = async (to, deptHeadName, studentName, studentEmail, studentId, department) => {
  const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dept-head/users`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .student-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .student-item { margin: 10px 0; }
        .student-label { font-weight: bold; color: #667eea; }
        .student-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #f0f9ef; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Student Registration Submitted</h1>
        </div>
        <div class="content">
          <p>Hello ${deptHeadName},</p>
          <p>A new student from your department has submitted their registration for approval.</p>

          <div class="student-box">
            <h3 style="margin-top: 0; color: #667eea;">📝 Student Details</h3>
            <div class="student-item">
              <div class="student-label">Name:</div>
              <div class="student-value">${studentName}</div>
            </div>
            <div class="student-item">
              <div class="student-label">Email:</div>
              <div class="student-value">${studentEmail}</div>
            </div>
            <div class="student-item">
              <div class="student-label">Student ID:</div>
              <div class="student-value">${studentId}</div>
            </div>
            <div class="student-item">
              <div class="student-label">Department:</div>
              <div class="student-value">${department}</div>
            </div>
            <div class="student-item">
              <div class="student-label">Status:</div>
              <div class="student-value">⏳ Pending Approval</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Action Required:</strong>
            <p style="margin: 10px 0;">Please review this student's registration and either approve or reject it. You can view all pending registrations from your department dashboard.</p>
          </div>

          <p style="text-align: center;">
            <a href="${adminUrl}" class="button">Review Registration</a>
          </p>

          <p><strong>Thank you</strong> for your attention to this matter. If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '📋 New Student Registration Pending Approval',
    html
  });
};

/**
 * Send new academic year notification to users
 * @param {string} to - User email
 * @param {string} userName - User's name
 * @param {string} yearName - Academic year name
 * @param {string} userRole - User's role
 */
const sendNewAcademicYearEmail = async (to, userName, yearName, userRole) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #667eea; }
        .info-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .highlights-box { background: #e8f4f8; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .role-specific { background: #f0f9ef; border-left: 4px solid #11998e; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 New Academic Year ${yearName}</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We are excited to announce the start of a new academic year! The FYP Management System is now ready for Semester 1 (Documentation Phase).</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Academic Year Information</h3>
            <div class="info-item">
              <div class="info-label">Academic Year:</div>
              <div class="info-value">${yearName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Current Semester:</div>
              <div class="info-value">Semester 1 (Documentation Phase)</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">✅ Active</div>
            </div>
          </div>

          <div class="highlights-box">
            <strong>📌 What's New:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>All previous semester data has been archived</li>
              <li>New academic year features are now available</li>
              <li>System is ready for new registrations and group formations</li>
              <li>Documentation phase activities can now begin</li>
            </ul>
          </div>

          ${userRole === 'student' ? `
          <div class="role-specific">
            <strong>👨‍🎓 For Students:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Wait for group formation announcements from your department</li>
              <li>Prepare for project proposal submissions</li>
              <li>Stay updated with notifications from your department head</li>
            </ul>
          </div>
          ` : userRole === 'advisor' ? `
          <div class="role-specific">
            <strong>👨‍🏫 For Advisors:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review and guide student project proposals</li>
              <li>Monitor group progress throughout the semester</li>
              <li>Provide timely feedback on submissions</li>
            </ul>
          </div>
          ` : userRole === 'dept-head' ? `
          <div class="role-specific">
            <strong>👔 For Department Heads:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review and approve student registrations</li>
              <li>Form groups and assign advisors</li>
              <li>Evaluate project proposals</li>
              <li>Monitor departmental progress</li>
            </ul>
          </div>
          ` : userRole === 'admin' ? `
          <div class="role-specific">
            <strong>⚙️ For Administrators:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Monitor system-wide activities</li>
              <li>Manage user accounts and permissions</li>
              <li>Review system inquiries and support requests</li>
              <li>Ensure smooth operation of the new academic year</li>
            </ul>
          </div>
          ` : ''}

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Access System</a>
          </p>

          <p><strong>We wish you</strong> a successful and productive academic year! If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: `🎓 New Academic Year ${yearName} - Semester 1 Started!`,
    html
  });
};

/**
 * Send semester change notification to users
 * @param {string} to - User email
 * @param {string} userName - User's name
 * @param {string} semester - New semester number
 * @param {string} userRole - User's role
 */
const sendSemesterChangeEmail = async (to, userName, semester, userRole) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;
  const phaseName = semester === '1' ? 'Documentation Phase' : 'Implementation Phase';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #f5576c; }
        .info-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .highlights-box { background: #fef5f6; border: 1px solid #f5576c; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .role-specific { background: #f0f9ef; border-left: 4px solid #11998e; padding: 15px; margin: 15px 0; }
        .phase-banner { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Semester ${semester} Started</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>The academic year has transitioned to <strong>Semester ${semester}</strong> (${phaseName}). The system has been updated accordingly.</p>
          
          <div class="phase-banner">
            <h2 style="margin: 0; font-size: 24px;">🎯 ${phaseName}</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Academic Year Progress</p>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #f5576c;">📋 Current Semester Information</h3>
            <div class="info-item">
              <div class="info-label">Semester:</div>
              <div class="info-value">Semester ${semester}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phase:</div>
              <div class="info-value">${phaseName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">✅ Active</div>
            </div>
          </div>

          <div class="highlights-box">
            <strong>📌 What's Changed:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>System functionalities have been updated for Semester ${semester}</li>
              <li>${semester === '2' ? 'Implementation activities are now available' : 'Documentation phase activities are now available'}</li>
              <li>${semester === '2' ? 'Project implementation and development can begin' : 'Project proposals and documentation can be submitted'}</li>
              <li>All previous semester data has been preserved</li>
            </ul>
          </div>

          ${userRole === 'student' ? `
          <div class="role-specific">
            <strong>👨‍🎓 For Students - Semester ${semester}:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${semester === '2' ? `
              <li>Begin implementing your approved project</li>
              <li>Submit progress reports as scheduled</li>
              <li>Prepare for mid-term and final evaluations</li>
              <li>Work on your final draft submission</li>
              <li>Coordinate with your advisor regularly</li>
              ` : `
              <li>Finalize your project proposal if not already done</li>
              <li>Complete all documentation requirements</li>
              <li>Prepare for project implementation in Semester 2</li>
              <li>Stay updated with advisor feedback</li>
              `}
            </ul>
          </div>
          ` : userRole === 'advisor' ? `
          <div class="role-specific">
            <strong>👨‍🏫 For Advisors - Semester ${semester}:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${semester === '2' ? `
              <li>Monitor student progress on implementation</li>
              <li>Review and provide feedback on progress reports</li>
              <li>Guide students through technical challenges</li>
              <li>Approve final drafts when ready</li>
              <li>Prepare for project defense evaluations</li>
              ` : `
              <li>Review and approve student project proposals</li>
              <li>Guide students on documentation standards</li>
              <li>Ensure students are ready for implementation</li>
              <li>Provide feedback on proposal submissions</li>
              `}
            </ul>
          </div>
          ` : userRole === 'dept-head' ? `
          <div class="role-specific">
            <strong>👔 For Department Heads - Semester ${semester}:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${semester === '2' ? `
              <li>Monitor departmental progress reports</li>
              <li>Review final drafts for departmental approval</li>
              <li>Oversee defense schedule preparations</li>
              <li>Ensure timely completion of semester activities</li>
              <li>Address any departmental issues promptly</li>
              ` : `
              <li>Monitor proposal submissions in your department</li>
              <li>Ensure all students have formed groups</li>
              <li>Review and track departmental progress</li>
              <li>Support advisors and students as needed</li>
              `}
            </ul>
          </div>
          ` : userRole === 'admin' ? `
          <div class="role-specific">
            <strong>⚙️ For Administrators - Semester ${semester}:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Monitor system-wide semester transition</li>
              <li>Ensure all features are functioning correctly</li>
              <li>Support users with any transition issues</li>
              <li>Review system inquiries and support requests</li>
              <li>Coordinate with faculty head on system settings</li>
            </ul>
          </div>
          ` : ''}

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Access System</a>
          </p>

          <p><strong>We wish you</strong> a productive and successful semester! If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: `📅 Semester ${semester} (${phaseName}) - Academic Year Update`,
    html
  });
};

/**
 * Send semester change notification to department heads (specific for Sem 1 → Sem 2)
 * @param {string} to - Department head email
 * @param {string} deptHeadName - Department head's name
 * @param {string} semester - New semester number
 * @param {string} department - Department name
 */
const sendSemesterChangeToDeptHeadEmail = async (to, deptHeadName, semester, department) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dept-head/dashboard`;
  const phaseName = semester === '1' ? 'Documentation Phase' : 'Implementation Phase';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #56ab2f; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #56ab2f; }
        .info-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #56ab2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .highlights-box { background: #f0f9ef; border: 1px solid #56ab2f; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .role-specific { background: #e8f4f8; border-left: 4px solid #56ab2f; padding: 15px; margin: 15px 0; }
        .phase-banner { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Semester ${semester} Started - Department Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${deptHeadName},</p>
          <p>The academic year has transitioned to <strong>Semester ${semester}</strong> (${phaseName}). As a Department Head, please review the changes below.</p>

          <div class="phase-banner">
            <h2 style="margin: 0; font-size: 24px;">🎯 ${phaseName}</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Department: ${department}</p>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #56ab2f;">📋 Current Semester Information</h3>
            <div class="info-item">
              <div class="info-label">Semester:</div>
              <div class="info-value">Semester ${semester}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phase:</div>
              <div class="info-value">${phaseName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Department:</div>
              <div class="info-value">${department}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">✅ Active</div>
            </div>
          </div>

          ${semester === '2' ? `
          <div class="highlights-box">
            <strong>📌 Important Changes for Semester 2:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>🎓 Students will begin project implementation</li>
              <li>📊 Progress reports will be submitted by groups</li>
              <li>👥 Evaluators will be assigned to groups</li>
              <li>📝 Final drafts will be prepared and submitted</li>
              <li>🎤 Project defenses will be scheduled</li>
            </ul>
          </div>

          <div class="role-specific">
            <strong>👨‍💼 For Department Heads - Semester 2 Responsibilities:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Monitor project implementation progress across all groups</li>
              <li>Review and approve final drafts after advisor approval</li>
              <li>Oversee the evaluation process in your department</li>
              <li>Ensure smooth coordination between advisors and evaluators</li>
              <li>Track student progress and address any issues</li>
              <li>Prepare for department-level defense scheduling</li>
            </ul>
          </div>
          ` : `
          <div class="highlights-box">
            <strong>📌 Important Information for Semester 1:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>📝 Students are working on project proposals</li>
              <li>📋 Documentation phase is in progress</li>
              <li>👥 Groups are being formed</li>
              <li>✅ Proposals will be evaluated and approved</li>
            </ul>
          </div>

          <div class="role-specific">
            <strong>👨‍💼 For Department Heads - Semester 1 Responsibilities:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review and evaluate student project proposals</li>
              <li>Approve or request revisions for proposals</li>
              <li>Monitor group formation process</li>
              <li>Ensure all students are registered</li>
            </ul>
          </div>
          `}

          <p style="text-align: center;">
            <a href="${dashboardUrl}" class="button">View Department Dashboard</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions about the semester transition, please contact the Faculty Head or system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: `📅 Semester ${semester} Started - Department Head Notification`,
    html
  });
};

/**
 * Send semester change notification to advisors (specific for Sem 1 → Sem 2)
 * @param {string} to - Advisor email
 * @param {string} advisorName - Advisor's name
 * @param {string} semester - New semester number
 */
const sendSemesterChangeToAdvisorEmail = async (to, advisorName, semester) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/advisor/dashboard`;
  const phaseName = semester === '1' ? 'Documentation Phase' : 'Implementation Phase';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #f5576c; }
        .info-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .highlights-box { background: #fef5f6; border: 1px solid #f5576c; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .role-specific { background: #f0f9ef; border-left: 4px solid #f5576c; padding: 15px; margin: 15px 0; }
        .phase-banner { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Semester ${semester} Started - Advisor Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${advisorName},</p>
          <p>The academic year has transitioned to <strong>Semester ${semester}</strong> (${phaseName}). As an Advisor, please review the changes below.</p>

          <div class="phase-banner">
            <h2 style="margin: 0; font-size: 24px;">🎯 ${phaseName}</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Role: Project Advisor</p>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #f5576c;">📋 Current Semester Information</h3>
            <div class="info-item">
              <div class="info-label">Semester:</div>
              <div class="info-value">Semester ${semester}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phase:</div>
              <div class="info-value">${phaseName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">✅ Active</div>
            </div>
          </div>

          ${semester === '2' ? `
          <div class="highlights-box">
            <strong>📌 Important Changes for Semester 2:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>🎓 Students will begin project implementation</li>
              <li>📊 Progress reports will be submitted regularly</li>
              <li>👥 Evaluators will be assigned to your groups</li>
              <li>📝 Final drafts will be prepared for your approval</li>
              <li>🎤 Project defenses will be scheduled</li>
            </ul>
          </div>

          <div class="role-specific">
            <strong>👨‍🏫 For Advisors - Semester 2 Responsibilities:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review and provide feedback on student progress reports</li>
              <li>Monitor student implementation progress regularly</li>
              <li>Guide students through technical challenges</li>
              <li>Approve final drafts when students are ready</li>
              <li>Coordinate with assigned evaluators</li>
              <li>Prepare students for project defense</li>
              <li>Attend defense sessions as needed</li>
            </ul>
          </div>
          ` : `
          <div class="highlights-box">
            <strong>📌 Important Information for Semester 1:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>📝 Students are working on project proposals</li>
              <li>📋 Documentation phase is in progress</li>
              <li>👥 You may be assigned as advisor to groups</li>
              <li>✅ Proposals will be evaluated and approved</li>
            </ul>
          </div>

          <div class="role-specific">
            <strong>👨‍🏫 For Advisors - Semester 1 Responsibilities:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Guide students on project proposal development</li>
              <li>Review and provide feedback on proposals</li>
              <li>Help students with documentation standards</li>
              <li>Monitor group formation and progress</li>
            </ul>
          </div>
          `}

          <p style="text-align: center;">
            <a href="${dashboardUrl}" class="button">View Advisor Dashboard</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions about the semester transition or your advising duties, please contact the Faculty Head or system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: `📅 Semester ${semester} Started - Advisor Notification`,
    html
  });
};

/**
 * Send final draft submission notification to advisor
 * @param {string} to - Advisor email
 * @param {string} advisorName - Advisor's name
 * @param {string} groupName - Group name
 * @param {string} draftTitle - Final draft title
 * @param {string} department - Department name
 */
const sendFinalDraftSubmissionEmail = async (to, advisorName, groupName, draftTitle, department) => {
  const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/advisor/final-approval`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .draft-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .draft-item { margin: 10px 0; }
        .draft-label { font-weight: bold; color: #667eea; }
        .draft-value { color: #333; padding: 5px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .info-box { background: #e8f4f8; border: 1px solid #667eea; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 Final Draft Submitted</h1>
        </div>
        <div class="content">
          <p>Hello ${advisorName},</p>
          <p>A group under your supervision has submitted their final draft for review.</p>
          
          <div class="draft-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Final Draft Details</h3>
            <div class="draft-item">
              <div class="draft-label">Group:</div>
              <div class="draft-value">${groupName}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Draft Title:</div>
              <div class="draft-value">${draftTitle}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Department:</div>
              <div class="draft-value">${department}</div>
            </div>
            <div class="draft-item">
              <div class="draft-label">Status:</div>
              <div class="draft-value">⏳ Pending Review</div>
            </div>
          </div>

          <div class="info-box">
            <strong>📌 Action Required:</strong>
            <p style="margin: 10px 0;">Please review the final draft submitted by your group and provide your assessment. You can approve the draft or request revisions if needed.</p>
          </div>

          <p style="text-align: center;">
            <a href="${reviewUrl}" class="button">Review Final Draft</a>
          </p>

          <p><strong>Need help?</strong> If you have any questions, please contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '📄 Final Draft Submitted - Review Required',
    html
  });
};

/**
 * Send account approval notification
 * @param {string} to - Recipient email
 * @param {string} userName - User's name
 */
const sendAccountApprovalEmail = async (to, userName) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Account Approved!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Great news! Your account registration has been approved.</p>
          <p>You can now log in to the FYP Management System and access all features.</p>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login Now</a>
          </p>
          <p>If you have any questions, please contact your department head.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Account Approved - FYP Management System',
    html
  });
};

/**
 * Send account rejection notification
 * @param {string} to - Recipient email
 * @param {string} userName - User's name
 * @param {string} reason - Rejection reason (optional)
 */
const sendAccountRejectionEmail = async (to, userName, reason = null) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Registration Update</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We regret to inform you that your registration has been rejected.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you believe this is a mistake or have questions, please contact your department head.</p>
          <p>You may submit a new registration if applicable.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Registration Status Update - FYP Management System',
    html
  });
};

/**
 * Send proposal approval email to student
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} projectTitle - Approved project title
 * @param {string} domain - Project domain
 */
const sendProposalApprovalEmail = async (to, studentName, groupName, projectTitle, domain) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #fff; border: 2px solid #11998e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .project-info { background: #f0f9ef; border-left: 4px solid #11998e; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Proposal Approved!</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Congratulations! Your project proposal has been approved by your Department Head.</p>

          <div class="celebration">✅</div>

          <div class="success-box">
            <h3 style="margin-top: 0; color: #11998e;">📋 Project Details</h3>
            <p><strong>Group:</strong> ${groupName}</p>
            <p><strong>Project Title:</strong> ${projectTitle}</p>
            <p><strong>Domain:</strong> ${domain}</p>
            <p><strong>Status:</strong> <span style="color: #11998e; font-weight: bold;">✅ Approved</span></p>
          </div>

          <div class="project-info">
            <strong>📌 Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Begin working on your project documentation (Semester 1)</li>
              <li>Coordinate with your group members</li>
              <li>Submit progress reports as required</li>
              <li>Contact your advisor for guidance</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Access Your Dashboard</a>
          </p>

          <p><strong>Congratulations again!</strong> We wish you success in your project. If you have any questions, please contact your advisor or department.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '🎉 Proposal Approved - FYP Management System',
    html
  });
};

/**
 * Send proposal rejection email to student
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} feedback - Rejection feedback
 */
const sendProposalRejectionEmail = async (to, studentName, groupName, feedback) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff; border: 2px solid #eb3349; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .feedback-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .support-box { background: #fef5f6; border: 1px solid #eb3349; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: #eb3349; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Proposal Status Update</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Your project proposal has been reviewed by your Department Head.</p>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #eb3349;">📋 Proposal Details</h3>
            <p><strong>Group:</strong> ${groupName}</p>
            <p><strong>Status:</strong> <span style="color: #eb3349; font-weight: bold;">❌ Rejected</span></p>
          </div>

          ${feedback ? `
          <div class="feedback-box">
            <strong>📝 Feedback from Department Head:</strong>
            <p style="margin: 10px 0;">${feedback}</p>
          </div>
          ` : ''}

          <div class="support-box">
            <strong>📌 What You Can Do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review the feedback provided by your Department Head</li>
              <li>Discuss with your group members to address the concerns</li>
              <li>Submit new proposal titles with improved content</li>
              <li>Consult with your advisor for guidance</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Submit New Proposal</a>
          </p>

          <p><strong>Don't be discouraged!</strong> Use this feedback to improve your proposal. If you have questions about the feedback, please contact your Department Head or advisor.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'Proposal Status Update - FYP Management System',
    html
  });
};

/**
 * Send email to students when their project is claimed by an advisor
 * @param {string} to - Student email
 * @param {string} studentName - Student's name
 * @param {string} groupName - Group name
 * @param {string} advisorName - Advisor's name
 * @param {string} advisorEmail - Advisor's email
 */
const sendAdvisorProjectClaimEmail = async (to, studentName, groupName, advisorName, advisorEmail) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .advisor-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .advisor-info { background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👨‍🏫 Advisor Assigned to Your Project</h1>
        </div>
        <div class="content">
          <p>Hello ${studentName},</p>
          <p>Great news! Your group project has been assigned an advisor who will guide you throughout your FYP journey.</p>

          <div class="advisor-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Project & Advisor Details</h3>
            <p><strong>Group:</strong> ${groupName}</p>
            <p><strong>Advisor:</strong> ${advisorName}</p>
            ${advisorEmail ? `<p><strong>Advisor Email:</strong> ${advisorEmail}</p>` : ''}
            <p><strong>Status:</strong> <span style="color: #667eea; font-weight: bold;">✅ Advisor Assigned</span></p>
          </div>

          <div class="advisor-info">
            <strong>📌 What This Means:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Your advisor will guide you through your project development</li>
              <li>Schedule a meeting with your advisor to discuss your project timeline</li>
              <li>Keep your advisor updated on your progress</li>
              <li>Seek feedback and guidance from your advisor regularly</li>
            </ul>
          </div>

          <div class="advisor-info">
            <strong>💡 Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Coordinate with your group members to schedule an initial meeting</li>
              <li>Prepare a brief presentation of your project idea</li>
              <li>Be open to feedback and suggestions from your advisor</li>
              <li>Maintain regular communication throughout the semester</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Access Your Dashboard</a>
          </p>

          <p><strong>Congratulations!</strong> Having an advisor is a crucial step in your FYP journey. Make the most of their expertise and guidance.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: '👨‍🏫 Advisor Assigned to Your Project - FYP Management System',
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendAccountApprovalEmail,
  sendAccountRejectionEmail,
  sendAccountCreationEmail,
  sendProposalSubmissionEmail,
  sendProposalApprovalEmail,
  sendProposalRejectionEmail,
  sendProgressSubmissionEmail,
  sendProgressFeedbackEmail,
  sendFinalDraftApprovalEmailToDeptHead,
  sendFinalDraftApprovalEmailToStudents,
  sendGroupFormationEmail,
  sendEvaluatorAssignmentEmail,
  sendEvaluatorAssignmentToStudentsEmail,
  sendEvaluatorAssignmentToDeptHeadEmail,
  sendDefenseScheduleEmailToStudents,
  sendDefenseScheduleEmailToDeptHead,
  sendDefenseDutyEmail,
  sendInquirySubmissionEmail,
  sendInquiryResponseEmail,
  sendRegistrationApprovalEmail,
  sendRegistrationRejectionEmail,
  sendStudentRegistrationEmail,
  sendNewAcademicYearEmail,
  sendSemesterChangeEmail,
  sendSemesterChangeToDeptHeadEmail,
  sendSemesterChangeToAdvisorEmail,
  sendFinalDraftSubmissionEmail,
  sendAdvisorProjectClaimEmail,
  transporter
};
