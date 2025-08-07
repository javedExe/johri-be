import { pool } from '../config/database.js';
const row = r => r.rows[0];

export default {
  findById: async (id) => row(await pool.query('SELECT * FROM end_users WHERE id=$1', [id])),

  findByPhoneNumber: async (phone) => row(await pool.query('SELECT * FROM end_users WHERE phone_number=$1', [phone])),
  
  create: async ({ phone_number }) => row(
    await pool.query(
      'INSERT INTO end_users (phone_number) VALUES ($1) RETURNING *',
      [phone_number]
    )
  )
};
