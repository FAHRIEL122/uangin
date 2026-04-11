const { pool } = require('../config/database');
const { success, error, badRequest, notFound, validationError } = require('../utils/response');
const { sanitizeString } = require('../utils/validation');

// Get all categories for user
async function getCategories(req, res) {
  try {
    const userId = req.user.userId;
    const { type } = req.query;
    
    let query = 'SELECT * FROM categories WHERE user_id = ? ORDER BY type, name';
    const params = [userId];
    
    if (type && ['income', 'expense'].includes(type)) {
      query = 'SELECT * FROM categories WHERE user_id = ? AND type = ? ORDER BY name';
      params.push(type);
    }
    
    const [categories] = await pool.query(query, params);
    
    return success(res, 'Kategori berhasil diambil', categories);
    
  } catch (err) {
    console.error('Get categories error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil kategori', 500);
  }
}

// Create category
async function createCategory(req, res) {
  try {
    const userId = req.user.userId;
    const { name, type, icon, color } = req.body;
    
    // Validate
    if (!name || !name.trim()) {
      return badRequest(res, 'Nama kategori diperlukan');
    }
    
    if (!type || !['income', 'expense'].includes(type)) {
      return badRequest(res, 'Tipe harus "income" atau "expense"');
    }
    
    // Check if category already exists
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
      [userId, name.trim(), type]
    );
    
    if (existing.length > 0) {
      return badRequest(res, 'Kategori sudah ada');
    }
    
    // Insert
    const [result] = await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
      [userId, sanitizeString(name.trim()), type, icon || null, color || '#3b82f6']
    );
    
    // Get created category
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );
    
    return success(res, 'Kategori berhasil ditambahkan', categories[0], 201);
    
  } catch (err) {
    console.error('Create category error:', err.message);
    return error(res, 'Terjadi kesalahan saat menambahkan kategori', 500);
  }
}

// Update category
async function updateCategory(req, res) {
  try {
    const userId = req.user.userId;
    const categoryId = req.params.id;
    const { name, icon, color } = req.body;
    
    // Check if category exists
    const [existing] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );
    
    if (existing.length === 0) {
      return notFound(res, 'Kategori tidak ditemukan');
    }
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      if (!name.trim()) {
        return badRequest(res, 'Nama kategori diperlukan');
      }
      
      // Check for duplicate name
      const [duplicates] = await pool.query(
        'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ? AND id != ?',
        [userId, name.trim(), existing[0].type, categoryId]
      );
      
      if (duplicates.length > 0) {
        return badRequest(res, 'Nama kategori sudah digunakan');
      }
      
      updates.push('name = ?');
      values.push(sanitizeString(name.trim()));
    }
    
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon || null);
    }
    
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color || '#3b82f6');
    }
    
    if (updates.length === 0) {
      return badRequest(res, 'Tidak ada data yang diubah');
    }
    
    values.push(categoryId);
    
    await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Get updated category
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    
    return success(res, 'Kategori berhasil diperbarui', categories[0]);
    
  } catch (err) {
    console.error('Update category error:', err.message);
    return error(res, 'Terjadi kesalahan saat memperbarui kategori', 500);
  }
}

// Delete category
async function deleteCategory(req, res) {
  try {
    const userId = req.user.userId;
    const categoryId = req.params.id;
    
    // Check if category exists
    const [existing] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );
    
    if (existing.length === 0) {
      return notFound(res, 'Kategori tidak ditemukan');
    }
    
    // Check if category has transactions
    const [transactions] = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      [categoryId]
    );
    
    if (transactions[0].count > 0) {
      return badRequest(res, 'Kategori tidak bisa dihapus karena masih memiliki transaksi');
    }
    
    // Delete category
    await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
    
    return success(res, 'Kategori berhasil dihapus');
    
  } catch (err) {
    console.error('Delete category error:', err.message);
    return error(res, 'Terjadi kesalahan saat menghapus kategori', 500);
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
