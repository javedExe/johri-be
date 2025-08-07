import { Router } from 'express';
import { validate, schemas } from '../utils/validation.js';
import {
  initiateForgotPassword,
  verifyOtp,
  resetPassword
} from '../controllers/passwordResetController.js';

const router = Router();

// Initiate password reset
router.post('/initiate',
  validate(schemas.forgotPassword),
  initiateForgotPassword
);

// Verify OTP
router.post('/verify-otp',
  validate(schemas.verifyOtp),
  verifyOtp
);

// Reset password
router.post('/reset',
  validate(schemas.resetPassword),
  resetPassword
);

export default router;
