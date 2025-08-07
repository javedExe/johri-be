import { Router } from 'express';
import { ensureAuthenticated } from '../config/passport.js';
import upload from '../middlewares/upload.js';
import * as productController from '../controllers/productController.js';
import { validate } from '../utils/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

// Middleware to ensure only authenticated users can access
const requireLogin = [ensureAuthenticated];

// POST /products - Create a new product (handles file uploads)
// --- THIS LINE IS CHANGED ---
router.post('/', ...requireLogin, upload.any(), productController.createProduct);

// GET /products - Get all products for the logged-in user
router.get('/', ...requireLogin, productController.getMyProducts);

// PUT /products/:id - Update an existing product
router.put('/:id', ...requireLogin, validate(schemas.updateProduct), productController.updateProduct);

// DELETE /products/:id - Delete a product
router.delete('/:id', ...requireLogin, productController.deleteProduct);

export default router;