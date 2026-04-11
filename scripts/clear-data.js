/**
 * Clear Data Script
 * Removes all data from database (for development only)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearData() {
  console.log('⚠️  Clearing all data from UANGIN database...\n');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'buku_kas',
    port: process.env.DB_PORT || 3306
  });
  
  try {
    console.log('🗑️  Deleting all data in reverse order...\n');
    
    // Delete in correct order (respecting foreign keys)
    const tables = [
      'undo_log',
      'transactions',
      'recurring_transactions',
      'budgets',
      'categories',
      'users'
    ];
    
    for (const table of tables) {
      const [result] = await pool.query(`DELETE FROM ${table}`);
      console.log(`✅ Deleted ${result.affectedRows} rows from ${table}`);
    }
    
    console.log('\n🎉 All data cleared successfully!');
    console.log('💡 You can now run: npm run seed\n');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Confirm before clearing
const args = process.argv.slice(2);
if (args.includes('--force') || args.includes('-f')) {
  clearData();
} else {
  console.log('⚠️  This will delete ALL data from the database!');
  console.log('💡 Run with --force or -f flag to confirm:\n');
  console.log('   npm run clear -- --force\n');
  process.exit(1);
}
