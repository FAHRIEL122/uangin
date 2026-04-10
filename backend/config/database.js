// Database Configuration
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'buku_kas';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000,
  acquireTimeout: 10000,
});

const initDatabaseSchema = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    
    // Check if users table exists before trying to alter it
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [dbName]
    );
    
    if (tables.length > 0) {
      // Add photo_url column if it doesn't exist
      try {
        await connection.execute(
          'ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL AFTER phone'
        );
        console.log('✓ User profile photo column verified/added');
      } catch (err) {
        // Column might already exist, which is fine
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.warn('User photo field migration skipped:', err.message);
        }
      }
    } else {
      console.log('⚠ Users table not found. Database schema needs to be initialized.');
      console.log('  → Run: mysql -u root < database/uangin_complete.sql');
    }
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    console.error('  → Make sure MySQL is running and .env credentials are correct.');
    console.error('  → To create database, run: mysql -u root < database/uangin_complete.sql');
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

initDatabaseSchema();

module.exports = pool;

