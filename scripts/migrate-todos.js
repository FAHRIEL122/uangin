/**
 * Migration: Add todos table
 * Run this to add the new todos table without affecting existing data
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔧 Running migration: Add todos table...\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'buku_kas',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Check if table already exists
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'todos'",
      [process.env.DB_NAME || 'buku_kas']
    );

    if (tables.length > 0) {
      console.log('✅ Table "todos" already exists. Nothing to do.\n');
      return;
    }

    console.log('📦 Creating todos table...');
    
    await pool.query(`
      CREATE TABLE todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        completed BOOLEAN DEFAULT FALSE,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        due_date DATE DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_completed (user_id, completed),
        INDEX idx_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table "todos" created successfully!\n');
    console.log('📊 Table structure:');
    console.log('  - id (INT, PRIMARY KEY)');
    console.log('  - user_id (INT, FOREIGN KEY → users.id)');
    console.log('  - title (VARCHAR 255)');
    console.log('  - description (TEXT)');
    console.log('  - completed (BOOLEAN, default FALSE)');
    console.log('  - priority (ENUM: low, medium, high)');
    console.log('  - due_date (DATE)');
    console.log('  - created_at, updated_at (TIMESTAMP)\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
