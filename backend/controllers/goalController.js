const { pool } = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

// Get all savings goals for user
async function getGoals(req, res) {
  try {
    const userId = req.user.userId;
    const [goals] = await pool.query(
      `SELECT * FROM savings_goals 
       WHERE user_id = ? 
       ORDER BY is_active DESC, created_at DESC`,
      [userId]
    );
    return success(res, 'Goals retrieved', goals);
  } catch (err) {
    console.error('Get goals error:', err.message);
    return error(res, 'Failed to get goals', 500);
  }
}

// Create new goal
async function createGoal(req, res) {
  try {
    const userId = req.user.userId;
    const { name, icon, target_amount, deadline, color } = req.body;

    if (!name || !target_amount) {
      return badRequest(res, 'Nama dan target amount wajib diisi');
    }

    if (parseFloat(target_amount) <= 0) {
      return badRequest(res, 'Target amount harus lebih dari 0');
    }

    const [result] = await pool.query(
      `INSERT INTO savings_goals (user_id, name, icon, target_amount, deadline, color)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name.trim(), icon || '🎯', parseFloat(target_amount), deadline || null, color || '#3b82f6']
    );

    const [goal] = await pool.query('SELECT * FROM savings_goals WHERE id = ?', [result.insertId]);
    return success(res, 'Goal berhasil dibuat', goal[0], 201);
  } catch (err) {
    console.error('Create goal error:', err.message);
    return error(res, 'Failed to create goal', 500);
  }
}

// Update goal
async function updateGoal(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, icon, target_amount, deadline, color, is_active } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM savings_goals WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return badRequest(res, 'Goal tidak ditemukan');
    }

    await pool.query(
      `UPDATE savings_goals SET 
       name = ?, icon = ?, target_amount = ?, deadline = ?, color = ?, is_active = ?
       WHERE id = ?`,
      [
        name || existing[0].name,
        icon || existing[0].icon,
        target_amount || existing[0].target_amount,
        deadline || existing[0].deadline,
        color || existing[0].color,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    const [goal] = await pool.query('SELECT * FROM savings_goals WHERE id = ?', [id]);
    return success(res, 'Goal berhasil diupdate', goal[0]);
  } catch (err) {
    console.error('Update goal error:', err.message);
    return error(res, 'Failed to update goal', 500);
  }
}

// Add progress to goal
async function addProgress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return badRequest(res, 'Amount harus lebih dari 0');
    }

    const [result] = await pool.query(
      `UPDATE savings_goals 
       SET current_amount = current_amount + ?
       WHERE id = ? AND user_id = ?`,
      [parseFloat(amount), id, userId]
    );

    if (result.affectedRows === 0) {
      return badRequest(res, 'Goal tidak ditemukan');
    }

    const [goal] = await pool.query('SELECT * FROM savings_goals WHERE id = ?', [id]);
    return success(res, 'Progress berhasil ditambahkan', goal[0]);
  } catch (err) {
    console.error('Add progress error:', err.message);
    return error(res, 'Failed to add progress', 500);
  }
}

// Delete goal
async function deleteGoal(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM savings_goals WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return badRequest(res, 'Goal tidak ditemukan');
    }

    return success(res, 'Goal berhasil dihapus');
  } catch (err) {
    console.error('Delete goal error:', err.message);
    return error(res, 'Failed to delete goal', 500);
  }
}

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  addProgress,
  deleteGoal
};
