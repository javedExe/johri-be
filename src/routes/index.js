import { Router } from 'express';
import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import apiRoutes from './api.js';
import passwordResetRoutes from './passwordReset.js';
import categoryRoutes from './categories.js';
import packageRoutes from './packages.js';
import otpLoginRoutes from './otpLogin.js';
import productRoutes from './products.js'; // NEW: Import product routes

const router = Router();

// Existing Routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/api', apiRoutes);
router.use('/forgot-password', passwordResetRoutes);
router.use('/categories', categoryRoutes);

// New Routes
router.use('/admin/packages', packageRoutes);
router.use('/login/otp', otpLoginRoutes);
router.use('/products', productRoutes); // NEW: Use the product routes

router.get('/', (_req, res) => res.json({
  status: 'OK',
  version: '1.0.0',
  endpoints: [
    '/auth',
    '/dashboard',
    '/api',
    '/forgot-password',
    '/categories',
    '/admin/packages',
    '/login/otp',
    '/products' // NEW: Add the endpoint to the list
  ]
}));

export default router;