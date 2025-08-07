import { pool } from '../config/database.js';
const row = r => r.rows[0];

export default {
  findById: async (id) => row(await pool.query('SELECT * FROM owners WHERE id=$1', [id])),

  findByEmail: async (email) => row(await pool.query('SELECT * FROM owners WHERE email=$1', [email])),

  findByUsername: async (username) => row(await pool.query('SELECT * FROM owners WHERE username=$1', [username])),
  
  create: async ({ username, email, password_hash }) => row(
    await pool.query(
      'INSERT INTO owners (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [username, email, password_hash]
    )
  )
};
