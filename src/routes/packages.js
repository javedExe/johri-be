import { Router } from 'express';
import { ensureAuthenticated } from '../config/passport.js';
import roleAuth from '../middlewares/roleAuth.js';
import { validate } from '../utils/validation.js';
import { schemas } from '../utils/validation.js';
import * as packageController from '../controllers/packageController.js';

const router = Router();

// Middleware to ensure only Super Admin (Owner) or Admin can access
const requireAdminAccess = [
  ensureAuthenticated,
  roleAuth(['Owner', 'Admin']) // Allows either role
];

// GET /admin/packages?type=Free|Paid
router.get('/', ...requireAdminAccess, packageController.getPackages);

// POST /admin/packages
router.post('/', ...requireAdminAccess, validate(schemas.createPackage), packageController.createPackage);

// PUT /admin/packages/:id
router.put('/:id', ...requireAdminAccess, validate(schemas.updatePackage), packageController.updatePackage);

// DELETE /admin/packages/:id
router.delete('/:id', ...requireAdminAccess, packageController.deletePackage);

// PATCH /admin/packages/:id/status
router.patch('/:id/status', ...requireAdminAccess, validate(schemas.updatePackageStatus), packageController.updatePackageStatus);

export default router;