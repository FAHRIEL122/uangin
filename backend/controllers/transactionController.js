// Transaction Controller
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { validateAmount, validateDate, validateTime } = require('../utils/validation');
const { adjustBudgetSpent } = require('./budgetController');

// Helper: Calculate balance after transaction
const calculateBalanceAfter = async (userId, upToId) => {
  const connection = await db.getConnection();

  try {
    const [result] = await connection.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
       FROM transactions
       WHERE user_id = ? AND id <= ?
       ORDER BY transaction_date, transaction_time, id`,
      [userId, upToId]
    );

    return result[0]?.balance || 0;
  } finally {
    connection.release();
  }
};

// Get transactions (by month & year)
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      const [transactions] = await connection.execute(
        `SELECT 
          t.id, 
          t.amount, 
          t.type, 
          t.description, 
          DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
          t.transaction_time,
          t.balance_after,
          t.category_id,
          c.name as category_name,
          t.is_recurring,
          t.attachment_path,
          t.created_at
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? 
         AND YEAR(t.transaction_date) = ? 
         AND MONTH(t.transaction_date) = ?
         ORDER BY t.transaction_date DESC, t.transaction_time DESC`,
        [userId, parseInt(year), parseInt(month)]
      );

      // Get summary
      const [summary] = await connection.execute(
        `SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
         FROM transactions
         WHERE user_id = ? 
         AND YEAR(transaction_date) = ? 
         AND MONTH(transaction_date) = ?`,
        [userId, parseInt(year), parseInt(month)]
      );

      const summaryData = summary[0] || { total_income: 0, total_expense: 0 };
      const net_balance = parseFloat(summaryData.total_income || 0) - parseFloat(summaryData.total_expense || 0);

      sendSuccess(res, {
        transactions,
        summary: {
          total_income: parseFloat(summaryData.total_income || 0),
          total_expense: parseFloat(summaryData.total_expense || 0),
          net_balance,
        },
      }, 'Transactions fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get transactions error:', error);
    sendError(res, 'Failed to fetch transactions', 500);
  }
};

// Get all transactions (for calendar view)
exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const connection = await db.getConnection();

    try {
      const [transactions] = await connection.execute(
        `SELECT 
          t.id, 
          t.amount, 
          t.type, 
          t.description, 
          DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
          t.transaction_time,
          t.balance_after,
          t.category_id,
          c.name as category_name,
          t.created_at
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ?
         ORDER BY t.transaction_date DESC, t.transaction_time DESC`,
        [userId]
      );

      sendSuccess(res, transactions, 'All transactions fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get all transactions error:', error);
    sendError(res, 'Failed to fetch transactions', 500);
  }
};

// Create transaction
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, type, description, category_id, transaction_date, transaction_time, is_recurring, attachment_path } = req.body;

    // DEBUG: Log incoming request
    console.log('=== CREATE TRANSACTION DEBUG ===');
    console.log('User ID:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Parsed values:', {
      amount,
      type,
      description,
      category_id,
      transaction_date,
      transaction_time,
      is_recurring,
      attachment_path
    });
    console.log('================================');

    // Validation
    if (!amount || !type || !category_id || !transaction_date || !transaction_time) {
      console.error('VALIDATION FAILED: Missing required fields');
      return sendError(res, 'Required fields: amount, type, category_id, transaction_date, transaction_time', 400);
    }

    if (!validateAmount(amount)) {
      console.error('VALIDATION FAILED: Invalid amount', amount);
      return sendError(res, 'Amount must be a positive number', 400);
    }

    if (!['income', 'expense'].includes(type)) {
      console.error('VALIDATION FAILED: Invalid type', type);
      return sendError(res, 'Type must be income or expense', 400);
    }

    if (!validateDate(transaction_date)) {
      console.error('VALIDATION FAILED: Invalid date', transaction_date);
      return sendError(res, 'Invalid date format', 400);
    }

    if (!validateTime(transaction_time)) {
      console.error('VALIDATION FAILED: Invalid time', transaction_time);
      return sendError(res, 'Invalid time format (HH:MM or HH:MM:SS)', 400);
    }

    const connection = await db.getConnection();

    try {
      // Verify category belongs to user
      const [categories] = await connection.execute(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [category_id, userId]
      );

      console.log('Category verification:', { category_id, userId, found: categories.length > 0 });

      if (categories.length === 0) {
        console.error('VALIDATION FAILED: Category not found for this user');
        return sendError(res, 'Category not found', 404);
      }

      // Insert transaction
      console.log('Executing INSERT...');
      const [result] = await connection.execute(
        `INSERT INTO transactions
         (user_id, category_id, amount, type, description, transaction_date, transaction_time, is_recurring, attachment_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, category_id, amount, type, description || null, transaction_date, transaction_time, is_recurring ? 1 : 0, attachment_path || null]
      );

      const transactionId = result.insertId;
      console.log('Transaction inserted with ID:', transactionId);

      // Calculate and update balance_after for all subsequent transactions
      console.log('Updating balances...');
      await updateAllBalancesAfter(userId, transactionId);

      // Update budget spent for expense transactions
      if (type === 'expense') {
        const [year, month] = transaction_date.split('-');
        await adjustBudgetSpent({ userId, categoryId: category_id, year, month, delta: amount });
      }

      // Get created transaction
      const [newTransaction] = await connection.execute(
        `SELECT
          t.id,
          t.amount,
          t.type,
          t.description,
          DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
          t.transaction_time,
          t.balance_after,
          t.category_id,
          c.name as category_name,
          t.is_recurring,
          t.created_at
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.id = ?`,
        [transactionId]
      );

      console.log('Created transaction:', newTransaction[0]);

      // Log undo
      await connection.execute(
        `INSERT INTO undo_log (user_id, transaction_id, action, new_data)
         VALUES (?, ?, 'CREATE', ?)`,
        [userId, transactionId, JSON.stringify(newTransaction[0])]
      );

      console.log('Transaction created successfully');
      sendSuccess(res, newTransaction[0], 'Transaction created successfully', 201);

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('=== CREATE TRANSACTION ERROR ===');
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    console.error('Error sqlState:', error.sqlState);
    console.error('================================');
    sendError(res, 'Failed to create transaction', 500);
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;
    const { amount, type, description, category_id, transaction_date, transaction_time, is_recurring, attachment_path } = req.body;

    const connection = await db.getConnection();

    try {
      // Get old transaction
      const [oldTransactions] = await connection.execute(
        'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
        [transactionId, userId]
      );

      if (oldTransactions.length === 0) {
        return sendError(res, 'Transaction not found', 404);
      }

      const oldData = oldTransactions[0];

      // Validate category if provided
      if (category_id) {
        const [categories] = await connection.execute(
          'SELECT id FROM categories WHERE id = ? AND user_id = ?',
          [category_id, userId]
        );

        if (categories.length === 0) {
          return sendError(res, 'Category not found', 404);
        }
      }

      // Update transaction
      const updateAmount = amount !== undefined ? amount : oldData.amount;
      const updateType = type !== undefined ? type : oldData.type;
      const updateDescription = description !== undefined ? description : oldData.description;
      const updateCategoryId = category_id !== undefined ? category_id : oldData.category_id;
      const updateDate = transaction_date !== undefined ? transaction_date : oldData.transaction_date;
      const updateTime = transaction_time !== undefined ? transaction_time : oldData.transaction_time;

      await connection.execute(
        `UPDATE transactions 
         SET amount = ?, type = ?, description = ?, category_id = ?, transaction_date = ?, transaction_time = ?, is_recurring = ?, attachment_path = ?
         WHERE id = ?`,
        [updateAmount, updateType, updateDescription, updateCategoryId, updateDate, updateTime, is_recurring ? 1 : 0, attachment_path || null, transactionId]
      );

      // Recalculate balances
      await updateAllBalancesAfter(userId, transactionId);

      // Update budget spent (handle changes in amount/type/category/date)
      const oldExpense = oldData.type === 'expense' ? parseFloat(oldData.amount) : 0;
      const newExpense = updateType === 'expense' ? parseFloat(updateAmount) : 0;

      if (oldExpense !== 0) {
        const [oldYear, oldMonth] = oldData.transaction_date.split('-');
        await adjustBudgetSpent({ userId, categoryId: oldData.category_id, year: oldYear, month: oldMonth, delta: -oldExpense });
      }

      if (newExpense !== 0) {
        const [newYear, newMonth] = updateDate.split('-');
        await adjustBudgetSpent({ userId, categoryId: updateCategoryId, year: newYear, month: newMonth, delta: newExpense });
      }

      // Get updated transaction
      const [updatedTransaction] = await connection.execute(
        `SELECT 
          t.id, 
          t.amount, 
          t.type, 
          t.description, 
          t.transaction_date,
          t.transaction_time,
          t.balance_after,
          t.category_id,
          c.name as category_name,
          t.is_recurring,
          t.created_at
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.id = ?`,
        [transactionId]
      );

      // Log undo
      await connection.execute(
        `INSERT INTO undo_log (user_id, transaction_id, action, old_data, new_data)
         VALUES (?, ?, 'UPDATE', ?, ?)`,
        [userId, transactionId, JSON.stringify(oldData), JSON.stringify(updatedTransaction[0])]
      );

      sendSuccess(res, updatedTransaction[0], 'Transaction updated successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update transaction error:', error);
    sendError(res, 'Failed to update transaction', 500);
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    const connection = await db.getConnection();

    try {
      // Get transaction
      const [transactions] = await connection.execute(
        'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
        [transactionId, userId]
      );

      if (transactions.length === 0) {
        return sendError(res, 'Transaction not found', 404);
      }

      const oldData = transactions[0];

      // Update budget spent if this was an expense
      if (oldData.type === 'expense') {
        const [year, month] = oldData.transaction_date.split('-');
        await adjustBudgetSpent({ userId, categoryId: oldData.category_id, year, month, delta: -parseFloat(oldData.amount) });
      }

      // Delete transaction
      await connection.execute(
        'DELETE FROM transactions WHERE id = ?',
        [transactionId]
      );

      // Recalculate balances
      const [remainingTransactions] = await connection.execute(
        `SELECT id FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      if (remainingTransactions.length > 0) {
        await updateAllBalancesAfter(userId, remainingTransactions[0].id);
      }

      // Log undo
      await connection.execute(
        `INSERT INTO undo_log (user_id, transaction_id, action, old_data)
         VALUES (?, ?, 'DELETE', ?)`,
        [userId, transactionId, JSON.stringify(oldData)]
      );

      sendSuccess(res, { transactionId }, 'Transaction deleted successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete transaction error:', error);
    sendError(res, 'Failed to delete transaction', 500);
  }
};

// Undo last transaction
exports.undoLastTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;

    const connection = await db.getConnection();

    try {
      // Get last undo log entry
      const [logs] = await connection.execute(
        `SELECT * FROM undo_log WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      if (logs.length === 0) {
        return sendError(res, 'No transaction to undo', 400);
      }

      const log = logs[0];

      if (log.action === 'CREATE') {
        // Delete created transaction and adjust budget (if expense)
        const createdData = JSON.parse(log.new_data);
        await connection.execute(
          'DELETE FROM transactions WHERE id = ?',
          [log.transaction_id]
        );

        if (createdData.type === 'expense') {
          const [year, month] = createdData.transaction_date.split('-');
          await adjustBudgetSpent({ userId, categoryId: createdData.category_id, year, month, delta: -parseFloat(createdData.amount) });
        }

      } else if (log.action === 'UPDATE') {
        // Restore old data and adjust budget spent
        const oldData = JSON.parse(log.old_data);
        const newData = JSON.parse(log.new_data);

        await connection.execute(
          `UPDATE transactions 
           SET amount = ?, type = ?, description = ?, category_id = ?, transaction_date = ?, transaction_time = ?
           WHERE id = ?`,
          [oldData.amount, oldData.type, oldData.description, oldData.category_id, oldData.transaction_date, oldData.transaction_time, log.transaction_id]
        );

        // Reverse budget change: remove effect of newData and reapply oldData (if expense)
        if (newData.type === 'expense') {
          const [newYear, newMonth] = newData.transaction_date.split('-');
          await adjustBudgetSpent({ userId, categoryId: newData.category_id, year: newYear, month: newMonth, delta: -parseFloat(newData.amount) });
        }
        if (oldData.type === 'expense') {
          const [oldYear, oldMonth] = oldData.transaction_date.split('-');
          await adjustBudgetSpent({ userId, categoryId: oldData.category_id, year: oldYear, month: oldMonth, delta: parseFloat(oldData.amount) });
        }

      } else if (log.action === 'DELETE') {
        // Restore deleted transaction and update budget for expense
        const oldData = JSON.parse(log.old_data);
        await connection.execute(
          `INSERT INTO transactions 
           (user_id, category_id, amount, type, description, transaction_date, transaction_time)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [oldData.user_id, oldData.category_id, oldData.amount, oldData.type, oldData.description, oldData.transaction_date, oldData.transaction_time]
        );

        if (oldData.type === 'expense') {
          const [year, month] = oldData.transaction_date.split('-');
          await adjustBudgetSpent({ userId, categoryId: oldData.category_id, year, month, delta: parseFloat(oldData.amount) });
        }
      }

      // Recalculate balances
      const [lastTransaction] = await connection.execute(
        `SELECT id FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      if (lastTransaction.length > 0) {
        await updateAllBalancesAfter(userId, lastTransaction[0].id);
      }

      // Delete undo log entry
      await connection.execute(
        'DELETE FROM undo_log WHERE id = ?',
        [log.id]
      );

      sendSuccess(res, { message: 'Transaction undone successfully' }, 'Undo successful');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Undo transaction error:', error);
    sendError(res, 'Failed to undo transaction', 500);
  }
};

// Helper: Update all balances after transaction
const updateAllBalancesAfter = async (userId, fromTransactionId) => {
  const connection = await db.getConnection();

  try {
    // Get all transactions from the specified one, ordered properly
    const [transactions] = await connection.execute(
      `SELECT id, amount, type FROM transactions
       WHERE user_id = ? AND id >= ?
       ORDER BY transaction_date ASC, transaction_time ASC, id ASC`,
      [userId, fromTransactionId]
    );

    if (transactions.length === 0) {
      console.log('No transactions to update balances for');
      return;
    }

    // Get initial balance (before fromTransactionId)
    const [initialBalance] = await connection.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
       FROM transactions
       WHERE user_id = ? AND id < ?`,
      [userId, fromTransactionId]
    );

    let runningBalance = parseFloat(initialBalance[0]?.balance || 0);

    console.log(`Updating balances for ${transactions.length} transactions, starting balance: ${runningBalance}`);

    // Update balance for each transaction
    for (const tx of transactions) {
      runningBalance += tx.type === 'income' ? parseFloat(tx.amount) : -parseFloat(tx.amount);

      await connection.execute(
        'UPDATE transactions SET balance_after = ? WHERE id = ?',
        [runningBalance, tx.id]
      );
    }

    console.log(`Final balance after update: ${runningBalance}`);

  } finally {
    connection.release();
  }
};
