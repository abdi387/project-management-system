# Password Min Length Fix Progress
Current: 6/7 ✅

## Steps:
1. ✅ Analyze files/validations (fixed 6-char everywhere, SystemSettings saves unused)
2. ✅ DB cleanup: DELETE duplicate keys, ensure single `password_min_length=8`
3. 🔄 Backend: Add `getPasswordMinLength()` util + dynamic express-validator authRoutes.js
4. ✅ Frontend UserManagement.jsx: Dynamic validation from settings
5. ✅ Frontend LandingPage.jsx: Dynamic validation from settings
6. 🔄 Update SystemSettings.jsx: Confirm/rename field → refetch
7. 🔄 Test: Set=10 → all registrations enforce → attempt_completion
