import categoryService from '../services/categoryService.js';

export const createCategory = async (req, res) => {
  try {
    const { name, description, jewelry_types } = req.body;
    
    const category = await categoryService.createCategory(
      { name, description, jewelry_types },
      req.user.id,
      req
    );
    
    // Fetch the complete category with jewelry types
    const fullCategory = await categoryService.getCategoryById(category.id);
    
    res.status(201).json({
      message: 'Category created successfully',
      category: fullCategory
    });
    
  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    
    if (error.message.includes('invalid')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'An error occurred. Please try again later.',
      error: error.message 
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { include_inactive = 'false' } = req.query;
    const includeInactive = include_inactive === 'true';
    
    const categories = await categoryService.getAllCategories(includeInactive);
    
    res.json({
      categories,
      total: categories.length,
      filters: {
        include_inactive: includeInactive
      }
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      message: 'An error occurred while fetching categories.',
      error: error.message 
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    const category = await categoryService.getCategoryById(parseInt(id));
    
    res.json({ category });
    
  } catch (error) {
    console.error('Get category error:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'An error occurred while fetching the category.',
      error: error.message 
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, jewelry_types } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    const updatedCategory = await categoryService.updateCategory(
      parseInt(id),
      { name, description, jewelry_types },
      req.user.id,
      req
    );
    
    // Fetch the complete updated category
    const fullCategory = await categoryService.getCategoryById(parseInt(id));
    
    res.json({
      message: 'Category updated successfully',
      category: fullCategory
    });
    
  } catch (error) {
    console.error('Update category error:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message.includes('already exists') || error.message.includes('No updates detected')) {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.message.includes('invalid')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'An error occurred. Please try again later.',
      error: error.message 
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    await categoryService.deleteCategory(parseInt(id), req.user.id, permanent, req);
    
    const message = permanent 
      ? 'Category permanently deleted successfully'
      : 'Category deactivated successfully';
    
    res.json({ message });
    
  } catch (error) {
    console.error('Delete category error:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'An error occurred. Please try again later.',
      error: error.message 
    });
  }
};

export const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    const updatedCategory = await categoryService.toggleCategoryStatus(
      parseInt(id),
      req.user.id,
      req
    );
    
    const message = updatedCategory.status 
      ? 'Category activated successfully'
      : 'Category deactivated successfully';
    
    res.json({
      message,
      category: updatedCategory
    });
    
  } catch (error) {
    console.error('Toggle category status error:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'An error occurred. Please try again later.',
      error: error.message 
    });
  }
};

export const getJewelryTypes = async (req, res) => {
  try {
    const jewelryTypes = await categoryService.getJewelryTypes();
    
    res.json({
      jewelry_types: jewelryTypes,
      total: jewelryTypes.length
    });
    
  } catch (error) {
    console.error('Get jewelry types error:', error);
    res.status(500).json({ 
      message: 'An error occurred while fetching jewelry types.',
      error: error.message 
    });
  }
};

export const getCategoryAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const categoryId = id && !isNaN(parseInt(id)) ? parseInt(id) : null;
    
    const logs = await categoryService.getCategoryAuditLogs(
      categoryId,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      audit_logs: logs,
      total: logs.length,
      filters: {
        category_id: categoryId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      message: 'An error occurred while fetching audit logs.',
      error: error.message 
    });
  }
};
