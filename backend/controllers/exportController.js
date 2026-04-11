const { pool } = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

// Export to CSV (Google Sheets compatible)
async function exportCSV(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Get transactions
    const [transactions] = await pool.query(
      `SELECT
        t.transaction_date,
        t.transaction_time,
        t.type,
        t.amount,
        t.description,
        c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
        AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.transaction_time DESC`,
      [userId, targetMonth, targetYear]
    );

    if (transactions.length === 0) {
      return badRequest(res, 'Tidak ada data untuk diekspor');
    }

    // Create CSV with separate income/expense columns
    const headers = ['Tanggal', 'Waktu', 'Kategori', 'Deskripsi', 'Pendapatan', 'Pengeluaran'];
    const rows = transactions.map(t => {
      const income = t.type === 'income' ? t.amount : '';
      const expense = t.type === 'expense' ? t.amount : '';
      return [
        t.transaction_date,
        t.transaction_time || '-',
        `"${(t.category_name || '-').replace(/"/g, '""')}"`,
        `"${(t.description || '-').replace(/"/g, '""')}"`,
        income,
        expense
      ];
    });

    // Add summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const balance = totalIncome - totalExpense;

    rows.push([]);
    rows.push(['', '', '', 'TOTAL PENDAPATAN', totalIncome, '']);
    rows.push(['', '', '', 'TOTAL PENGELUARAN', '', totalExpense]);
    rows.push(['', '', '', 'SALDO', balance, '']);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Set response headers for CSV download (Google Sheets compatible)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="UANGIN-${monthNames[targetMonth - 1]}-${targetYear}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Add BOM for Excel/Google Sheets compatibility
    res.write('\uFEFF');
    res.end(csvContent);

  } catch (err) {
    console.error('Export CSV error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengekspor data', 500);
  }
}

// Export to Excel (XML format with better formatting)
async function exportExcel(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Get transactions
    const [transactions] = await pool.query(
      `SELECT
        t.transaction_date,
        t.transaction_time,
        t.type,
        t.amount,
        t.description,
        c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
        AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.transaction_time DESC`,
      [userId, targetMonth, targetYear]
    );

    if (transactions.length === 0) {
      return badRequest(res, 'Tidak ada data untuk diekspor');
    }

    // Create Excel XML with better formatting
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    
    // Styles
    xml += '<Styles>\n';
    xml += '<Style ss:ID="header"><Font ss:Bold="1" ss:Size="12"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style>\n';
    xml += '<Style ss:ID="income"><NumberFormat ss:Format="#,##0"/><Font ss:Color="#10B981"/></Style>\n';
    xml += '<Style ss:ID="expense"><NumberFormat ss:Format="#,##0"/><Font ss:Color="#EF4444"/></Style>\n';
    xml += '<Style ss:ID="total"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>\n';
    xml += '</Styles>\n';
    
    xml += '<Worksheet ss:Name="Transaksi">\n';
    xml += '<Table>\n';
    
    // Title row
    xml += '<Row ss:Height="25"><Cell ss:MergeAcross="5"><Data ss:Type="String">Laporan Keuangan UANGIN - ' + monthNames[targetMonth - 1] + ' ' + targetYear + '</Data></Cell></Row>\n';
    xml += '<Row ss:Height="10"></Row>\n';

    // Header row
    xml += '<Row ss:Height="20">\n';
    ['Tanggal', 'Waktu', 'Kategori', 'Deskripsi', 'Pendapatan', 'Pengeluaran'].forEach(header => {
      xml += `<Cell ss:StyleID="header"><Data ss:Type="String">${header}</Data></Cell>\n`;
    });
    xml += '</Row>\n';

    // Data rows
    transactions.forEach(t => {
      xml += '<Row>\n';
      xml += `<Cell><Data ss:Type="String">${t.transaction_date}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.transaction_time || '-'}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.category_name || '-'}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.description || '-'}</Data></Cell>\n`;
      
      if (t.type === 'income') {
        xml += `<Cell ss:StyleID="income"><Data ss:Type="Number">${t.amount}</Data></Cell>\n`;
        xml += `<Cell><Data ss:Type="String"></Data></Cell>\n`;
      } else {
        xml += `<Cell><Data ss:Type="String"></Data></Cell>\n`;
        xml += `<Cell ss:StyleID="expense"><Data ss:Type="Number">${t.amount}</Data></Cell>\n`;
      }
      xml += '</Row>\n';
    });

    // Summary rows
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const balance = totalIncome - totalExpense;

    xml += '<Row ss:Height="5"></Row>\n';
    xml += `<Row><Cell ss:MergeAcross="3"><Data ss:Type="String">TOTAL PENDAPATAN</Data></Cell><Cell ss:StyleID="total"><Data ss:Type="Number">${totalIncome}</Data></Cell><Cell></Cell></Row>\n`;
    xml += `<Row><Cell ss:MergeAcross="3"><Data ss:Type="String">TOTAL PENGELUARAN</Data></Cell><Cell></Cell><Cell ss:StyleID="total"><Data ss:Type="Number">${totalExpense}</Data></Cell></Row>\n`;
    xml += `<Row><Cell ss:MergeAcross="3"><Data ss:Type="String">SALDO</Data></Cell><Cell ss:StyleID="total"><Data ss:Type="Number">${balance}</Data></Cell><Cell></Cell></Row>\n`;

    xml += '</Table>\n</Worksheet>\n</Workbook>';

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="UANGIN-${monthNames[targetMonth - 1]}-${targetYear}.xls"`);
    res.setHeader('Cache-Control', 'no-cache');

    res.end(xml);

  } catch (err) {
    console.error('Export Excel error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengekspor data', 500);
  }
}

module.exports = {
  exportCSV,
  exportExcel
};
