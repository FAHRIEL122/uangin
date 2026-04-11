/**
 * MySQL Setup Script
 * Creates database and user with proper credentials
 */

const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function setup() {
  console.log('🔧 MySQL Setup for UANGIN\n');
  console.log('This will create the database and update your .env file\n');

  const dbUser = await ask('MySQL username (default: root): ') || 'root';
  const dbPassword = await ask('MySQL password (leave empty if none): ');
  const dbName = await ask('Database name (default: buku_kas): ') || 'buku_kas';
  const dbHost = 'localhost';
  const dbPort = 3306;

  rl.close();

  console.log('\n📡 Connecting to MySQL...');

  try {
    // Connect without database
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      port: dbPort
    });

    console.log('✅ Connected to MySQL\n');

    // Create database
    console.log(`📦 Creating database '${dbName}'...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Database created\n');

    // Show grants
    const [grants] = await connection.query(`SHOW GRANTS FOR '${dbUser}'@'localhost'`);
    console.log('🔑 User grants:');
    grants.forEach(g => console.log(`   ${Object.values(g)[0]}`));

    await connection.end();

    // Update .env file
    console.log('\n💾 Updating .env file...');
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');

    const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=${dbHost}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_NAME=${dbName}
DB_PORT=${dbPort}

# JWT Configuration
JWT_SECRET=uangin-secret-key-${Date.now()}-${Math.random().toString(36).substring(7)}
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated\n');

    console.log('🎉 MySQL setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Import schema: Open phpMyAdmin and import database/schema.sql');
    console.log('   2. Start app: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Tips:');
    console.log('   - Default XAMPP: username=root, password=(empty)');
    console.log('   - Default Laragon: username=root, password=(empty)');
    console.log('   - Default MySQL: username=root, password=root');
    console.log('   - If you forgot password, reset via MySQL installer or services\n');
    process.exit(1);
  }
}

setup();
