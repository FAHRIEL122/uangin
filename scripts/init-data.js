// Initialize default data: demo user and categories
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'buku_kas';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

async function initializeData() {
  let conn;
  try {
    console.log('\n📊 Initializing default data...\n');
    
    conn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });

    // Create demo user
    const demoUsername = 'demo';
    const demoPassword = 'demo1234';
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    const [result] = await conn.execute(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [demoUsername, 'demo@uangin.local', hashedPassword, 'Demo User']
    );

    const userId = result.insertId;
    console.log(`✓ Demo user created: ${demoUsername} / ${demoPassword}`);

    // Default income categories
    const incomeCategories = [
      { name: 'Gaji', color: '#10b981', is_default: true },
      { name: 'Bonus', color: '#059669', is_default: true },
      { name: 'Investasi', color: '#0891b2', is_default: true },
      { name: 'Lainnya (Pemasukan)', color: '#6b7280', is_default: true },
    ];

    // Default expense categories
    const expenseCategories = [
      { name: 'Makanan', color: '#ef4444', is_default: true },
      { name: 'Transport', color: '#f97316', is_default: true },
      { name: 'Utilitas', color: '#eab308', is_default: true },
      { name: 'Hiburan', color: '#8b5cf6', is_default: true },
      { name: 'Kesehatan', color: '#06b6d4', is_default: true },
      { name: 'Lainnya (Pengeluaran)', color: '#6b7280', is_default: true },
    ];

    // Insert income categories
    for (const cat of incomeCategories) {
      await conn.execute(
        'INSERT INTO categories (user_id, name, type, color, is_default) VALUES (?, ?, ?, ?, ?)',
        [userId, cat.name, 'income', cat.color, cat.is_default]
      );
    }
    console.log(`✓ ${incomeCategories.length} income categories created`);

    // Insert expense categories
    for (const cat of expenseCategories) {
      await conn.execute(
        'INSERT INTO categories (user_id, name, type, color, is_default) VALUES (?, ?, ?, ?, ?)',
        [userId, cat.name, 'expense', cat.color, cat.is_default]
      );
    }
    console.log(`✓ ${expenseCategories.length} expense categories created`);

    // Add sample transactions (this month)
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();

    const [incomeResult] = await conn.execute(
      'SELECT id FROM categories WHERE user_id = ? AND type = ? AND name = ? LIMIT 1',
      [userId, 'income', 'Gaji']
    );

    const [expenseFood] = await conn.execute(
      'SELECT id FROM categories WHERE user_id = ? AND type = ? AND name = ? LIMIT 1',
      [userId, 'expense', 'Makanan']
    );

    const [expenseTransport] = await conn.execute(
      'SELECT id FROM categories WHERE user_id = ? AND type = ? AND name = ? LIMIT 1',
      [userId, 'expense', 'Transport']
    );

    if (incomeResult.length > 0) {
      const incomeCatId = incomeResult[0].id;
      await conn.execute(
        'INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, incomeCatId, 5000000, 'income', 'Gaji bulan ini', `${currentYear}-${currentMonth}-01`, '09:00:00']
      );
      console.log('✓ Sample income transaction added');
    }

    if (expenseFood.length > 0) {
      const foodCatId = expenseFood[0].id;
      await conn.execute(
        'INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, foodCatId, 50000, 'expense', 'Makan siang', `${currentYear}-${currentMonth}-05`, '12:30:00']
      );
      console.log('✓ Sample expense transaction (food) added');
    }

    if (expenseTransport.length > 0) {
      const transportCatId = expenseTransport[0].id;
      await conn.execute(
        'INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, transportCatId, 30000, 'expense', 'Bensin', `${currentYear}-${currentMonth}-08`, '07:15:00']
      );
      console.log('✓ Sample expense transaction (transport) added');
    }

    // Update balance_after for transactions
    const [transactions] = await conn.execute(
      'SELECT id, amount, type FROM transactions WHERE user_id = ? ORDER BY transaction_date, transaction_time',
      [userId]
    );

    let balance = 0;
    for (const txn of transactions) {
      if (txn.type === 'income') {
        balance += parseFloat(txn.amount);
      } else {
        balance -= parseFloat(txn.amount);
      }
      await conn.execute(
        'UPDATE transactions SET balance_after = ? WHERE id = ?',
        [balance, txn.id]
      );
    }
    console.log('✓ Transaction balances calculated');

    console.log('\n✅ Database initialization complete!\n');
    console.log('📝 Demo Credentials:');
    console.log(`   Username: ${demoUsername}`);
    console.log(`   Password: ${demoPassword}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

initializeData();
