import { pool } from '../config/database.js';

const rows = r => r.rows;

export default {
  // Get all active jewelry types
  findAll: async () => {
    const result = await pool.query(
      'SELECT id, name FROM jewelry_types WHERE status = true ORDER BY name ASC'
    );
    return rows(result);
  },

  // Get jewelry type by ID
  findById: async (id) => {
    const result = await pool.query('SELECT * FROM jewelry_types WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Validate jewelry type IDs exist and are active
  validateIds: async (ids) => {
    if (!ids || ids.length === 0) return [];
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const result = await pool.query(
      `SELECT id FROM jewelry_types WHERE id IN (${placeholders}) AND status = true`,
      ids
    );
    return result.rows.map(row => row.id);
  }
};
