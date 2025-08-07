import { Router } from 'express';
import { ensureAuthenticated } from '../config/passport.js';
import { me } from '../controllers/userController.js';

const router = Router();
router.get('/me', ensureAuthenticated, me);
export default router;
