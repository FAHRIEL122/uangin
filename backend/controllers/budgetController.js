// Budget Controller
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { validateAmount } = require('../utils/validation');

// Get budgets for month
const getBudgets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      // Get budgets
      const [budgets] = await connection.execute(
        `SELECT 
          b.id,
          b.category_id,
          c.name as category_name,
          c.type,
          b.limit_amount,
          b.spent_amount,
          (b.limit_amount - b.spent_amount) as remaining_amount,
          ROUND((b.spent_amount / b.limit_amount * 100), 2) as percentage_used
         FROM budgets b
         JOIN categories c ON b.category_id = c.id
         WHERE b.user_id = ? AND b.month = ? AND b.year = ?
         ORDER BY c.name`,
        [userId, parseInt(month), parseInt(year)]
      );

      sendSuccess(res, budgets, 'Budgets fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get budgets error:', error);
    sendError(res, 'Failed to fetch budgets', 500);
  }
};

// Create or update budget
const setBudget = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category_id, limit_amount, month, year } = req.body;

    // Validation
    if (!category_id || !limit_amount || !month || !year) {
      return sendError(res, 'Required fields: category_id, limit_amount, month, year', 400);
    }

    if (!validateAmount(limit_amount)) {
      return sendError(res, 'Limit amount must be a positive number', 400);
    }

    const connection = await db.getConnection();

    try {
      // Verify category
      const [categories] = await connection.execute(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [category_id, userId]
      );

      if (categories.length === 0) {
        return sendError(res, 'Category not found', 404);
      }

      // Check existing budget
      const [existing] = await connection.execute(
        'SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
        [userId, category_id, month, year]
      );

      if (existing.length > 0) {
        // Update
        await connection.execute(
          'UPDATE budgets SET limit_amount = ? WHERE id = ?',
          [limit_amount, existing[0].id]
        );
      } else {
        // Insert
        await connection.execute(
          `INSERT INTO budgets (user_id, category_id, limit_amount, month, year, spent_amount)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [userId, category_id, limit_amount, month, year]
        );
      }

      sendSuccess(res, { category_id, limit_amount, month, year }, 'Budget set successfully', 201);

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Set budget error:', error);
    sendError(res, 'Failed to set budget', 500);
  }
};

// Delete budget
const deleteBudget = async (req, res) => {
  try {
    const userId = req.user.userId;
    const budgetId = req.params.id;

    const connection = await db.getConnection();

    try {
      // Verify budget belongs to user
      const [budgets] = await connection.execute(
        'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
        [budgetId, userId]
      );

      if (budgets.length === 0) {
        return sendError(res, 'Budget not found', 404);
      }

      // Delete budget
      await connection.execute(
        'DELETE FROM budgets WHERE id = ?',
        [budgetId]
      );

      sendSuccess(res, { budgetId }, 'Budget deleted successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete budget error:', error);
    sendError(res, 'Failed to delete budget', 500);
  }
};

// Internal helper: adjust budget spent amount (can be positive or negative)
const adjustBudgetSpent = async ({ userId, categoryId, year, month, delta }) => {
  if (!delta || isNaN(delta)) return;
  const connection = await db.getConnection();
  try {
    const [budgets] = await connection.execute(
      'SELECT id, spent_amount FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [userId, categoryId, parseInt(month), parseInt(year)]
    );

    if (budgets.length === 0) return;

    const current = parseFloat(budgets[0].spent_amount || 0);
    const next = current + parseFloat(delta);

    await connection.execute(
      'UPDATE budgets SET spent_amount = ? WHERE id = ?',
      [next, budgets[0].id]
    );
  } finally {
    connection.release();
  }
};

// Check budget warning for category
const checkBudgetWarning = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category_id, month, year, amount } = req.query;

    if (!category_id || !month || !year || !amount) {
      return sendError(res, 'Required fields: category_id, month, year, amount', 400);
    }

    const connection = await db.getConnection();

    try {
      const [budgets] = await connection.execute(
        `SELECT limit_amount, spent_amount 
         FROM budgets 
         WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?`,
        [userId, category_id, month, year]
      );

      if (budgets.length === 0) {
        return sendSuccess(res, { has_budget: false, warning: false }, 'No budget set');
      }

      const budget = budgets[0];
      const newSpent = parseFloat(budget.spent_amount) + parseFloat(amount);
      const percentageUsed = (newSpent / parseFloat(budget.limit_amount)) * 100;

      const response = {
        has_budget: true,
        limit_amount: parseFloat(budget.limit_amount),
        current_spent: parseFloat(budget.spent_amount),
        new_spent: newSpent,
        remaining: parseFloat(budget.limit_amount) - newSpent,
        percentage_used: parseFloat(percentageUsed.toFixed(2)),
        warning: percentageUsed > 80,
        exceeded: newSpent > parseFloat(budget.limit_amount),
      };

      sendSuccess(res, response, 'Budget check completed');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Check budget warning error:', error);
    sendError(res, 'Failed to check budget', 500);
  }
};

module.exports = {
  getBudgets,
  setBudget,
  deleteBudget,
  checkBudgetWarning,
  adjustBudgetSpent,
};
