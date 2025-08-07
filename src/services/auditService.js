import { pool } from '../config/database.js';

export const logPasswordResetEvent = async (userId, eventType, req, details = null) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    await pool.query(
      `INSERT INTO password_reset_logs (user_id, event_type, ip_address, user_agent, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventType, ipAddress, userAgent, details]
    );
    
    console.log(`Audit log: ${eventType} for user ${userId}`);
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

export const AUDIT_EVENTS = {
  OTP_SENT: 'otp_sent',
  OTP_VERIFIED: 'otp_verified',
  OTP_FAILED: 'otp_failed',
  RESET_SUCCESS: 'reset_success',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked'
};
