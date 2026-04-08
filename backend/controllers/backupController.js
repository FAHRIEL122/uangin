// Backup Controller
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.getBackup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const connection = await db.getConnection();

    try {
      const [users] = await connection.execute(
        `SELECT id, username, email, full_name, phone, created_at
         FROM users
         WHERE id = ?`,
        [userId]
      );

      const [categories] = await connection.execute(
        `SELECT id, name, type, created_at
         FROM categories
         WHERE user_id = ?`,
        [userId]
      );

      const [transactions] = await connection.execute(
        `SELECT id, category_id, amount, type, description, transaction_date, transaction_time, is_recurring, attachment_path, created_at
         FROM transactions
         WHERE user_id = ?
         ORDER BY transaction_date DESC, transaction_time DESC`,
        [userId]
      );

      const [budgets] = await connection.execute(
        `SELECT id, category_id, limit_amount, spent_amount, month, year, created_at
         FROM budgets
         WHERE user_id = ?`,
        [userId]
      );

      sendSuccess(res, {
        user: users[0] || null,
        categories,
        transactions,
        budgets,
      }, 'Backup data fetched successfully');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get backup error:', error);
    sendError(res, 'Failed to fetch backup data', 500);
  }
};
