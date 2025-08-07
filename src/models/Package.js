import { pool } from '../config/database.js';

const row = r => r.rows[0];
const rows = r => r.rows;

export default {
  findByName: async (name) => {
    const result = await pool.query('SELECT * FROM packages WHERE LOWER(name) = LOWER($1)', [name]);
    return row(result);
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM packages WHERE id = $1', [id]);
    return row(result);
  },

  findAllByType: async (type) => {
    const query = 'SELECT * FROM packages WHERE type = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [type]);
    return rows(result);
  },

  create: async (packageData) => {
    const { name, type, price, validityDays, features } = packageData;
    const result = await pool.query(
      'INSERT INTO packages (name, type, price, validity_days, features) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, price || 0, validityDays, JSON.stringify(features)]
    );
    return row(result);
  },

  update: async (id, updateData) => {
    const { name, price, validityDays, features } = updateData;
    
    // Dynamically build the update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (price !== undefined) { fields.push(`price = $${paramIndex++}`); values.push(price); }
    if (validityDays !== undefined) { fields.push(`validity_days = $${paramIndex++}`); values.push(validityDays); }
    if (features !== undefined) { fields.push(`features = $${paramIndex++}`); values.push(JSON.stringify(features)); }

    if (fields.length === 0) return null; // No fields to update

    values.push(id);
    const query = `UPDATE packages SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    return row(result);
  },

  updateStatus: async (id, status) => {
    const result = await pool.query(
      'UPDATE packages SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return row(result);
  },

  delete: async (id) => {
    const result = await pool.query('DELETE FROM packages WHERE id = $1 RETURNING *', [id]);
    return row(result);
  },

  logAction: async (packageId, adminId, action, changes, req = null) => {
    try {
      const ipAddress = req?.ip || null;
      const userAgent = req?.get('User-Agent') || null;
      await pool.query(
        `INSERT INTO package_audit_logs (package_id, admin_id, action, changes, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [packageId, adminId, action, JSON.stringify(changes), ipAddress, userAgent]
      );
    } catch (error) {
      console.error('Package audit logging failed:', error);
    }
  }
};