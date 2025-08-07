import { pool } from '../config/database.js';

export const getName = async id =>
  (await pool.query('SELECT name FROM roles WHERE id=$1', [id])).rows[0]?.name;
