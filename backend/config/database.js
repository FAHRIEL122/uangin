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
  charset: 'utf8mb4',
});

const initDatabaseSchema = async () => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL AFTER phone'
      );
      console.log('✓ User profile photo column verified');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.warn('User photo field migration skipped:', err.message);
  }
};

// Test connection
initDatabaseSchema()
  .then(() => pool.getConnection())
  .then(connection => {
    console.log('✓ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
    console.error('  → Make sure MySQL is installed, running, and .env credentials are correct.');
  });

module.exports = pool;

