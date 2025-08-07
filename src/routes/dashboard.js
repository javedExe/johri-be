import { Router } from 'express';
import { ensureAuthenticated, ensureNotLocked } from '../config/passport.js';
import roleAuth from '../middlewares/roleAuth.js';
import { validate, schemas } from '../utils/validation.js';
import { 
  adminHome,
  getDashboardStats,
  getUserManagement,
  getAuditLogs,
  getSystemHealth,
  updateUserRole,
  lockUnlockUser
} from '../controllers/dashboardController.js';

const router = Router();

/* ──────────────────────────────────────────────────────
   DASHBOARD ACCESS CONTROL MIDDLEWARE
   ────────────────────────────────────────────────────── */

// Combined middleware for Super Admin dashboard access
const requireSuperAdmin = [
  ensureAuthenticated,     // Must be logged in
  ensureNotLocked,         // Account must not be locked
  roleAuth('Owner')        // Must have Owner role
];

/* ──────────────────────────────────────────────────────
   MAIN DASHBOARD ROUTES
   ────────────────────────────────────────────────────── */

// Main dashboard home page
router.get('/', 
  ...requireSuperAdmin,
  adminHome
);

// Dashboard statistics and overview
router.get('/stats',
  ...requireSuperAdmin,
  getDashboardStats
);

// System health monitoring
router.get('/health',
  ...requireSuperAdmin,
  getSystemHealth
);

/* ──────────────────────────────────────────────────────
   USER MANAGEMENT ROUTES
   ────────────────────────────────────────────────────── */

// Get all users for management
router.get('/users',
  ...requireSuperAdmin,
  getUserManagement
);

// Update user role
router.patch('/users/:userId/role',
  ...requireSuperAdmin,
  validate(schemas.updateUserRole),
  updateUserRole
);

// Lock/unlock user account
router.patch('/users/:userId/lock-status',
  ...requireSuperAdmin,
  validate(schemas.lockUnlockUser),
  lockUnlockUser
);

/* ──────────────────────────────────────────────────────
   AUDIT & SECURITY ROUTES
   ────────────────────────────────────────────────────── */

// View audit logs (password resets, login attempts, etc.)
router.get('/audit-logs',
  ...requireSuperAdmin,
  getAuditLogs
);

// View password reset attempts
router.get('/password-reset-logs',
  ...requireSuperAdmin,
  (req, res) => getAuditLogs(req, res, { eventType: 'password_reset' })
);

// View failed login attempts
router.get('/failed-logins',
  ...requireSuperAdmin,
  (req, res) => getAuditLogs(req, res, { eventType: 'login_failed' })
);

/* ──────────────────────────────────────────────────────
   DASHBOARD API ERROR HANDLING
   ────────────────────────────────────────────────────── */

// Handle 404 for dashboard routes
router.use('*', (req, res) => {
  res.status(404).json({
    message: 'Dashboard endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /stats', 
      'GET /health',
      'GET /users',
      'PATCH /users/:userId/role',
      'PATCH /users/:userId/lock-status',
      'GET /audit-logs',
      'GET /password-reset-logs',
      'GET /failed-logins'
    ]
  });
});

export default router;
