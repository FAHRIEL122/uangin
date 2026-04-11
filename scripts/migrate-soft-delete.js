/**
 * Migration: Add soft delete (deleted_at) to transactions table
 * Run with: npm run migrate:soft-delete
 * Or directly: node scripts/migrate-soft-delete.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔧 Running migration: Add soft delete to transactions...\n');

  try {
    // Try with .env config first
    let connection;
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'buku_kas',
        port: process.env.DB_PORT || 3306
      });
    } catch (err) {
      console.error('❌ Cannot connect to database!');
      console.error('   Error:', err.message);
      console.error('\n💡 Fix:');
      console.error('   1. Make sure MySQL is running');
      console.error('   2. Check DB_PASSWORD in .env file');
      console.error('   3. For XAMPP, DB_PASSWORD should be empty');
      console.error('\n   Or run this SQL manually in phpMyAdmin:');
      console.error('   ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;');
      console.error('   ALTER TABLE transactions ADD INDEX idx_deleted (deleted_at);\n');
      process.exit(1);
    }

    // Check if column already exists
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'deleted_at'",
      [process.env.DB_NAME || 'buku_kas']
    );

    if (columns.length > 0) {
      console.log('✅ Column "deleted_at" already exists. Nothing to do.\n');
      await connection.end();
      return;
    }

    console.log('📦 Adding "deleted_at" column to transactions table...');
    await connection.query(
      'ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL COMMENT "Soft delete timestamp"'
    );
    console.log('✅ Column added successfully!');

    // Check if index already exists
    const [indexes] = await connection.query(
      "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND INDEX_NAME = 'idx_deleted'",
      [process.env.DB_NAME || 'buku_kas']
    );

    if (indexes.length === 0) {
      console.log('📦 Adding index for deleted_at...');
      await connection.query('ALTER TABLE transactions ADD INDEX idx_deleted (deleted_at)');
      console.log('✅ Index added successfully!');
    }

    console.log('\n✨ Migration complete!\n');
    console.log('💡 All existing transactions are still active (not deleted).');
    console.log('   Deleted transactions will have deleted_at timestamp set.\n');

    await connection.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 You can also run this SQL manually in phpMyAdmin:');
    console.error('   ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;');
    console.error('   ALTER TABLE transactions ADD INDEX idx_deleted (deleted_at);\n');
    process.exit(1);
  }
}

migrate();
