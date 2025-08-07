import crypto from 'crypto';

// Security constants
export const PASSWORD_RESET = {
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
  MAX_OTP_ATTEMPTS: parseInt(process.env.MAX_OTP_ATTEMPTS) || 5,
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15
};

// Generate secure 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Validate password strength
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Check if OTP is expired
export const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

// Check if account is locked
export const isAccountLocked = (user) => {
  if (!user.is_locked) return false;
  
  if (user.lockout_expires_at && new Date() > new Date(user.lockout_expires_at)) {
    return false; // Lockout has expired
  }
  
  return true;
};

// Calculate lockout expiry time
export const getLockoutExpiryTime = () => {
  const now = new Date();
  return new Date(now.getTime() + PASSWORD_RESET.LOCKOUT_DURATION_MINUTES * 60000);
};

// Calculate OTP expiry time
export const getOTPExpiryTime = () => {
  const now = new Date();
  return new Date(now.getTime() + PASSWORD_RESET.OTP_EXPIRY_MINUTES * 60000);
};
