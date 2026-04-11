/**
 * Auto Setup Database
 * Creates database if it doesn't exist, then starts the server
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function autoSetup() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
  };

  const dbName = process.env.DB_NAME || 'buku_kas';
  const sqlPath = path.join(__dirname, '..', 'database', 'schema.sql');

  try {
    console.log('🔧 Checking database connection...');

    // Try connecting without database
    let connection;
    try {
      connection = await mysql.createConnection(config);
      console.log('✅ Connected to MySQL server');
    } catch (err) {
      console.error('❌ Cannot connect to MySQL server!');
      console.error(`   Error: ${err.message}`);
      console.error('\n💡 Make sure:');
      console.error('   1. MySQL/XAMPP is running');
      console.error('   2. Username and password in .env are correct');
      console.error('   3. Default XAMPP: user=root, password=(empty)');
      process.exit(1);
    }

    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES LIKE ?', [dbName]);

    if (databases.length === 0) {
      console.log(`📦 Database '${dbName}' not found. Creating...`);

      // Create database
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ Database created');

      // Import schema
      if (fs.existsSync(sqlPath)) {
        console.log('📄 Importing schema...');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sql);
        console.log('✅ Schema imported');
      } else {
        console.log('⚠️  Schema file not found:', sqlPath);
        console.log('   You can import it manually later via phpMyAdmin');
      }
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
    }

    await connection.end();
    console.log('✅ Database setup complete!\n');

  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    console.log('\n💡 Fix the database issue and restart the server');
    process.exit(1);
  }
}

module.exports = { autoSetup };
