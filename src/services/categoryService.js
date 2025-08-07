import CategoryModel from '../models/Category.js';
import JewelryTypeModel from '../models/JewelryType.js';
import { pool } from '../config/database.js';

// Audit logging function
const logCategoryAction = async (categoryId, adminId, action, changes, req = null) => {
  try {
    const ipAddress = req?.ip || null;
    const userAgent = req?.get('User-Agent') || null;
    
    await pool.query(
      `INSERT INTO category_audit_logs (category_id, admin_id, action, changes, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [categoryId, adminId, action, JSON.stringify(changes), ipAddress, userAgent]
    );
    
    console.log(`Category audit: ${action} for category ${categoryId} by admin ${adminId}`);
  } catch (error) {
    console.error('Category audit logging failed:', error);
  }
};

export default {
  // Get all categories
  getAllCategories: async (includeInactive = false) => {
    return await CategoryModel.findAll(includeInactive);
  },

  // Get category by ID
  getCategoryById: async (id) => {
    const category = await CategoryModel.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  },

  // Create new category
  createCategory: async (categoryData, adminId, req = null) => {
    const { name, description, jewelry_types } = categoryData;
    
    // Check if category name already exists
    const existingCategory = await CategoryModel.findByName(name);
    if (existingCategory) {
      throw new Error('A category with this name already exists.');
    }
    
    // Validate jewelry types
    if (jewelry_types && jewelry_types.length > 0) {
      const validTypes = await JewelryTypeModel.validateIds(jewelry_types);
      if (validTypes.length !== jewelry_types.length) {
        throw new Error('One or more selected jewelry types are invalid.');
      }
    }
    
    // Create category
    const category = await CategoryModel.create(categoryData);
    
    // Log the action
    await logCategoryAction(category.id, adminId, 'create', {
      name,
      description,
      jewelry_types
    }, req);
    
    return category;
  },

  // Update category
  updateCategory: async (id, updateData, adminId, req = null) => {
    const { name, description, jewelry_types } = updateData;
    
    // Get existing category for comparison
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }
    
    // Check if new name conflicts with existing category
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await CategoryModel.findByName(name, id);
      if (duplicateCategory) {
        throw new Error('A category with this name already exists.');
      }
    }
    
    // Validate jewelry types if provided
    if (jewelry_types && jewelry_types.length > 0) {
      const validTypes = await JewelryTypeModel.validateIds(jewelry_types);
      if (validTypes.length !== jewelry_types.length) {
        throw new Error('One or more selected jewelry types are invalid.');
      }
    }
    
    // Check if any changes were made
    const changes = {};
    if (name !== undefined && name !== existingCategory.name) changes.name = { from: existingCategory.name, to: name };
    if (description !== undefined && description !== existingCategory.description) changes.description = { from: existingCategory.description, to: description };
    if (jewelry_types !== undefined) {
      const existingTypeIds = existingCategory.jewelry_types.map(jt => jt.id).sort();
      const newTypeIds = jewelry_types.sort();
      if (JSON.stringify(existingTypeIds) !== JSON.stringify(newTypeIds)) {
        changes.jewelry_types = { from: existingTypeIds, to: newTypeIds };
      }
    }
    
    if (Object.keys(changes).length === 0) {
      throw new Error('No updates detected. Please modify at least one field.');
    }
    
    // Update category
    const updatedCategory = await CategoryModel.update(id, updateData);
    
    // Log the action
    await logCategoryAction(id, adminId, 'update', changes, req);
    
    return updatedCategory;
  },

  // Delete category
  deleteCategory: async (id, adminId, permanent = false, req = null) => {
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }
    
    let result;
    let action;
    
    if (permanent) {
      result = await CategoryModel.permanentDelete(id);
      action = 'permanent_delete';
    } else {
      result = await CategoryModel.delete(id);
      action = 'soft_delete';
    }
    
    // Log the action
    await logCategoryAction(id, adminId, action, {
      deleted_category: existingCategory
    }, req);
    
    return result;
  },

  // Toggle category status
  toggleCategoryStatus: async (id, adminId, req = null) => {
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }
    
    const updatedCategory = await CategoryModel.toggleStatus(id);
    const action = updatedCategory.status ? 'activate' : 'deactivate';
    
    // Log the action
    await logCategoryAction(id, adminId, action, {
      status: { from: existingCategory.status, to: updatedCategory.status }
    }, req);
    
    return updatedCategory;
  },

  // Get all jewelry types
  getJewelryTypes: async () => {
    return await JewelryTypeModel.findAll();
  },

  // Get category audit logs
  getCategoryAuditLogs: async (categoryId = null, limit = 50, offset = 0) => {
    let query = `
      SELECT 
        cal.*,
        c.name as category_name,
        u.username as admin_username
      FROM category_audit_logs cal
      LEFT JOIN categories c ON cal.category_id = c.id
      LEFT JOIN users u ON cal.admin_id = u.id
    `;
    
    const params = [];
    if (categoryId) {
      query += ' WHERE cal.category_id = $1';
      params.push(categoryId);
    }
    
    query += ' ORDER BY cal.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
  }
};
