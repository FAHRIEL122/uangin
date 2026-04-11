const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'buku_kas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  multipleStatements: false,
  charset: 'utf8mb4'
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database schema if needed
async function initializeSchema() {
  try {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'uangin_complete.sql');
    
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await pool.query(statement);
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists') && !err.message.includes('Duplicate key')) {
              console.error('Schema init error:', err.message);
            }
          }
        }
      }
      console.log('✅ Database schema initialized');
    }
  } catch (error) {
    console.error('❌ Schema initialization failed:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeSchema
};
