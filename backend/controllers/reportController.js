// Report Controller
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// Get monthly summary
exports.getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      const [summary] = await connection.execute(
        `SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
          COUNT(*) as transaction_count
         FROM transactions
         WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?`,
        [userId, parseInt(year), parseInt(month)]
      );

      const summaryData = summary[0];
      const total_income = parseFloat(summaryData.total_income || 0);
      const total_expense = parseFloat(summaryData.total_expense || 0);

      sendSuccess(res, {
        month: parseInt(month),
        year: parseInt(year),
        total_income,
        total_expense,
        net_balance: total_income - total_expense,
        transaction_count: summaryData.transaction_count,
      }, 'Monthly summary fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get monthly summary error:', error);
    sendError(res, 'Failed to fetch monthly summary', 500);
  }
};

// Get transactions detail report
exports.getTransactionDetail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year, type } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      let query = `SELECT 
                    t.id,
                    t.amount,
                    t.type,
                    t.description,
                    t.transaction_date,
                    t.transaction_time,
                    c.name as category_name
                   FROM transactions t
                   JOIN categories c ON t.category_id = c.id
                   WHERE t.user_id = ? AND YEAR(t.transaction_date) = ? AND MONTH(t.transaction_date) = ?`;

      const params = [userId, parseInt(year), parseInt(month)];

      if (type && ['income', 'expense'].includes(type)) {
        query += ` AND t.type = ?`;
        params.push(type);
      }

      query += ` ORDER BY t.transaction_date DESC, t.transaction_time DESC`;

      const [transactions] = await connection.execute(query, params);

      sendSuccess(res, transactions, 'Transaction detail fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get transaction detail error:', error);
    sendError(res, 'Failed to fetch transaction detail', 500);
  }
};

// Get category summary report
exports.getCategorySummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      const [summary] = await connection.execute(
        `SELECT 
          c.id as category_id,
          c.name as category_name,
          c.type,
          COUNT(t.id) as transaction_count,
          SUM(t.amount) as total_amount
         FROM categories c
         LEFT JOIN transactions t ON c.id = t.category_id 
           AND t.user_id = ? 
           AND YEAR(t.transaction_date) = ? 
           AND MONTH(t.transaction_date) = ?
         WHERE c.user_id = ?
         GROUP BY c.id, c.name, c.type
         HAVING total_amount IS NOT NULL
         ORDER BY total_amount DESC`,
        [userId, parseInt(year), parseInt(month), userId]
      );

      sendSuccess(res, summary, 'Category summary fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get category summary error:', error);
    sendError(res, 'Failed to fetch category summary', 500);
  }
};

// Get automatic insights
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      // Insight 1: Largest expense category
      const [largestExpense] = await connection.execute(
        `SELECT 
          c.name as category_name,
          SUM(t.amount) as total_amount,
          COUNT(t.id) as transaction_count
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.type = 'expense' 
          AND YEAR(t.transaction_date) = ? AND MONTH(t.transaction_date) = ?
         GROUP BY c.id, c.name
         ORDER BY total_amount DESC
         LIMIT 1`,
        [userId, parseInt(year), parseInt(month)]
      );

      // Insight 2: Month comparison
      const currentMonthDate = `${parseInt(year)}-${String(parseInt(month)).padStart(2, '0')}-01`;
      const prevDate = new Date(currentMonthDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.getMonth() + 1;
      const prevYear = prevDate.getFullYear();

      const [currentMonthData] = await connection.execute(
        `SELECT SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
         FROM transactions
         WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?`,
        [userId, parseInt(year), parseInt(month)]
      );

      const [prevMonthData] = await connection.execute(
        `SELECT SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
         FROM transactions
         WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?`,
        [userId, prevYear, prevMonth]
      );

      const currentExpense = parseFloat(currentMonthData[0]?.expense || 0);
      const prevExpense = parseFloat(prevMonthData[0]?.expense || 0);
      let percentageChange = 0;
      let changeDirection = 'stable';

      if (prevExpense > 0) {
        percentageChange = parseFloat((((currentExpense - prevExpense) / prevExpense) * 100).toFixed(2));
        changeDirection = percentageChange > 0 ? 'up' : 'down';
      }

      // Insight 3: Top 3 expense categories
      const [topCategories] = await connection.execute(
        `SELECT 
          c.name as category_name,
          SUM(t.amount) as total_amount
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.type = 'expense' 
          AND YEAR(t.transaction_date) = ? AND MONTH(t.transaction_date) = ?
         GROUP BY c.id, c.name
         ORDER BY total_amount DESC
         LIMIT 3`,
        [userId, parseInt(year), parseInt(month)]
      );

      const insights = [];

      if (largestExpense.length > 0) {
        insights.push({
          type: 'largest_expense',
          message: `Pengeluaran terbesar bulan ini: ${largestExpense[0].category_name} (${largestExpense[0].transaction_count} transaksi)`,
          data: largestExpense[0],
        });
      }

      insights.push({
        type: 'expense_trend',
        message: `Pengeluaran ${changeDirection === 'up' ? 'naik' : 'turun'} ${Math.abs(percentageChange)}% dari bulan lalu`,
        data: {
          current_expense: currentExpense,
          previous_expense: prevExpense,
          percentage_change: percentageChange,
          direction: changeDirection,
        },
      });

      if (topCategories.length > 0) {
        insights.push({
          type: 'top_categories',
          message: `Top 3 pengeluaran: ${topCategories.map(c => c.category_name).join(', ')}`,
          data: topCategories,
        });
      }

      sendSuccess(res, { insights }, 'Insights generated successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get insights error:', error);
    sendError(res, 'Failed to generate insights', 500);
  }
};

// Get budget report
exports.getBudgetReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const connection = await db.getConnection();

    try {
      const [budgets] = await connection.execute(
        `SELECT 
          b.id,
          b.category_id,
          c.name as category_name,
          b.limit_amount,
          b.spent_amount,
          (b.limit_amount - b.spent_amount) as remaining,
          ROUND((b.spent_amount / b.limit_amount * 100), 2) as percentage_used,
          CASE 
            WHEN b.spent_amount > b.limit_amount THEN 'exceeded'
            WHEN b.spent_amount / b.limit_amount >= 0.8 THEN 'warning'
            ELSE 'ok'
          END as status
         FROM budgets b
         JOIN categories c ON b.category_id = c.id
         WHERE b.user_id = ? AND b.month = ? AND b.year = ?
         ORDER BY percentage_used DESC`,
        [userId, parseInt(month), parseInt(year)]
      );

      const report = {
        month: parseInt(month),
        year: parseInt(year),
        budgets: budgets.map(b => ({
          ...b,
          limit_amount: parseFloat(b.limit_amount),
          spent_amount: parseFloat(b.spent_amount),
          remaining: parseFloat(b.remaining),
        })),
        summary: {
          total_budgets: budgets.length,
          exceeded_count: budgets.filter(b => b.status === 'exceeded').length,
          warning_count: budgets.filter(b => b.status === 'warning').length,
          ok_count: budgets.filter(b => b.status === 'ok').length,
        },
      };

      sendSuccess(res, report, 'Budget report fetched successfully');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get budget report error:', error);
    sendError(res, 'Failed to fetch budget report', 500);
  }
};
