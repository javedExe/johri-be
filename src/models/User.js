import { pool } from '../config/database.js';

const row = r => r.rows[0];

export default {
  findById: async id =>
    row(await pool.query('SELECT * FROM users WHERE id=$1', [id])),

  findByUsername: async username =>
    row(await pool.query('SELECT * FROM users WHERE username=$1', [username])),

  findByEmail: async email =>
    row(await pool.query('SELECT * FROM users WHERE email=$1', [email])),

  findByPhoneNumber: async phoneNumber =>
    row(await pool.query('SELECT * FROM users WHERE phone_number=$1', [phoneNumber])),

  findByGoogleId: async gid =>
    row(await pool.query('SELECT * FROM users WHERE google_id=$1', [gid])),

  // Enhanced Google user creation
  createGoogleUser: async (gid, email, profileData = {}) =>
    row(await pool.query(
      `INSERT INTO users (google_id, email, role_id, display_name, profile_picture)
       VALUES ($1, $2, 1, $3, $4) RETURNING *`,
      [gid, email, profileData.display_name, profileData.profile_picture]
    )),

  updateGoogleId: async (id, gid) =>
    row(await pool.query('UPDATE users SET google_id=$1 WHERE id=$2 RETURNING *', [gid, id])),

  createUser: async ({ username, email, password_hash, role_id, phone_number, backup_phone_number }) =>
    row(await pool.query(
      `INSERT INTO users (username, email, password_hash, role_id, phone_number, backup_phone_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [username, email, password_hash, role_id, phone_number, backup_phone_number]
    ))
};