// Category Controller
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// Get all categories for user
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.userId;

    const connection = await db.getConnection();

    try {
      const [categories] = await connection.execute(
        `SELECT id, name, type, color, is_default 
         FROM categories 
         WHERE user_id = ? 
         ORDER BY type, name`,
        [userId]
      );

      sendSuccess(res, categories, 'Categories fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get categories error:', error);
    sendError(res, 'Failed to fetch categories', 500);
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, type, color } = req.body;

    // Validation
    if (!name || !type) {
      return sendError(res, 'Name and type are required', 400);
    }

    if (!['income', 'expense'].includes(type)) {
      return sendError(res, 'Type must be income or expense', 400);
    }

    const connection = await db.getConnection();

    try {
      // Check if category already exists
      const [existing] = await connection.execute(
        'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
        [userId, name, type]
      );

      if (existing.length > 0) {
        return sendError(res, 'Category already exists', 400);
      }

      // Insert category
      const [result] = await connection.execute(
        `INSERT INTO categories (user_id, name, type, color, is_default)
         VALUES (?, ?, ?, ?, 0)`,
        [userId, name, type, color || null]
      );

      const categoryId = result.insertId;

      sendSuccess(res, { id: categoryId, name, type, color }, 'Category created successfully', 201);

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create category error:', error);
    sendError(res, 'Failed to create category', 500);
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const categoryId = req.params.id;
    const { name, color } = req.body;

    const connection = await db.getConnection();

    try {
      // Verify category belongs to user
      const [categories] = await connection.execute(
        'SELECT is_default FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId]
      );

      if (categories.length === 0) {
        return sendError(res, 'Category not found', 404);
      }

      // Cannot edit default categories
      if (categories[0].is_default) {
        return sendError(res, 'Cannot edit default categories', 403);
      }

      // Update category
      await connection.execute(
        'UPDATE categories SET name = ?, color = ? WHERE id = ?',
        [name || undefined, color || undefined, categoryId]
      );

      sendSuccess(res, { id: categoryId, name, color }, 'Category updated successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update category error:', error);
    sendError(res, 'Failed to update category', 500);
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const categoryId = req.params.id;

    const connection = await db.getConnection();

    try {
      // Verify category belongs to user and is not default
      const [categories] = await connection.execute(
        'SELECT id, type FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId]
      );

      if (categories.length === 0) {
        return sendError(res, 'Category not found', 404);
      }

      const category = categories[0];

      if (categories[0].is_default) {
        return sendError(res, 'Cannot delete default categories', 403);
      }

      // Get "Lainnya" category for the same type
      const [otherCategory] = await connection.execute(
        'SELECT id FROM categories WHERE user_id = ? AND name = "Lainnya" AND type = ? AND is_default = 1',
        [userId, category.type]
      );

      if (otherCategory.length === 0) {
        return sendError(res, '"Lainnya" category not found', 500);
      }

      const otherCategoryId = otherCategory[0].id;

      // Move transactions to "Lainnya"
      await connection.execute(
        'UPDATE transactions SET category_id = ? WHERE category_id = ? AND user_id = ?',
        [otherCategoryId, categoryId, userId]
      );

      // Delete category
      await connection.execute(
        'DELETE FROM categories WHERE id = ?',
        [categoryId]
      );

      sendSuccess(res, { categoryId }, 'Category deleted successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete category error:', error);
    sendError(res, 'Failed to delete category', 500);
  }
};
