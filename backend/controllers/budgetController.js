const { pool } = require('../config/database');
const { success, error, badRequest, notFound } = require('../utils/response');

// Get budgets for a specific month/year
async function getBudgets(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    if (targetMonth < 1 || targetMonth > 12) {
      return badRequest(res, 'Bulan harus antara 1-12');
    }
    
    // Get budgets with category info
    const [budgets] = await pool.query(
      `SELECT 
        b.id,
        b.limit_amount,
        b.spent_amount,
        b.rollover_amount,
        b.allow_rollover,
        (b.limit_amount + b.rollover_amount) as effective_budget,
        b.month,
        b.year,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      ORDER BY c.name`,
      [userId, targetMonth, targetYear]
    );
    
    return success(res, 'Budget berhasil diambil', budgets);
    
  } catch (err) {
    console.error('Get budgets error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil budget', 500);
  }
}

// Set/update budget
async function setBudget(req, res) {
  try {
    const userId = req.user.userId;
    const { category_id, limit_amount, month, year, allow_rollover } = req.body;
    
    // Validate
    if (!category_id) {
      return badRequest(res, 'Kategori diperlukan');
    }
    
    if (!limit_amount || parseFloat(limit_amount) <= 0) {
      return badRequest(res, 'Jumlah budget harus lebih dari 0');
    }
    
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const allowRollover = allow_rollover === true;
    
    // Check if category exists
    const [categories] = await pool.query(
      'SELECT id, type FROM categories WHERE id = ? AND user_id = ?',
      [category_id, userId]
    );
    
    if (categories.length === 0) {
      return notFound(res, 'Kategori tidak ditemukan');
    }
    
    if (categories[0].type !== 'expense') {
      return badRequest(res, 'Budget hanya untuk kategori pengeluaran');
    }
    
    // Check if budget already exists
    const [existing] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [userId, category_id, targetMonth, targetYear]
    );
    
    if (existing.length > 0) {
      // Update existing budget
      await pool.query(
        'UPDATE budgets SET limit_amount = ?, allow_rollover = ? WHERE id = ?',
        [parseFloat(limit_amount), allowRollover, existing[0].id]
      );
      
      return success(res, 'Budget berhasil diperbarui');
    } else {
      // Create new budget with rollover support
      // Calculate rollover from previous month if allowed
      let rolloverAmount = 0;
      if (allowRollover) {
        const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
        const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
        
        const [prevBudgets] = await pool.query(
          `SELECT limit_amount, spent_amount FROM budgets 
           WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?
           AND allow_rollover = TRUE`,
          [userId, category_id, prevMonth, prevYear]
        );
        
        if (prevBudgets.length > 0) {
          const prevBudget = prevBudgets[0];
          const unused = prevBudget.limit_amount - prevBudget.spent_amount;
          rolloverAmount = Math.max(0, unused);
        }
      }
      
      await pool.query(
        'INSERT INTO budgets (user_id, category_id, limit_amount, rollover_amount, allow_rollover, month, year) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, category_id, parseFloat(limit_amount), rolloverAmount, allowRollover, targetMonth, targetYear]
      );
      
      return success(res, 'Budget berhasil ditetapkan', {
        rollover_amount: rolloverAmount,
        effective_budget: parseFloat(limit_amount) + rolloverAmount
      }, 201);
    }
    
  } catch (err) {
    console.error('Set budget error:', err.message);
    return error(res, 'Terjadi kesalahan saat menyimpan budget', 500);
  }
}

// Delete budget
async function deleteBudget(req, res) {
  try {
    const userId = req.user.userId;
    const budgetId = req.params.id;
    
    // Check if budget exists
    const [existing] = await pool.query(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );
    
    if (existing.length === 0) {
      return notFound(res, 'Budget tidak ditemukan');
    }
    
    await pool.query('DELETE FROM budgets WHERE id = ?', [budgetId]);
    
    return success(res, 'Budget berhasil dihapus');
    
  } catch (err) {
    console.error('Delete budget error:', err.message);
    return error(res, 'Terjadi kesalahan saat menghapus budget', 500);
  }
}

// Check budget warning
async function checkBudgetWarning(req, res) {
  try {
    const userId = req.user.userId;
    const { category_id, amount } = req.query;
    
    if (!category_id || !amount) {
      return badRequest(res, 'Category ID dan amount diperlukan');
    }
    
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    // Get budget
    const [budgets] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [userId, category_id, month, year]
    );
    
    if (budgets.length === 0) {
      return success(res, 'Tidak ada budget untuk kategori ini', { hasBudget: false });
    }
    
    const budget = budgets[0];
    const newSpent = budget.spent_amount + parseFloat(amount);
    const percentage = (newSpent / budget.limit_amount) * 100;
    
    let warning = null;
    if (percentage > 100) {
      warning = {
        type: 'danger',
        message: `Budget telah terlampaui! (${percentage.toFixed(1)}%)`,
        percentage: percentage.toFixed(1)
      };
    } else if (percentage > 80) {
      warning = {
        type: 'warning',
        message: `Budget hampir terlampaui (${percentage.toFixed(1)}%)`,
        percentage: percentage.toFixed(1)
      };
    }
    
    return success(res, 'Budget check complete', {
      hasBudget: true,
      budget: budget.limit_amount,
      spent: newSpent,
      remaining: Math.max(0, budget.limit_amount - newSpent),
      percentage: percentage.toFixed(1),
      warning
    });
    
  } catch (err) {
    console.error('Check budget warning error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengecek budget', 500);
  }
}

module.exports = {
  getBudgets,
  setBudget,
  deleteBudget,
  checkBudgetWarning
};
