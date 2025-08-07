import bcrypt from 'bcrypt';
import userService from '../services/userService.js';
import { sendOtpEmail, sendResetConfirmationEmail } from '../services/emailService.js';
import { sendOtpSms, sendResetConfirmationSms } from '../services/smsService.js';
import { logPasswordResetEvent, AUDIT_EVENTS } from '../services/auditService.js';
import {
  generateOTP,
  validatePasswordStrength,
  isOTPExpired,
  isAccountLocked,
  getLockoutExpiryTime,
  getOTPExpiryTime,
  PASSWORD_RESET
} from '../utils/security.js';
import { pool } from '../config/database.js';


// Helper to get role name from ID
const getRoleName = async (roleId) => {
    const result = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    return result.rows[0]?.name;
};

// Helper to check if a string is an email
const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);


export const initiateForgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;
    let user;
    const isEmailIdentifier = isEmail(identifier);

    if (isEmailIdentifier) {
        user = await userService.findByEmail(identifier);
        const roleName = user ? await getRoleName(user.role_id) : null;
        if (!user || roleName !== 'Owner') {
            return res.status(404).json({ message: 'No Super Admin account found with the provided email.' });
        }
    } else {
        user = await userService.findByPhoneNumber(identifier);
        const roleName = user ? await getRoleName(user.role_id) : null;
        if (!user || roleName === 'Owner') {
            return res.status(404).json({ message: 'No Jeweler account found with the provided mobile number.' });
        }
    }

    if (isAccountLocked(user)) {
      return res.status(423).json({ message: 'Your account is temporarily locked due to multiple failed attempts.' });
    }

    const otp = generateOTP();
    const expiresAt = getOTPExpiryTime();
    await userService.deletePasswordResetOtps(user.id);
    await userService.createPasswordResetOtp(user.id, otp, expiresAt);
    await logPasswordResetEvent(user.id, AUDIT_EVENTS.OTP_SENT, req);

    if (isEmailIdentifier) {
        await sendOtpEmail(user.email, otp, user.username);
        res.json({ message: 'OTP has been sent to your registered email address.' });
    } else {
        await sendOtpSms(user.phone_number, otp, user.username);
        res.json({ message: 'OTP has been sent to your registered mobile number.' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOtp = async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        let user;

        if (isEmail(identifier)) {
            user = await userService.findByEmail(identifier);
        } else {
            user = await userService.findByPhoneNumber(identifier);
        }

        if (!user) {
            return res.status(404).json({ message: 'No account found with the provided contact.' });
        }

        if (isAccountLocked(user)) {
            return res.status(423).json({ message: 'Your account is temporarily locked due to multiple failures.' });
        }

        const otpRecord = await userService.getLatestPasswordResetOtp(user.id);
        if (!otpRecord || isOTPExpired(otpRecord.expires_at)) {
            return res.status(400).json({ message: 'The OTP has expired. Please request a new one.' });
        }

        if (otpRecord.otp !== otp) {
            await userService.incrementOtpAttempts(otpRecord.id);
            const remainingAttempts = PASSWORD_RESET.MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);

            if (remainingAttempts <= 0) {
                const lockoutExpiry = getLockoutExpiryTime();
                await userService.lockUserAccount(user.id, lockoutExpiry);
                await logPasswordResetEvent(user.id, AUDIT_EVENTS.ACCOUNT_LOCKED, req, { reason: 'Max OTP attempts exceeded' });
                return res.status(423).json({ message: 'Too many failed attempts. Your account is temporarily locked.' });
            }
            
            await logPasswordResetEvent(user.id, AUDIT_EVENTS.OTP_FAILED, req, { reason: 'Incorrect OTP', remainingAttempts });
            return res.status(400).json({ message: `Incorrect OTP. You have ${remainingAttempts} attempts left.` });
        }

        await logPasswordResetEvent(user.id, AUDIT_EVENTS.OTP_VERIFIED, req);
        res.json({
            message: 'OTP verified successfully. You can now reset your password.',
            token: `otp_verified_${user.id}_${Date.now()}`
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword = async (req, res) => {
  try {
    const { identifier, newPassword, token } = req.body;
    let user;

    if (!token || !token.startsWith('otp_verified_')) {
      return res.status(401).json({ message: 'Invalid or expired verification token.' });
    }

    if (isEmail(identifier)) {
        user = await userService.findByEmail(identifier);
    } else {
        user = await userService.findByPhoneNumber(identifier);
    }

    if (!user) {
        return res.status(404).json({ message: 'No account found with the provided contact.' });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
        errors: passwordValidation.errors
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userService.updatePassword(user.id, hashedPassword);
    await userService.deletePasswordResetOtps(user.id);
    await userService.unlockUserAccount(user.id);
    await logPasswordResetEvent(user.id, AUDIT_EVENTS.RESET_SUCCESS, req);

    if (isEmail(identifier)) {
        await sendResetConfirmationEmail(user.email, user.username);
    } else {
        await sendResetConfirmationSms(user.phone_number, user.username);
    }

    res.json({ message: 'Your password has been successfully reset.' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};