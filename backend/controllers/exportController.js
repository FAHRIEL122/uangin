const { pool } = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

// Export to CSV
async function exportCSV(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    // Get transactions
    const [transactions] = await pool.query(
      `SELECT 
        t.transaction_date,
        t.transaction_time,
        t.type,
        t.amount,
        t.description,
        c.name as category_name,
        c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND MONTH(t.transaction_date) = ?
        AND YEAR(t.transaction_date) = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [userId, targetMonth, targetYear]
    );
    
    if (transactions.length === 0) {
      return badRequest(res, 'Tidak ada data untuk diekspor');
    }
    
    // Create CSV content
    const headers = ['Tanggal', 'Waktu', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah'];
    const rows = transactions.map(t => [
      t.transaction_date,
      t.transaction_time || '-',
      t.type === 'income' ? 'Pendapatan' : 'Pengeluaran',
      t.category_name || '-',
      `"${(t.description || '-').replace(/"/g, '""')}"`,
      t.amount
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="uangin-export-${targetYear}-${String(targetMonth).padStart(2, '0')}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Add BOM for Excel compatibility
    res.write('\uFEFF');
    res.end(csvContent);
    
  } catch (err) {
    console.error('Export CSV error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengekspor data', 500);
  }
}

// Export to Excel (XML format)
async function exportExcel(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
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
      ORDER BY t.transaction_date DESC`,
      [userId, targetMonth, targetYear]
    );
    
    if (transactions.length === 0) {
      return badRequest(res, 'Tidak ada data untuk diekspor');
    }
    
    // Create Excel XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Worksheet ss:Name="Transaksi">\n';
    xml += '<Table>\n';
    
    // Header row
    xml += '<Row>\n';
    ['Tanggal', 'Waktu', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah'].forEach(header => {
      xml += `<Cell><Data ss:Type="String">${header}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
    
    // Data rows
    transactions.forEach(t => {
      xml += '<Row>\n';
      xml += `<Cell><Data ss:Type="String">${t.transaction_date}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.transaction_time || '-'}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.category_name || '-'}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${t.description || '-'}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="Number">${t.amount}</Data></Cell>\n`;
      xml += '</Row>\n';
    });
    
    xml += '</Table>\n</Worksheet>\n</Workbook>';
    
    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="uangin-export-${targetYear}-${String(targetMonth).padStart(2, '0')}.xls"`);
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
