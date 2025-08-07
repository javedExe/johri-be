import { Router } from 'express';
import { ensureAuthenticated, ensureNotLocked } from '../config/passport.js';
import roleAuth from '../middlewares/roleAuth.js';
import { validate, validateOptional, schemas } from '../utils/validation.js';
import * as categoryController from '../controllers/categoryController.js';

const router = Router();

// Middleware to ensure only Super Admin (Owner) can access
const requireSuperAdmin = [
  ensureAuthenticated,
  ensureNotLocked,
  roleAuth('Owner')
];

/* ──────────────────────────────────────────────────────
   CATEGORY CRUD ROUTES
   ────────────────────────────────────────────────────── */

// Create new category
router.post('/',
  ...requireSuperAdmin,
  validate(schemas.createCategory),
  categoryController.createCategory
);

// Get all categories
router.get('/',
  ...requireSuperAdmin,
  validateOptional(schemas.categoryFilters),
  categoryController.getCategories
);

// Get category by ID
router.get('/:id',
  ...requireSuperAdmin,
  categoryController.getCategoryById
);

// Update category
router.put('/:id',
  ...requireSuperAdmin,
  validate(schemas.updateCategory),
  categoryController.updateCategory
);

// Delete category (soft delete by default)
router.delete('/:id',
  ...requireSuperAdmin,
  validateOptional(schemas.deleteCategory),
  categoryController.deleteCategory
);

// Toggle category status (activate/deactivate)
router.patch('/:id/status',
  ...requireSuperAdmin,
  categoryController.toggleCategoryStatus
);

/* ──────────────────────────────────────────────────────
   JEWELRY TYPES & UTILITY ROUTES
   ────────────────────────────────────────────────────── */

// Get all jewelry types (for multi-select dropdown)
router.get('/jewelry-types/list',
  ...requireSuperAdmin,
  categoryController.getJewelryTypes
);

// Get audit logs for all categories or specific category
router.get('/audit-logs/:id?',
  ...requireSuperAdmin,
  validateOptional(schemas.categoryFilters),
  categoryController.getCategoryAuditLogs
);

export default router;
