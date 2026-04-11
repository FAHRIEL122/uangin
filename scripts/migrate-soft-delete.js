/**
 * Migration: Add soft delete (deleted_at) to transactions table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔧 Running migration: Add soft delete to transactions...\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'buku_kas',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Check if column already exists
    const [columns] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'deleted_at'",
      [process.env.DB_NAME || 'buku_kas']
    );

    if (columns.length > 0) {
      console.log('✅ Column "deleted_at" already exists. Nothing to do.\n');
    } else {
      console.log('📦 Adding "deleted_at" column to transactions table...');
      await pool.query(
        'ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL COMMENT "Soft delete timestamp"'
      );
      await pool.query('ALTER TABLE transactions ADD INDEX idx_deleted (deleted_at)');
      console.log('✅ Column added successfully!\n');
    }

    // Check if index already exists
    const [indexes] = await pool.query(
      "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND INDEX_NAME = 'idx_deleted'",
      [process.env.DB_NAME || 'buku_kas']
    );

    if (indexes.length === 0 && columns.length > 0) {
      console.log('📦 Adding index for deleted_at...');
      await pool.query('ALTER TABLE transactions ADD INDEX idx_deleted (deleted_at)');
      console.log('✅ Index added successfully!\n');
    }

    console.log('✨ Migration complete!\n');
    console.log('💡 All existing transactions are still active (not deleted).');
    console.log('   Deleted transactions will have deleted_at timestamp set.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
