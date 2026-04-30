const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');
const { getGroupById } = require('./controllers/groupController');
const backupService = require('./services/backupService');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize backup service (auto backups, cleanup)
backupService.initialize().catch(err => {
  console.error('Failed to initialize backup service:', err);
});

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const academicRoutes = require('./routes/academicRoutes');
const groupRoutes = require('./routes/groupRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const progressRoutes = require('./routes/progressRoutes');
const finalDraftRoutes = require('./routes/finalDraftRoutes');
const defenseRoutes = require('./routes/defenseRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); // ADD THIS
const sectionRoutes = require('./routes/sectionRoutes');

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Serve static files from uploads directory - ADD THIS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/final-drafts', finalDraftRoutes);
app.use('/api/defense', defenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/upload', uploadRoutes); // ADD THIS
app.use('/api/sections', sectionRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'FYP Backend API is running!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/academic',
      '/api/groups',
      '/api/proposals',
      '/api/progress',
      '/api/final-drafts',
      '/api/defense',
      '/api/notifications',
      '/api/inquiries',
      '/api/upload'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Cannot find ${req.originalUrl} on this server!` 
  });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`
  🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}
  📝 Test endpoint: http://localhost:${PORT}/api/test
  🔐 Auth endpoints: http://localhost:${PORT}/api/auth
  👥 User endpoints: http://localhost:${PORT}/api/users
  📅 Academic endpoints: http://localhost:${PORT}/api/academic
  👥 Group endpoints: http://localhost:${PORT}/api/groups
  📝 Proposal endpoints: http://localhost:${PORT}/api/proposals
  📊 Progress endpoints: http://localhost:${PORT}/api/progress
  📄 Final Draft endpoints: http://localhost:${PORT}/api/final-drafts
  🗓️ Defense endpoints: http://localhost:${PORT}/api/defense
  🔔 Notification endpoints: http://localhost:${PORT}/api/notifications
  💬 Inquiry endpoints: http://localhost:${PORT}/api/inquiries
  📤 Upload endpoints: http://localhost:${PORT}/api/upload
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Error: ${err.message}`);
  server.close(() => process.exit(1));
});