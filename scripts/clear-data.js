require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'buku_kas';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

async function clearData() {
  let conn;
  try {
    console.log('\n🗑️  Connecting to database...');
    conn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      multipleStatements: true
    });
    
    console.log('✅ Connected\n🗑️  Clearing all data from tables...\n');

    // Disable FK checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Truncate tables in order of dependencies
    const tables = ['undo_log', 'transactions', 'budgets', 'recurring_transactions', 'categories', 'users'];
    
    for (const table of tables) {
      await conn.execute(`TRUNCATE TABLE \`${table}\``);
      console.log(`✓ Cleared: ${table}`);
    }

    // Re-enable FK checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ All data cleared successfully!');
    console.log('📊 Table structures preserved.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

clearData();
