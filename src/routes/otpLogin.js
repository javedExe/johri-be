import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { schemas } from '../utils/validation.js';
import * as otpLoginController from '../controllers/otpLoginController.js';

const router = Router();

// Route to send the OTP to the user's mobile
router.post('/send', validate(schemas.sendLoginOtp), otpLoginController.sendLoginOtp);

// Route to verify the OTP and log the user in
router.post('/verify', validate(schemas.verifyLoginOtp), otpLoginController.verifyOtpAndLogin);

export default router;