const { pool } = require('../config/database');
const { success, error, badRequest, notFound, validationError } = require('../utils/response');
const { validateAmount, validateDate, validateTime, validateTransactionType, sanitizeString } = require('../utils/validation');

// Get transactions for a specific month/year
async function getTransactions(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    // Default to current month/year
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    // Validate
    if (targetMonth < 1 || targetMonth > 12) {
      return badRequest(res, 'Bulan harus antara 1-12');
    }
    
    // Use range query instead of MONTH()/YEAR() for better index usage
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = targetMonth === 12 
      ? `${targetYear + 1}-01-01` 
      : `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
    
    // Get transactions with category info
    const [transactions] = await pool.query(
      `SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.transaction_time,
        t.attachment_url,
        t.created_at,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.transaction_date >= ?
        AND t.transaction_date < ?
        AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [userId, startDate, endDate]
    );

    // Get summary
    const [summary] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE user_id = ?
        AND transaction_date >= ?
        AND transaction_date < ?
        AND deleted_at IS NULL`,
      [userId, startDate, endDate]
    );

    return success(res, 'Data transaksi berhasil diambil', {
      transactions,
      summary: summary[0],
      month: targetMonth,
      year: targetYear
    });
    
  } catch (err) {
    console.error('Get transactions error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil data transaksi', 500);
  }
}

// Get all transactions (for calendar view)
async function getAllTransactions(req, res) {
  try {
    const userId = req.user.userId;

    const [transactions] = await pool.query(
      `SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.transaction_time,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT 1000`,
      [userId]
    );

    return success(res, 'Semua transaksi berhasil diambil', transactions);
    
  } catch (err) {
    console.error('Get all transactions error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil data', 500);
  }
}

// Create transaction
async function createTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { type, category_id, amount, description, transaction_date, transaction_time, recurring_id, attachment_url } = req.body;
    
    // Validate inputs
    const errors = [];
    errors.push(...validateTransactionType(type));
    errors.push(...validateAmount(amount));
    errors.push(...validateDate(transaction_date));
    
    if (category_id) {
      // Verify category belongs to user
      const [categories] = await pool.query(
        'SELECT id, type FROM categories WHERE id = ? AND user_id = ?',
        [category_id, userId]
      );
      
      if (categories.length === 0) {
        errors.push('Kategori tidak ditemukan');
      } else if (categories[0].type !== type) {
        errors.push('Tipe kategori tidak sesuai dengan tipe transaksi');
      }
    }
    
    if (errors.length > 0) {
      return validationError(res, errors);
    }
    
    // Sanitize description
    const cleanDescription = description ? sanitizeString(description.trim()) : null;
    const cleanTime = transaction_time || null;
    
    // Insert transaction
    const [result] = await pool.query(
      `INSERT INTO transactions 
        (user_id, category_id, type, amount, description, transaction_date, transaction_time, recurring_id, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, category_id || null, type, parseFloat(amount), cleanDescription, transaction_date, cleanTime, recurring_id || null, attachment_url || null]
    );
    
    // Get the created transaction
    const [transactions] = await pool.query(
      `SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.transaction_time,
        t.attachment_url,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?`,
      [result.insertId]
    );
    
    const transactionType = type === 'income' ? 'Pendapatan' : 'Pengeluaran';
    
    return success(res, `${transactionType} sebesar Rp ${parseFloat(amount).toLocaleString('id-ID')} berhasil disimpan!`, transactions[0], 201);
    
  } catch (err) {
    console.error('Create transaction error:', err.message);
    return error(res, 'Terjadi kesalahan saat menyimpan transaksi', 500);
  }
}

// Update transaction
async function updateTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;
    const { type, category_id, amount, description, transaction_date, transaction_time, attachment_url } = req.body;
    
    // Check if transaction exists and belongs to user
    const [existing] = await pool.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );
    
    if (existing.length === 0) {
      return notFound(res, 'Transaksi tidak ditemukan');
    }
    
    const oldTransaction = existing[0];
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (type) {
      if (!['income', 'expense'].includes(type)) {
        return badRequest(res, 'Tipe transaksi harus "income" atau "expense"');
      }
      updates.push('type = ?');
      values.push(type);
    }
    
    if (amount !== undefined) {
      const errors = validateAmount(amount);
      if (errors.length > 0) {
        return validationError(res, errors);
      }
      updates.push('amount = ?');
      values.push(parseFloat(amount));
    }
    
    if (category_id !== undefined) {
      if (category_id === null) {
        updates.push('category_id = NULL');
      } else {
        const [categories] = await pool.query(
          'SELECT id, type FROM categories WHERE id = ? AND user_id = ?',
          [category_id, userId]
        );
        
        if (categories.length === 0) {
          return badRequest(res, 'Kategori tidak ditemukan');
        }
        
        const finalType = type || oldTransaction.type;
        if (categories[0].type !== finalType) {
          return badRequest(res, 'Tipe kategori tidak sesuai');
        }
        
        updates.push('category_id = ?');
        values.push(category_id);
      }
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description ? sanitizeString(description.trim()) : null);
    }
    
    if (transaction_date !== undefined) {
      const errors = validateDate(transaction_date);
      if (errors.length > 0) {
        return validationError(res, errors);
      }
      updates.push('transaction_date = ?');
      values.push(transaction_date);
    }
    
    if (transaction_time !== undefined) {
      updates.push('transaction_time = ?');
      values.push(transaction_time || null);
    }
    
    if (attachment_url !== undefined) {
      updates.push('attachment_url = ?');
      values.push(attachment_url || null);
    }
    
    if (updates.length === 0) {
      return badRequest(res, 'Tidak ada data yang diubah');
    }
    
    values.push(transactionId);
    
    await pool.query(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Get updated transaction
    const [transactions] = await pool.query(
      `SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.transaction_time,
        t.attachment_url,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?`,
      [transactionId, userId]
    );
    
    return success(res, 'Transaksi berhasil diperbarui', transactions[0]);
    
  } catch (err) {
    console.error('Update transaction error:', err.message);
    return error(res, 'Terjadi kesalahan saat memperbarui transaksi', 500);
  }
}

// Delete transaction (Soft Delete)
async function deleteTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    // Check if transaction exists and not already deleted
    const [existing] = await pool.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [transactionId, userId]
    );

    if (existing.length === 0) {
      return notFound(res, 'Transaksi tidak ditemukan atau sudah dihapus');
    }

    // Soft delete
    await pool.query(
      'UPDATE transactions SET deleted_at = NOW() WHERE id = ?',
      [transactionId]
    );

    return success(res, 'Transaksi berhasil dihapus (dipindah ke arsip)');

  } catch (err) {
    console.error('Delete transaction error:', err.message);
    return error(res, 'Terjadi kesalahan saat menghapus transaksi', 500);
  }
}

// Get archived transactions
async function getArchivedTransactions(req, res) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [transactions] = await pool.query(
      `SELECT
        t.*,
        c.name as category_name,
        c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.deleted_at IS NOT NULL
      ORDER BY t.deleted_at DESC
      LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND deleted_at IS NOT NULL',
      [userId]
    );

    const total = countResult[0].total;

    return success(res, 'Arsip transaksi berhasil diambil', {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Get archived transactions error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil arsip', 500);
  }
}

// Restore transaction
async function restoreTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE transactions SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return badRequest(res, 'Transaksi tidak ditemukan di arsip');
    }

    return success(res, 'Transaksi berhasil dikembalikan');

  } catch (err) {
    console.error('Restore transaction error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengembalikan transaksi', 500);
  }
}

// Permanently delete transaction
async function permanentDeleteTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return badRequest(res, 'Transaksi tidak ditemukan di arsip');
    }

    return success(res, 'Transaksi berhasil dihapus permanen');

  } catch (err) {
    console.error('Permanent delete transaction error:', err.message);
    return error(res, 'Terjadi kesalahan saat menghapus permanen', 500);
  }
}

// Undo last transaction
async function undoTransaction(req, res) {
  try {
    const userId = req.user.userId;
    
    // Get last transaction
    const [transactions] = await pool.query(
      `SELECT id FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (transactions.length === 0) {
      return badRequest(res, 'Tidak ada transaksi untuk di-undo');
    }
    
    const lastTransactionId = transactions[0].id;
    
    // Get transaction data for response
    const [details] = await pool.query(
      `SELECT type, amount FROM transactions WHERE id = ?`,
      [lastTransactionId]
    );
    
    // Delete transaction
    await pool.query('DELETE FROM transactions WHERE id = ?', [lastTransactionId]);
    
    const transactionType = details[0].type === 'income' ? 'Pendapatan' : 'Pengeluaran';
    
    return success(res, `${transactionType} sebesar Rp ${parseFloat(details[0].amount).toLocaleString('id-ID')} berhasil di-undo`);
    
  } catch (err) {
    console.error('Undo transaction error:', err.message);
    return error(res, 'Terjadi kesalahan saat meng-undo transaksi', 500);
  }
}

module.exports = {
  getTransactions,
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  undoTransaction,
  getArchivedTransactions,
  restoreTransaction,
  permanentDeleteTransaction
};
