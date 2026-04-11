/**
 * Sample Data Seeding Script
 * Creates demo user with sample transactions
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedData() {
  console.log('🌱 Seeding UANGIN database with sample data...\n');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'buku_kas',
    port: process.env.DB_PORT || 3306
  });
  
  try {
    // Check if demo user already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      ['demo']
    );
    
    if (existing.length > 0) {
      console.log('⚠️  Demo user already exists. Skipping seed.\n');
      console.log('💡 To reseed, run: npm run clear');
      return;
    }
    
    // Create demo user
    const passwordHash = await bcrypt.hash('Demo1234', 12);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      ['demo', 'demo@uangin.com', passwordHash, 'Demo User']
    );
    
    const userId = result.insertId;
    console.log('✅ Created demo user');
    
    // Create sample categories
    const categories = [
      [userId, 'Gaji', 'income', '💰', '#10b981'],
      [userId, 'Freelance', 'income', '💼', '#3b82f6'],
      [userId, 'Investasi', 'income', '📈', '#8b5cf6'],
      [userId, 'Bonus', 'income', '🎁', '#ec4899'],
      [userId, 'Lainnya', 'income', '💵', '#6b7280'],
      [userId, 'Makanan & Minuman', 'expense', '🍔', '#ef4444'],
      [userId, 'Transportasi', 'expense', '🚗', '#f59e0b'],
      [userId, 'Belanja', 'expense', '🛍️', '#ec4899'],
      [userId, 'Tagihan & Utilitas', 'expense', '📱', '#6366f1'],
      [userId, 'Hiburan', 'expense', '🎮', '#14b8a6'],
      [userId, 'Kesehatan', 'expense', '🏥', '#06b6d4'],
      [userId, 'Pendidikan', 'expense', '📚', '#8b5cf6'],
      [userId, 'Lainnya', 'expense', '📦', '#6b7280']
    ];
    
    await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES ?',
      [categories]
    );
    
    console.log('✅ Created 13 categories');
    
    // Get category IDs
    const [cats] = await pool.query(
      'SELECT id, name, type FROM categories WHERE user_id = ?',
      [userId]
    );
    
    const getCatId = (name) => cats.find(c => c.name === name)?.id;
    
    // Create sample transactions for current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const transactions = [
      // Income
      [userId, getCatId('Gaji'), 'income', 8000000, 'Gaji bulanan', `${year}-${String(month).padStart(2, '0')}-01`, '09:00:00'],
      [userId, getCatId('Freelance'), 'income', 2500000, 'Proyek website klien', `${year}-${String(month).padStart(2, '0')}-05`, '14:30:00'],
      [userId, getCatId('Investasi'), 'income', 500000, 'Dividen saham', `${year}-${String(month).padStart(2, '0')}-10`, '10:00:00'],
      
      // Expenses
      [userId, getCatId('Makanan & Minuman'), 'expense', 1500000, 'Belanja bulanan supermarket', `${year}-${String(month).padStart(2, '0')}-02`, '11:00:00'],
      [userId, getCatId('Transportasi'), 'expense', 300000, 'Bensin motor', `${year}-${String(month).padStart(2, '0')}-03`, '08:00:00'],
      [userId, getCatId('Tagihan & Utilitas'), 'expense', 450000, 'Listrik, air, internet', `${year}-${String(month).padStart(2, '0')}-05`, '10:00:00'],
      [userId, getCatId('Hiburan'), 'expense', 200000, 'Nonton bioskop', `${year}-${String(month).padStart(2, '0')}-07`, '19:00:00'],
      [userId, getCatId('Belanja'), 'expense', 350000, 'Baju baru', `${year}-${String(month).padStart(2, '0')}-08`, '15:00:00'],
      [userId, getCatId('Makanan & Minuman'), 'expense', 75000, 'Makan siang di kantor', `${year}-${String(month).padStart(2, '0')}-09`, '12:30:00'],
      [userId, getCatId('Kesehatan'), 'expense', 250000, 'Vitamin dan suplemen', `${year}-${String(month).padStart(2, '0')}-11`, '09:00:00'],
      [userId, getCatId('Pendidikan'), 'expense', 150000, 'Buku programming', `${year}-${String(month).padStart(2, '0')}-12`, '16:00:00'],
    ];
    
    await pool.query(
      'INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date, transaction_time) VALUES ?',
      [transactions]
    );
    
    console.log(`✅ Created ${transactions.length} sample transactions`);
    
    // Create sample budgets
    const budgets = [
      [userId, getCatId('Makanan & Minuman'), 2000000, 1500000, month, year],
      [userId, getCatId('Transportasi'), 500000, 300000, month, year],
      [userId, getCatId('Belanja'), 1000000, 350000, month, year],
      [userId, getCatId('Hiburan'), 500000, 200000, month, year],
      [userId, getCatId('Tagihan & Utilitas'), 600000, 450000, month, year]
    ];
    
    await pool.query(
      'INSERT INTO budgets (user_id, category_id, limit_amount, spent_amount, month, year) VALUES ?',
      [budgets]
    );
    
    console.log(`✅ Created ${budgets.length} budgets`);
    
    console.log('\n🎉 Sample data seeded successfully!\n');
    console.log('📝 Demo Credentials:');
    console.log('   Username: demo');
    console.log('   Password: Demo1234\n');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seed
seedData();
