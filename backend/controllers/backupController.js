const { pool } = require('../config/database');
const { success, error } = require('../utils/response');

// Export all user data
async function exportData(req, res) {
  try {
    const userId = req.user.userId;
    
    // Get user info
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, phone, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return error(res, 'User tidak ditemukan', 404);
    }
    
    // Get categories
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE user_id = ?',
      [userId]
    );
    
    // Get transactions
    const [transactions] = await pool.query(
      `SELECT t.*, c.name as category_name, c.type as category_type
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC`,
      [userId]
    );
    
    // Get budgets
    const [budgets] = await pool.query(
      `SELECT b.*, c.name as category_name
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ?`,
      [userId]
    );
    
    // Get summary
    const [summary] = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as total_income_transactions,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as total_expense_transactions,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE user_id = ?`,
      [userId]
    );
    
    const exportData = {
      exported_at: new Date().toISOString(),
      user: users[0],
      summary: summary[0],
      categories,
      transactions,
      budgets
    };
    
    return success(res, 'Data berhasil diexport', exportData);
    
  } catch (err) {
    console.error('Export error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengexport data', 500);
  }
}

module.exports = {
  exportData
};
