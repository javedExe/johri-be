import { pool } from '../config/database.js';

const row = r => r.rows[0];
const rows = r => r.rows;

export default {
  create: async (productData, userId, userType) => {
    const { name, description, price, status, images } = productData;
    const ownerId = userType === 'owner' ? userId : null;
    const jewelerId = userType === 'jeweler' ? userId : null;
    
    const result = await pool.query(
      'INSERT INTO products (owner_id, jeweler_id, name, description, price, status, images) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [ownerId, jewelerId, name, description, price, status, JSON.stringify(images || [])]
    );
    return row(result);
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return row(result);
  },

  findAllForUser: async (userId, userType) => {
    const userColumn = userType === 'owner' ? 'owner_id' : 'jeweler_id';
    const result = await pool.query(`SELECT * FROM products WHERE ${userColumn} = $1 ORDER BY created_at DESC`, [userId]);
    return rows(result);
  },

  update: async (id, updateData) => {
    const { name, price, description, status, images } = updateData;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (price !== undefined) { fields.push(`price = $${paramIndex++}`); values.push(price); }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description); }
    if (status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(status); }
    if (images !== undefined) { fields.push(`images = $${paramIndex++}`); values.push(JSON.stringify(images)); }
    
    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    return row(result);
  },

  delete: async (id) => {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return row(result);
  },
  
  logAction: async (productId, userId, userType, action, changes, req = null) => {
    try {
      const ipAddress = req?.ip || null;
      const userAgent = req?.get('User-Agent') || null;
      await pool.query(
        `INSERT INTO product_audit_logs (product_id, user_id, user_type, action, changes, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [productId, userId, userType, action, JSON.stringify(changes), ipAddress, userAgent]
      );
    } catch (error) {
      console.error('Product audit logging failed:', error);
    }
  }
};