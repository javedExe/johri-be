-- Table to store OTPs for password reset
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to log password reset events
CREATE TABLE IF NOT EXISTS password_reset_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'otp_sent', 'otp_verified', 'reset_success', 'lockout'
  event_time TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB
);

-- Add lockout columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lockout_expires_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user_id ON password_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked);
