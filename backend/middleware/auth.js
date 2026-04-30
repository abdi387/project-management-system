const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

// Helper function to get session timeout from database
const getSessionTimeout = async () => {
  try {
    const setting = await SystemSetting.findOne({
      where: { key: 'session_timeout' }
    });
    
    if (!setting) {
      console.log('[Session Timeout] Not found in DB, using default 30 min');
      return 30;
    }
    
    // Parse the value - handle string or number
    const timeoutValue = parseInt(String(setting.value).trim(), 10);
    
    if (isNaN(timeoutValue) || timeoutValue <= 0) {
      console.log('[Session Timeout] Invalid value:', setting.value, 'using default 30 min');
      return 30;
    }
    
    console.log('[Session Timeout] Retrieved from DB:', timeoutValue, 'minutes');
    return timeoutValue;
  } catch (error) {
    console.error('[Session Timeout] Error:', error.message, 'using default 30 min');
    return 30; // Default fallback
  }
};

// Helper function to get password min length from database
const getPasswordMinLength = async () => {
  try {
    const setting = await SystemSetting.findOne({
      where: { key: 'password_min_length' }
    });
    
    if (!setting) {
      console.log('[Password Min Length] Not found in DB, using default 8');
      return 8;
    }
    
    const minLength = parseInt(String(setting.value).trim(), 10);
    
    if (isNaN(minLength) || minLength < 4) {
      console.log('[Password Min Length] Invalid value:', setting.value, 'using default 8');
      return 8;
    }
    
    console.log('[Password Min Length] Retrieved from DB:', minLength);
    return minLength;
  } catch (error) {
    console.error('[Password Min Length] Error:', error.message, 'using default 8');
    return 8;
  }
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database fresh (include lastLogin for session check)
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      req.user = user;

      // Check session timeout
      const sessionTimeout = await getSessionTimeout();

      // Use lastLogin or createdAt if lastLogin is not set
      const lastLogin = user.lastLogin || user.createdAt;
      const lastLoginDate = new Date(lastLogin);
      const now = new Date();
      const sessionAgeInMinutes = (now - lastLoginDate) / (1000 * 60);

      // Debug logging
      console.log(`[Session Check] User: ${user.email}`);
      console.log(`  - Timeout setting: ${sessionTimeout} minutes`);
      console.log(`  - Last login: ${lastLoginDate.toISOString()}`);
      console.log(`  - Current time: ${now.toISOString()}`);
      console.log(`  - Session age: ${sessionAgeInMinutes.toFixed(2)} minutes`);
      console.log(`  - Session expired: ${sessionAgeInMinutes > sessionTimeout}`);

      if (sessionAgeInMinutes > sessionTimeout) {
        console.log(`[Session Expired] User: ${user.email}, Session age (${sessionAgeInMinutes.toFixed(2)}min) > timeout (${sessionTimeout}min)`);
        return res.status(401).json({
          success: false,
          error: `Session expired. Your session was inactive for more than ${sessionTimeout} minutes. Please login again.`,
          sessionExpired: true
        });
      }

      next();
    } catch (error) {
      console.error(error);

      // Check if it's a token expiration error
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          tokenExpired: true
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Not authorized'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Role ${req.user.role} is not authorized to access this route` 
      });
    }
    next();
  };
};

// Check if user account is active
const checkActive = async (req, res, next) => {
  if (req.user && req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Your account is not active. Please contact administrator.'
    });
  }
  next();
};

module.exports = { protect, authorize, checkActive, getPasswordMinLength };

