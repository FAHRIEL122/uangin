/**
 * Migration: Add savings_goals table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔧 Running migration: Add savings_goals table...\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'buku_kas',
    port: process.env.DB_PORT || 3306
  });

  try {
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'savings_goals'",
      [process.env.DB_NAME || 'buku_kas']
    );

    if (tables.length > 0) {
      console.log('✅ Table "savings_goals" already exists.\n');
      return;
    }

    console.log('📦 Creating savings_goals table...');
    
    await pool.query(`
      CREATE TABLE savings_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10) DEFAULT '🎯',
        target_amount DECIMAL(15, 2) NOT NULL,
        current_amount DECIMAL(15, 2) DEFAULT 0.00,
        deadline DATE DEFAULT NULL,
        color VARCHAR(7) DEFAULT '#3b82f6',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_active (user_id, is_active),
        INDEX idx_deadline (deadline)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table "savings_goals" created successfully!\n');
    console.log('📊 Table structure:');
    console.log('  - id (INT, PRIMARY KEY)');
    console.log('  - user_id (INT, FOREIGN KEY → users.id)');
    console.log('  - name (VARCHAR 100) - nama target');
    console.log('  - icon (VARCHAR 10) - emoji icon');
    console.log('  - target_amount (DECIMAL) - target nominal');
    console.log('  - current_amount (DECIMAL) - progres saat ini');
    console.log('  - deadline (DATE) - batas waktu (opsional)');
    console.log('  - color (VARCHAR 7) - warna progress bar');
    console.log('  - is_active (BOOLEAN) - status aktif\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
