import { pool } from '../config/database.js';
const row = r => r.rows[0];

export default {
  findById: async (id) => row(await pool.query('SELECT * FROM jewelers WHERE id=$1', [id])),

  findByPhoneNumber: async (phone) => row(await pool.query('SELECT * FROM jewelers WHERE phone_number=$1', [phone])),

  findByUsername: async (username) => row(await pool.query('SELECT * FROM jewelers WHERE username=$1', [username])),
  
  create: async ({ username, phone_number, password_hash }) => row(
    await pool.query(
      'INSERT INTO jewelers (username, phone_number, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [username, phone_number, password_hash]
    )
  )
};
