-- Create roles table
CREATE TABLE IF NOT EXISTS roles(
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Insert default roles
INSERT INTO roles (name) VALUES ('Owner'), ('Admin'), ('Viewer')
ON CONFLICT (name) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users(
  id                  SERIAL PRIMARY KEY,
  username            TEXT UNIQUE,
  email               TEXT UNIQUE,
  phone_number        TEXT UNIQUE,
  backup_phone_number TEXT,
  google_id           TEXT UNIQUE,
  password_hash       TEXT,
  role_id             INT REFERENCES roles(id) DEFAULT 3,
  created_at          TIMESTAMP DEFAULT NOW()
);
