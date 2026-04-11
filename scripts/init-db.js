/**
 * Database Initialization Script
 * Creates database and schema from SQL file
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
  console.log('🚀 Initializing UANGIN database...\n');
  
  // Create connection without database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true // Allow multiple statements for schema creation
  });
  
  try {
    console.log('✅ Connected to MySQL server');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'uangin_complete.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ SQL file not found:', sqlPath);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 Reading database schema...');
    
    // Execute SQL
    console.log('🔨 Creating database and schema...');
    await connection.query(sql);
    
    console.log('✅ Database schema created successfully!\n');
    console.log('📊 Database Details:');
    console.log(`   - Database: buku_kas`);
    console.log(`   - Tables: users, categories, transactions, recurring_transactions, budgets, undo_log`);
    console.log(`   - Views: v_monthly_summary, v_category_summary`);
    console.log(`   - Triggers: after_transaction_insert, after_transaction_delete\n`);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run initialization
initializeDatabase();
