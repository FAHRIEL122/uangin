const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  // Create connection to MySQL server (without database)
  let connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔧 Creating database from scratch...');
    
    // Drop existing database
    await connection.execute(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME || 'buku_kas'}\``);
    console.log('✅ Old database dropped');

    // Create new database
    await connection.execute(`CREATE DATABASE \`${process.env.DB_NAME || 'buku_kas'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ New database created');

    // Close old connection and create new one without a default database
    await connection.end();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true,
    });

    // Read SQL schema file
    const sqlFile = path.join(__dirname, '..', 'database', 'uangin_complete.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute the full SQL schema file in one call
    try {
      await connection.query(sql);
    } catch (error) {
      console.error('❌ Error importing SQL schema:', error.message);
      throw error;
    }

    console.log('✅ All tables created successfully!');
    console.log('\n📋 Database Structure:');
    console.log('  ✓ users');
    console.log('  ✓ categories');
    console.log('  ✓ transactions');
    console.log('  ✓ recurring_transactions');
    console.log('  ✓ budgets');
    console.log('  ✓ undo_log');
    console.log('  ✓ v_monthly_summary (view)');
    console.log('  ✓ v_category_summary (view)');

    console.log('\n🎉 Database initialization complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Load .env
require('dotenv').config();
initializeDatabase();
