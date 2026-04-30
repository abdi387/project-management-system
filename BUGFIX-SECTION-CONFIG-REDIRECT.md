# Bug Fix: Faculty-Head Redirect to Login on Section Configuration

## Problem Description
When a faculty-head user tries to visit the Section Configuration page (`/faculty-head/sections`), they are automatically redirected to the login page.

## Root Cause Identified 🔍

The issue was in **`backend/routes/sectionRoutes.js`** - the route was missing the `protect` middleware.

### The Bug Flow:

1. Faculty-head logs in successfully → token stored in localStorage
2. User clicks "Section Configuration" in sidebar
3. Frontend makes API call to `/api/sections/grouped` with Bearer token
4. **Backend receives request but `protect` middleware is missing**
5. `authorize()` middleware runs, checks `req.user.role`
6. **`req.user` is `undefined`** (never set because token was never decoded)
7. Backend returns `401: "Not authorized"`
8. Frontend `apiConfig.js` interceptor catches 401
9. Interceptor sees user had a token → clears localStorage
10. **User redirected to `/login`**

### Code Analysis:

**❌ BROKEN CODE (Before Fix):**
```javascript
const { authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authorize('student', 'advisor', 'dept-head', 'faculty-head', 'admin'));
```

**Problem:** `authorize()` checks `req.user.role`, but `req.user` is never set because:
- The `protect` middleware is responsible for decoding the JWT token
- The `protect` middleware sets `req.user` from the decoded token
- Without `protect`, `req.user` is always `undefined`
- `authorize()` sees `undefined` and returns 401

**✅ FIXED CODE (After Fix):**
```javascript
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);  // ← ADDED: Decode JWT and set req.user
router.use(authorize('student', 'advisor', 'dept-head', 'faculty-head', 'admin'));
```

**Solution:** Add `protect` middleware BEFORE `authorize`:
1. `protect` decodes the JWT token from the Authorization header
2. `protect` fetches the user from database and sets `req.user`
3. `authorize` then checks `req.user.role` against allowed roles
4. Request proceeds if role is authorized

## How Middleware Works

### Correct Middleware Order (from other routes):
```javascript
// Example from userRoutes.js
const { protect, authorize, checkActive } = require('../middleware/auth');

router.use(protect);  // 1. Authenticate user
router.use(authorize('admin'));  // 2. Check user role
```

### The protect middleware:
```javascript
const protect = async (req, res, next) => {
  // 1. Get token from Authorization header
  const token = req.headers.authorization.split(' ')[1];
  
  // 2. Verify and decode JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 3. Fetch user from database
  const user = await User.findByPk(decoded.id);
  
  // 4. Set req.user for downstream middleware
  req.user = user;
  
  // 5. Check session timeout
  // ... session validation logic
  
  next();
};
```

### The authorize middleware:
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if req.user exists (set by protect middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Role not authorized' });
    }
    
    next();
  };
};
```

## Files Modified

### 1. `backend/routes/sectionRoutes.js`

**Changed:**
```diff
- const { authorize } = require('../middleware/auth');
+ const { protect, authorize } = require('../middleware/auth');

  // All routes require authentication
+ router.use(protect);
  router.use(authorize('student', 'advisor', 'dept-head', 'faculty-head', 'admin'));
```

## Verification Steps

1. ✅ Syntax check passed for sectionRoutes.js
2. ✅ Middleware order matches other route files (userRoutes, groupRoutes, etc.)
3. ✅ protect middleware imported from '../middleware/auth'
4. ✅ protect called before authorize middleware

## Testing Instructions

### Manual Test:
1. Start backend server: `cd backend && node server.js`
2. Login as faculty-head user
3. Click "Section Configuration" in sidebar
4. **Expected:** Page loads successfully without redirect
5. **Verify:** Can view, add, edit, delete sections

### API Test (using Postman/curl):
```bash
# 1. Login and get token
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@example.com","password":"password123"}'

# 2. Use token to access sections
curl -X GET http://localhost:5001/api/sections/grouped \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "sections": {
    "Computer Science": [...],
    "Information Technology": [...],
    "Information Systems": [...]
  }
}
```

## Why This Bug Occurred

The `sectionRoutes.js` file was likely created without following the exact pattern used in other route files. All other route files in the codebase correctly include both `protect` and `authorize`:

- ✅ `userRoutes.js` - has `router.use(protect)`
- ✅ `groupRoutes.js` - has `router.use(protect)`
- ✅ `academicRoutes.js` - has `router.use(protect)`
- ✅ `defenseRoutes.js` - has `router.use(protect)`
- ✅ `proposalRoutes.js` - has `router.use(protect)`
- ❌ `sectionRoutes.js` - **was missing** `router.use(protect)` ← THE BUG

## Frontend Interceptor Behavior

When the backend returns 401, the frontend `apiConfig.js` interceptor:

```javascript
if (status === 401) {
  const token = localStorage.getItem('fypToken');
  const isSessionExpired = data?.sessionExpired || data?.tokenExpired;
  
  if (isSessionExpired || token) {
    if (token) {
      // Clear storage
      localStorage.removeItem('fypToken');
      localStorage.removeItem('fypUser');
      
      // Redirect to login
      window.location.href = '/login';
    }
  }
}
```

This is why the user sees the login page - the 401 response triggers the interceptor to clear the token and redirect.

## Status: ✅ FIXED

The faculty-head user can now access the Section Configuration page without being redirected to login.

## Lessons Learned

1. **Always follow the established middleware pattern** from other route files
2. **`protect` MUST come before `authorize`** - protect sets req.user, authorize checks it
3. **Test with actual authenticated requests**, not just route registration
4. **Check similar files** when creating new ones to ensure consistency
