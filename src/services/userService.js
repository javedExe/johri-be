import bcrypt from 'bcrypt';
import UserModel from '../models/User.js';
import { pool } from '../config/database.js';

export default {
  findById: UserModel.findById,
  findByUsername: UserModel.findByUsername,
  findByEmail: UserModel.findByEmail,
  findByPhoneNumber: UserModel.findByPhoneNumber,

  findOrCreateByPhoneNumber: async (phoneNumber) => {
    // First, try to find the user by their phone number
    let user = await UserModel.findByPhoneNumber(phoneNumber);

    // If the user already exists, return their details
    if (user) {
      return user;
    }

    // If the user does not exist, create a new one
    // Get the ID for the default "Viewer" role
    const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'Viewer'");
    if (roleResult.rows.length === 0) {
        throw new Error("Default 'Viewer' role not found in database.");
    }
    const roleId = roleResult.rows[0].id;

    // Create the new user with minimal details
    const newUser = await UserModel.createUser({
        username: `user_${phoneNumber}`, // Generate a unique username
        phone_number: phoneNumber,
        role_id: roleId,
        email: null, // No email for this user type
        password_hash: null // No password for OTP-based login
    });

    return newUser;
  },

  upsertGoogle: async (googleId, email, profileData = {}) => {
    try {
      let user = await UserModel.findByGoogleId(googleId);
      if (user) return user;

      user = await UserModel.findByEmail(email);
      if (user) {
        return await UserModel.updateGoogleId(user.id, googleId);
      }

      return await UserModel.createGoogleUser(googleId, email, {
        display_name: profileData.name,
        profile_picture: profileData.picture
      });
    } catch (error) {
      console.error('Google upsert error:', error);
      throw error;
    }
  },

  createUser: async (userData) => {
    return UserModel.createUser(userData);
  },

  // Password Reset Methods (also used for login OTPs)
  createPasswordResetOtp: async (userId, otp, expiresAt) => {
    await pool.query(
      'INSERT INTO password_reset_otps (user_id, otp, expires_at) VALUES ($1, $2, $3)',
      [userId, otp, expiresAt]
    );
  },

  getLatestPasswordResetOtp: async (userId) => {
    const result = await pool.query(
      'SELECT * FROM password_reset_otps WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0];
  },

  incrementOtpAttempts: async (otpId) => {
    await pool.query(
      'UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id=$1',
      [otpId]
    );
  },

  deletePasswordResetOtps: async (userId) => {
    await pool.query('DELETE FROM password_reset_otps WHERE user_id=$1', [userId]);
  },

  lockUserAccount: async (userId, lockoutExpiresAt) => {
    await pool.query(
      'UPDATE users SET is_locked=true, lockout_expires_at=$1 WHERE id=$2',
      [lockoutExpiresAt, userId]
    );
  },

  unlockUserAccount: async (userId) => {
    await pool.query(
      'UPDATE users SET is_locked=false, lockout_expires_at=NULL WHERE id=$1',
      [userId]
    );
  },

  updatePassword: async (userId, hashedPassword) => {
    await pool.query(
      'UPDATE users SET password_hash=$1 WHERE id=$2',
      [hashedPassword, userId]
    );
  }
};