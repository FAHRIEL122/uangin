const { pool } = require('../config/database');
const { success, error, badRequest, notFound } = require('../utils/response');
const { sanitizeString } = require('../utils/validation');

// Get all tags for user
async function getTags(req, res) {
  try {
    const userId = req.user.userId;
    
    const [tags] = await pool.query(
      `SELECT t.*, COUNT(tt.transaction_id) as usage_count
       FROM tags t
       LEFT JOIN transaction_tags tt ON t.id = tt.tag_id
       WHERE t.user_id = ?
       GROUP BY t.id
       ORDER BY t.name`,
      [userId]
    );
    
    return success(res, 'Tags berhasil diambil', tags);
    
  } catch (err) {
    console.error('Get tags error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil tags', 500);
  }
}

// Create tag
async function createTag(req, res) {
  try {
    const userId = req.user.userId;
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return badRequest(res, 'Nama tag diperlukan');
    }
    
    const [result] = await pool.query(
      'INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)',
      [userId, sanitizeString(name.trim()), color || '#3b82f6']
    );
    
    const [tags] = await pool.query('SELECT * FROM tags WHERE id = ?', [result.insertId]);
    
    return success(res, 'Tag berhasil ditambahkan', tags[0], 201);
    
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return badRequest(res, 'Tag sudah ada');
    }
    console.error('Create tag error:', err.message);
    return error(res, 'Terjadi kesalahan saat menambahkan tag', 500);
  }
}

// Update tag
async function updateTag(req, res) {
  try {
    const userId = req.user.userId;
    const tagId = req.params.id;
    const { name, color } = req.body;
    
    const [existing] = await pool.query(
      'SELECT * FROM tags WHERE id = ? AND user_id = ?',
      [tagId, userId]
    );
    
    if (existing.length === 0) {
      return notFound(res, 'Tag tidak ditemukan');
    }
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      if (!name.trim()) {
        return badRequest(res, 'Nama tag diperlukan');
      }
      updates.push('name = ?');
      values.push(sanitizeString(name.trim()));
    }
    
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color || '#3b82f6');
    }
    
    if (updates.length === 0) {
      return badRequest(res, 'Tidak ada data yang diubah');
    }
    
    values.push(tagId);
    
    await pool.query(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const [tags] = await pool.query('SELECT * FROM tags WHERE id = ?', [tagId]);
    
    return success(res, 'Tag berhasil diperbarui', tags[0]);
    
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return badRequest(res, 'Nama tag sudah digunakan');
    }
    console.error('Update tag error:', err.message);
    return error(res, 'Terjadi kesalahan saat memperbarui tag', 500);
  }
}

// Delete tag
async function deleteTag(req, res) {
  try {
    const userId = req.user.userId;
    const tagId = req.params.id;
    
    const [existing] = await pool.query(
      'SELECT * FROM tags WHERE id = ? AND user_id = ?',
      [tagId, userId]
    );
    
    if (existing.length === 0) {
      return notFound(res, 'Tag tidak ditemukan');
    }
    
    await pool.query('DELETE FROM tags WHERE id = ?', [tagId]);
    
    return success(res, 'Tag berhasil dihapus');
    
  } catch (err) {
    console.error('Delete tag error:', err.message);
    return error(res, 'Terjadi kesalahan saat menghapus tag', 500);
  }
}

// Add tag to transaction
async function addTagToTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.transactionId;
    const { tag_id } = req.body;
    
    // Verify transaction belongs to user
    const [transactions] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );
    
    if (transactions.length === 0) {
      return notFound(res, 'Transaksi tidak ditemukan');
    }
    
    // Verify tag belongs to user
    const [tags] = await pool.query(
      'SELECT id FROM tags WHERE id = ? AND user_id = ?',
      [tag_id, userId]
    );
    
    if (tags.length === 0) {
      return notFound(res, 'Tag tidak ditemukan');
    }
    
    // Add tag (ignore if already exists)
    await pool.query(
      'INSERT IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
      [transactionId, tag_id]
    );
    
    return success(res, 'Tag berhasil ditambahkan');
    
  } catch (err) {
    console.error('Add tag error:', err.message);
    return error(res, 'Terjadi kesalahan saat menambahkan tag', 500);
  }
}

// Remove tag from transaction
async function removeTagFromTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.transactionId;
    const tagId = req.params.tagId;
    
    // Verify transaction belongs to user
    const [transactions] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );
    
    if (transactions.length === 0) {
      return notFound(res, 'Transaksi tidak ditemukan');
    }
    
    await pool.query(
      'DELETE FROM transaction_tags WHERE transaction_id = ? AND tag_id = ?',
      [transactionId, tagId]
    );
    
    return success(res, 'Tag berhasil dihapus dari transaksi');
    
  } catch (err) {
    console.error('Remove tag error:', err.message);
    return error(res, 'Terjadi kesalahan saat menghapus tag', 500);
  }
}

// Get tags for a transaction
async function getTransactionTags(req, res) {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.transactionId;
    
    const [tags] = await pool.query(
      `SELECT t.* FROM tags t
       JOIN transaction_tags tt ON t.id = tt.tag_id
       WHERE tt.transaction_id = ? AND t.user_id = ?
       ORDER BY t.name`,
      [transactionId, userId]
    );
    
    return success(res, 'Tags berhasil diambil', tags);
    
  } catch (err) {
    console.error('Get transaction tags error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil tags', 500);
  }
}

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToTransaction,
  removeTagFromTransaction,
  getTransactionTags
};
