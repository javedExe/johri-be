import { pool } from '../config/database.js';

const row = r => r.rows[0];
const rows = r => r.rows;

export default {
  // Get all categories with associated jewelry types
  findAll: async (includeInactive = false) => {
    const statusFilter = includeInactive ? '' : 'WHERE c.status = true';
    const result = await pool.query(`
      SELECT 
        c.id, c.name, c.description, c.status, c.created_at, c.updated_at,
        COALESCE(
          JSON_AGG(
            CASE WHEN jt.id IS NOT NULL 
            THEN JSON_BUILD_OBJECT('id', jt.id, 'name', jt.name)
            ELSE NULL END
          ) FILTER (WHERE jt.id IS NOT NULL), 
          '[]'
        ) as jewelry_types
      FROM categories c
      LEFT JOIN category_jewelry_type cjt ON c.id = cjt.category_id
      LEFT JOIN jewelry_types jt ON cjt.jewelry_type_id = jt.id AND jt.status = true
      ${statusFilter}
      GROUP BY c.id, c.name, c.description, c.status, c.created_at, c.updated_at
      ORDER BY c.name ASC
    `);
    return rows(result);
  },

  // Find category by ID with jewelry types
  findById: async (id) => {
    const result = await pool.query(`
      SELECT 
        c.id, c.name, c.description, c.status, c.created_at, c.updated_at,
        COALESCE(
          JSON_AGG(
            CASE WHEN jt.id IS NOT NULL 
            THEN JSON_BUILD_OBJECT('id', jt.id, 'name', jt.name)
            ELSE NULL END
          ) FILTER (WHERE jt.id IS NOT NULL), 
          '[]'
        ) as jewelry_types
      FROM categories c
      LEFT JOIN category_jewelry_type cjt ON c.id = cjt.category_id
      LEFT JOIN jewelry_types jt ON cjt.jewelry_type_id = jt.id AND jt.status = true
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.description, c.status, c.created_at, c.updated_at
    `, [id]);
    return row(result);
  },

  // Find category by name (for uniqueness check)
  findByName: async (name, excludeId = null) => {
    let query = 'SELECT * FROM categories WHERE LOWER(name) = LOWER($1)';
    let params = [name];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return row(result);
  },

  // Create new category
  create: async (categoryData) => {
    const { name, description, jewelry_types } = categoryData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create category
      const categoryResult = await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );
      const category = categoryResult.rows[0];
      
      // Associate jewelry types
      if (jewelry_types && jewelry_types.length > 0) {
        const values = jewelry_types.map((typeId, index) => 
          `($1, $${index + 2})`).join(', ');
        const typeParams = [category.id, ...jewelry_types];
        
        await client.query(
          `INSERT INTO category_jewelry_type (category_id, jewelry_type_id) VALUES ${values}`,
          typeParams
        );
      }
      
      await client.query('COMMIT');
      return category;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update category
  update: async (id, updateData) => {
    const { name, description, jewelry_types } = updateData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update category basic info
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      
      const categoryResult = await client.query(
        `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );
      
      // Update jewelry type associations if provided
      if (jewelry_types !== undefined) {
        // Remove existing associations
        await client.query('DELETE FROM category_jewelry_type WHERE category_id = $1', [id]);
        
        // Add new associations
        if (jewelry_types.length > 0) {
          const values = jewelry_types.map((typeId, index) => 
            `($1, $${index + 2})`).join(', ');
          const typeParams = [id, ...jewelry_types];
          
          await client.query(
            `INSERT INTO category_jewelry_type (category_id, jewelry_type_id) VALUES ${values}`,
            typeParams
          );
        }
      }
      
      await client.query('COMMIT');
      return categoryResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Delete category (soft delete by setting status to false)
  delete: async (id) => {
    const result = await pool.query(
      'UPDATE categories SET status = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return row(result);
  },

  // Permanently delete category
  permanentDelete: async (id) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete associations first (CASCADE should handle this, but being explicit)
      await client.query('DELETE FROM category_jewelry_type WHERE category_id = $1', [id]);
      
      // Delete category
      const result = await client.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
      
      await client.query('COMMIT');
      return row(result);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Toggle category status
  toggleStatus: async (id) => {
    const result = await pool.query(
      'UPDATE categories SET status = NOT status, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return row(result);
  }
};
