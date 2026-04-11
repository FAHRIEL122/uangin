const { pool } = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

// Monthly summary
async function getSummary(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    if (targetMonth < 1 || targetMonth > 12) {
      return badRequest(res, 'Bulan harus antara 1-12');
    }
    
    // Get summary data
    const [summary] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
      FROM transactions
      WHERE user_id = ? 
        AND MONTH(transaction_date) = ?
        AND YEAR(transaction_date) = ?`,
      [userId, targetMonth, targetYear]
    );
    
    // Get top expense categories
    const [topCategories] = await pool.query(
      `SELECT 
        c.name,
        c.icon,
        c.color,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.type = 'expense'
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total_amount DESC
      LIMIT 5`,
      [userId, targetMonth, targetYear]
    );
    
    return success(res, 'Ringkasan berhasil diambil', {
      ...summary[0],
      balance: summary[0].total_income - summary[0].total_expense,
      top_expense_categories: topCategories,
      month: targetMonth,
      year: targetYear
    });
    
  } catch (err) {
    console.error('Get summary error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil ringkasan', 500);
  }
}

// Transaction list for reports
async function getTransactionList(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year, type } = req.query;

    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    let typeFilter = '';
    const params = [userId, targetMonth, targetYear];

    if (type && ['income', 'expense'].includes(type)) {
      typeFilter = ' AND t.type = ?';
      params.push(type);
    }

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
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
        ${typeFilter}
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
      params
    );

    return success(res, 'Daftar transaksi berhasil diambil', transactions);

  } catch (err) {
    console.error('Get transaction list error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil daftar transaksi', 500);
  }
}

// Monthly trend data
async function getMonthlyTrend(req, res) {
  try {
    const userId = req.user.userId;
    const { year } = req.query;

    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const [trendData] = await pool.query(
      `SELECT
        MONTH(transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ?
        AND YEAR(transaction_date) = ?
      GROUP BY MONTH(transaction_date)
      ORDER BY month`,
      [userId, targetYear]
    );

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    // Fill in missing months with 0
    const result = monthNames.map((name, index) => {
      const monthData = trendData.find(t => t.month === index + 1);
      return {
        month_name: name,
        month: index + 1,
        income: monthData ? parseFloat(monthData.income) : 0,
        expense: monthData ? parseFloat(monthData.expense) : 0
      };
    });

    return success(res, 'Trend bulanan berhasil diambil', result);

  } catch (err) {
    console.error('Get monthly trend error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil trend bulanan', 500);
  }
}

// Top expenses
async function getTopExpenses(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year, limit = 5 } = req.query;

    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const [expenses] = await pool.query(
      `SELECT
        t.id,
        t.amount,
        t.description,
        t.transaction_date,
        c.name as category_name,
        c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.type = 'expense'
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
      ORDER BY t.amount DESC
      LIMIT ?`,
      [userId, targetMonth, targetYear, parseInt(limit)]
    );

    return success(res, 'Top pengeluaran berhasil diambil', expenses);

  } catch (err) {
    console.error('Get top expenses error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil top pengeluaran', 500);
  }
}

// Category breakdown
async function getCategoryBreakdown(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    const [categories] = await pool.query(
      `SELECT 
        c.name,
        c.type,
        c.icon,
        c.color,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.user_id = ?
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
      WHERE c.user_id = ?
      GROUP BY c.id, c.name, c.type, c.icon, c.color
      HAVING transaction_count > 0
      ORDER BY total_amount DESC`,
      [userId, targetMonth, targetYear, userId]
    );
    
    return success(res, 'Breakdown kategori berhasil diambil', categories);
    
  } catch (err) {
    console.error('Get category breakdown error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil breakdown kategori', 500);
  }
}

// Budget status
async function getBudgetStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    const [budgets] = await pool.query(
      `SELECT 
        b.id,
        b.limit_amount,
        b.spent_amount,
        (b.limit_amount - b.spent_amount) as remaining,
        CASE 
          WHEN b.limit_amount > 0 THEN (b.spent_amount / b.limit_amount * 100)
          ELSE 0 
        END as percentage,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      ORDER BY percentage DESC`,
      [userId, targetMonth, targetYear]
    );
    
    return success(res, 'Status budget berhasil diambil', budgets);
    
  } catch (err) {
    console.error('Get budget status error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil status budget', 500);
  }
}

// Auto-generated insights
async function getInsights(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    const insights = [];
    
    // Get totals
    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE user_id = ? 
        AND MONTH(transaction_date) = ?
        AND YEAR(transaction_date) = ?`,
      [userId, targetMonth, targetYear]
    );
    
    const totalIncome = parseFloat(totals[0].total_income);
    const totalExpense = parseFloat(totals[0].total_expense);
    const balance = totalIncome - totalExpense;
    
    // Insight 1: Savings rate
    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1);
      if (savingsRate >= 20) {
        insights.push({
          type: 'success',
          icon: '💰',
          message: `Bagus! Tingkat tabungan Anda ${savingsRate}% bulan ini. Pertahankan!`
        });
      } else if (savingsRate < 0) {
        insights.push({
          type: 'danger',
          icon: '⚠️',
          message: `Pengeluaran melebihi pendapatan! Defisit Rp ${Math.abs(balance).toLocaleString('id-ID')}`
        });
      }
    }
    
    // Insight 2: Top spending category
    const [topCategory] = await pool.query(
      `SELECT c.name, SUM(t.amount) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'
         AND MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC
       LIMIT 1`,
      [userId, targetMonth, targetYear]
    );
    
    if (topCategory.length > 0 && totalExpense > 0) {
      const percentage = (parseFloat(topCategory[0].total) / totalExpense * 100).toFixed(1);
      insights.push({
        type: 'info',
        icon: '📊',
        message: `${topCategory[0].name} adalah pengeluaran terbesar (${percentage}% dari total)`
      });
      
      if (percentage > 50) {
        insights.push({
          type: 'warning',
          icon: '🔍',
          message: `${percentage > 50 ? 'Lebih dari setengah' : 'Sebagian besar'} pengeluaran untuk ${topCategory[0].name}. Pertimbangkan untuk menguranginya.`
        });
      }
    }
    
    // Insight 3: Budget warnings
    const [budgetWarnings] = await pool.query(
      `SELECT c.name, b.limit_amount, b.spent_amount,
              (b.spent_amount / b.limit_amount * 100) as percentage
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ? AND b.year = ?
         AND (b.spent_amount / b.limit_amount) > 0.8`,
      [userId, targetMonth, targetYear]
    );
    
    if (budgetWarnings.length > 0) {
      budgetWarnings.forEach(budget => {
        const pct = budget.percentage.toFixed(1);
        if (budget.percentage > 100) {
          insights.push({
            type: 'danger',
            icon: '🚨',
            message: `Budget ${budget.name} telah terlampaui! (${pct}%)`
          });
        } else {
          insights.push({
            type: 'warning',
            icon: '⚡',
            message: `Budget ${budget.name} hampir habis (${pct}%)`
          });
        }
      });
    }
    
    // Insight 4: Comparison with previous month
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    
    const [prevTotals] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions
       WHERE user_id = ? 
         AND MONTH(transaction_date) = ?
         AND YEAR(transaction_date) = ?`,
      [userId, prevMonth, prevYear]
    );
    
    const prevExpense = parseFloat(prevTotals[0].total_expense);
    if (prevExpense > 0 && totalExpense > 0) {
      const change = ((totalExpense - prevExpense) / prevExpense * 100).toFixed(1);
      if (change > 10) {
        insights.push({
          type: 'warning',
          icon: '📈',
          message: `Pengeluaran naik ${change}% dibanding bulan lalu`
        });
      } else if (change < -10) {
        insights.push({
          type: 'success',
          icon: '📉',
          message: `Pengeluaran turun ${Math.abs(change)}% dibanding bulan lalu. Bagus!`
        });
      }
    }
    
    return success(res, 'Insight berhasil dibuat', { insights, month: targetMonth, year: targetYear });
    
  } catch (err) {
    console.error('Get insights error:', err.message);
    return error(res, 'Terjadi kesalahan saat membuat insight', 500);
  }
}

module.exports = {
  getSummary,
  getTransactionList,
  getCategoryBreakdown,
  getBudgetStatus,
  getInsights,
  getMonthlyTrend,
  getTopExpenses
};
