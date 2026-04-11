const { pool } = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

// Get import template (example CSV format)
function getImportTemplate(req, res) {
  const template = 'Tanggal,Tipe,Kategori,Deskripsi,Jumlah\n2026-04-11,income,Gaji,Gaji bulanan,8000000\n2026-04-11,expense,Makanan & Minuman,Makan siang,50000\n';
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="template-import-uangin.csv"');
  res.write('\uFEFF'); // BOM for Excel
  res.end(template);
}

// Import CSV transactions
async function importCSV(req, res) {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return badRequest(res, 'File CSV harus diupload');
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 2) {
      return badRequest(res, 'File CSV kosong atau tidak memiliki data');
    }

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate headers
    const requiredHeaders = ['tanggal', 'tipe', 'jumlah'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return badRequest(res, `Header CSV tidak lengkap. Harus ada: ${requiredHeaders.join(', ')}`);
    }

    // Get user categories
    const [categories] = await pool.query(
      'SELECT id, name, type FROM categories WHERE user_id = ?',
      [userId]
    );
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    });

    // Parse and validate rows
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      transactions: []
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle quoted values with commas
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      if (values.length < headers.length) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: Jumlah kolom tidak sesuai`);
        continue;
      }

      // Map values to headers
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
      });

      // Validate date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!row.tanggal || !dateRegex.test(row.tanggal)) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: Format tanggal harus YYYY-MM-DD`);
        continue;
      }

      // Validate type
      const type = row.tipe?.toLowerCase();
      if (!['income', 'expense'].includes(type)) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: Tipe harus 'income' atau 'expense'`);
        continue;
      }

      // Validate amount
      const amount = parseFloat(row.jumlah?.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: Jumlah harus angka positif`);
        continue;
      }

      // Find category
      const categoryName = row.kategori?.toLowerCase();
      let categoryId = null;
      
      if (categoryName) {
        categoryId = categoryMap[categoryName];
        
        // If not found, try to match by type
        if (!categoryId) {
          const typeCategories = categories.filter(c => c.type === type);
          if (typeCategories.length > 0) {
            categoryId = typeCategories[0].id; // Use first category of that type
          }
        }
      }

      // Insert transaction
      try {
        await pool.query(
          `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, categoryId, type, amount, row.deskripsi || null, row.tanggal]
        );
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: ${err.message}`);
      }
    }

    return success(res, `Import selesai: ${results.success} berhasil, ${results.failed} gagal`, {
      imported: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10) // Limit errors shown
    });

  } catch (err) {
    console.error('Import CSV error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengimport data', 500);
  }
}

module.exports = {
  getImportTemplate,
  importCSV
};
