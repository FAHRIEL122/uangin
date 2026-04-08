const mysql = require('mysql2/promise');

async function setupDB() {
  let conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  });

  try {
    console.log('🔧 Setting up database...');
    
    // Create database
    await conn.execute('DROP DATABASE IF EXISTS `buku_kas`');
    await conn.execute('CREATE DATABASE `buku_kas` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Database created');

    // Close and reconnect to new database
    await conn.end();
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'buku_kas'
    });

    // Create users table
    await conn.execute(`
      CREATE TABLE \`users\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`username\` VARCHAR(50) UNIQUE NOT NULL,
        \`email\` VARCHAR(100) UNIQUE NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`full_name\` VARCHAR(100),
        \`phone\` VARCHAR(20),
        \`photo_url\` VARCHAR(255),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_username\` (\`username\`),
        INDEX \`idx_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ users table created');

    // Create categories table
    await conn.execute(`
      CREATE TABLE \`categories\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`name\` VARCHAR(50) NOT NULL,
        \`type\` ENUM('income', 'expense') NOT NULL,
        \`color\` VARCHAR(7),
        \`is_default\` BOOLEAN DEFAULT FALSE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_user_category\` (\`user_id\`, \`name\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_user_type\` (\`user_id\`, \`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ categories table created');

    // Create transactions table
    await conn.execute(`
      CREATE TABLE \`transactions\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`category_id\` INT NOT NULL,
        \`amount\` DECIMAL(15, 2) NOT NULL,
        \`type\` ENUM('income', 'expense') NOT NULL,
        \`description\` VARCHAR(255),
        \`transaction_date\` DATE NOT NULL,
        \`transaction_time\` TIME NOT NULL,
        \`balance_after\` DECIMAL(15, 2),
        \`is_recurring\` BOOLEAN DEFAULT FALSE,
        \`recurring_id\` INT,
        \`attachment_path\` VARCHAR(255),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT,
        INDEX \`idx_user_date\` (\`user_id\`, \`transaction_date\`),
        INDEX \`idx_user_datetime\` (\`user_id\`, \`transaction_date\`, \`transaction_time\`),
        INDEX \`idx_type\` (\`type\`),
        INDEX \`idx_category\` (\`category_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ transactions table created');

    // Create recurring_transactions table
    await conn.execute(`
      CREATE TABLE \`recurring_transactions\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`category_id\` INT NOT NULL,
        \`amount\` DECIMAL(15, 2) NOT NULL,
        \`type\` ENUM('income', 'expense') NOT NULL,
        \`description\` VARCHAR(255),
        \`frequency\` ENUM('monthly') DEFAULT 'monthly',
        \`day_of_month\` INT,
        \`start_date\` DATE NOT NULL,
        \`end_date\` DATE,
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`last_generated\` DATE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT,
        INDEX \`idx_user_active\` (\`user_id\`, \`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ recurring_transactions table created');

    // Create budgets table
    await conn.execute(`
      CREATE TABLE \`budgets\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`category_id\` INT NOT NULL,
        \`limit_amount\` DECIMAL(15, 2) NOT NULL,
        \`month\` INT NOT NULL,
        \`year\` INT NOT NULL,
        \`spent_amount\` DECIMAL(15, 2) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_user_category_period\` (\`user_id\`, \`category_id\`, \`month\`, \`year\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_user_period\` (\`user_id\`, \`year\`, \`month\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ budgets table created');

    // Create undo_log table
    await conn.execute(`
      CREATE TABLE \`undo_log\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`transaction_id\` INT,
        \`action\` VARCHAR(50),
        \`old_data\` JSON,
        \`new_data\` JSON,
        \`action_timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_user_timestamp\` (\`user_id\`, \`action_timestamp\` DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ undo_log table created');

    // Create views
    await conn.execute(`
      CREATE VIEW \`v_monthly_summary\` AS
      SELECT 
        \`t\`.\`user_id\`,
        YEAR(\`t\`.\`transaction_date\`) as \`year\`,
        MONTH(\`t\`.\`transaction_date\`) as \`month\`,
        SUM(CASE WHEN \`t\`.\`type\` = 'income' THEN \`t\`.\`amount\` ELSE 0 END) as \`total_income\`,
        SUM(CASE WHEN \`t\`.\`type\` = 'expense' THEN \`t\`.\`amount\` ELSE 0 END) as \`total_expense\`,
        SUM(CASE WHEN \`t\`.\`type\` = 'income' THEN \`t\`.\`amount\` ELSE -\`t\`.\`amount\` END) as \`net_balance\`
      FROM \`transactions\` \`t\`
      GROUP BY \`t\`.\`user_id\`, YEAR(\`t\`.\`transaction_date\`), MONTH(\`t\`.\`transaction_date\`)
    `);
    console.log('✅ v_monthly_summary view created');

    await conn.execute(`
      CREATE VIEW \`v_category_summary\` AS
      SELECT 
        \`t\`.\`user_id\`,
        \`c\`.\`id\` as \`category_id\`,
        \`c\`.\`name\` as \`category_name\`,
        \`t\`.\`type\`,
        YEAR(\`t\`.\`transaction_date\`) as \`year\`,
        MONTH(\`t\`.\`transaction_date\`) as \`month\`,
        COUNT(\`t\`.\`id\`) as \`transaction_count\`,
        SUM(\`t\`.\`amount\`) as \`total_amount\`
      FROM \`transactions\` \`t\`
      JOIN \`categories\` \`c\` ON \`t\`.\`category_id\` = \`c\`.\`id\`
      GROUP BY \`t\`.\`user_id\`, \`c\`.\`id\`, \`c\`.\`name\`, \`t\`.\`type\`, YEAR(\`t\`.\`transaction_date\`), MONTH(\`t\`.\`transaction_date\`)
    `);
    console.log('✅ v_category_summary view created');

    console.log('\n🎉 Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

setupDB();
