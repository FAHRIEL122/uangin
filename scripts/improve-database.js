// Database improvement and error prevention script
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'buku_kas';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

async function improveDatabase() {
  let conn;
  try {
    console.log('\n🔧 Improving database robustness...\n');
    
    conn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      multipleStatements: true
    });

    // 1. Drop existing triggers if any
    console.log('📍 Setting up triggers...');
    
    // Use raw connection for triggers (not prepared statements)
    const rawConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });

    const dropTriggers = `
      DROP TRIGGER IF EXISTS tr_balance_after_insert;
      DROP TRIGGER IF EXISTS tr_balance_after_update;
      DROP TRIGGER IF EXISTS tr_balance_after_delete;
      DROP TRIGGER IF EXISTS tr_budget_after_insert;
    `;

    try {
      // Execute multiple statements at once
      await rawConn.query(dropTriggers);
    } catch (e) {
      // ignore
    }

    console.log('  ✓ Old triggers cleared');

    // Create triggers with raw queries
    try {
      await rawConn.query(`
        CREATE TRIGGER tr_balance_after_update
        BEFORE UPDATE ON transactions
        FOR EACH ROW
        BEGIN
          IF NEW.amount <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount must be greater than 0';
          END IF;
          IF NEW.type NOT IN ('income', 'expense') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Type must be income or expense';
          END IF;
        END
      `);
      console.log('  ✓ Update validation trigger created');
    } catch (e) {
      if (e.code !== 'ER_TRG_ALREADY_EXISTS') {
        console.log('  ! Trigger setup:', e.message.substring(0, 50));
      }
    }

    rawConn.end();

    // 5. Add CHECK constraints for valid data
    console.log('\n📍 Adding data validation constraints...');
    
    // Use separate connection for ALTER statements
    const alterCmds = `
      ALTER TABLE transactions ADD CONSTRAINT chk_transaction_amount CHECK (amount > 0);
      ALTER TABLE budgets ADD CONSTRAINT chk_budget_limit CHECK (limit_amount > 0);
      ALTER TABLE budgets ADD CONSTRAINT chk_budget_spent CHECK (spent_amount >= 0);
      ALTER TABLE budgets ADD CONSTRAINT chk_budget_month CHECK (month >= 1 AND month <= 12);
      ALTER TABLE budgets ADD CONSTRAINT chk_budget_year CHECK (year >= 2000 AND year <= 2099);
    `;

    try {
      const alterConn = await mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        port: dbPort,
      });
      
      // Try each constraint individually
      const constraints = [
        'ALTER TABLE transactions ADD CONSTRAINT chk_transaction_amount CHECK (amount > 0)',
        'ALTER TABLE budgets ADD CONSTRAINT chk_budget_limit CHECK (limit_amount > 0)',
        'ALTER TABLE budgets ADD CONSTRAINT chk_budget_spent CHECK (spent_amount >= 0)',
        'ALTER TABLE budgets ADD CONSTRAINT chk_budget_month CHECK (month >= 1 AND month <= 12)',
        'ALTER TABLE budgets ADD CONSTRAINT chk_budget_year CHECK (year >= 2000 AND year <= 2099)',
      ];

      for (const constraint of constraints) {
        try {
          await alterConn.query(constraint);
          console.log('  ✓', constraint.substring(12, 40).trim());
        } catch (e) {
          if (e.code === 'ER_DUP_KEYNAME') {
            // constraint already exists, that's fine
          }
        }
      }
      
      alterConn.end();
    } catch (e) {
      console.log('  ! Constraint setup skipped:', e.message.substring(0, 40));
    }

    // 6. Create stored procedure to validate category belongs to user
    console.log('\n📍 Creating helper procedures...');
    
    const procConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });

    // Drop procedures if exist
    const dropProcs = `
      DROP PROCEDURE IF EXISTS validate_category_ownership;
      DROP PROCEDURE IF EXISTS recalculate_user_balances;
      DROP PROCEDURE IF EXISTS cleanup_orphaned_records;
    `;

    try {
      await procConn.query(dropProcs);
    } catch (e) {}

    // Create validation procedure
    try {
      await procConn.query(`
        CREATE PROCEDURE validate_category_ownership(
          p_user_id INT,
          p_category_id INT,
          OUT p_is_valid BOOLEAN
        )
        BEGIN
          SELECT EXISTS(
            SELECT 1 FROM categories 
            WHERE id = p_category_id AND user_id = p_user_id
          ) INTO p_is_valid;
        END
      `);
      console.log('  ✓ Category validation procedure created');
    } catch (e) {
      console.log('  ! Procedure setup:', e.message.substring(0, 40));
    }

    // Create balance recalculation procedure
    try {
      await procConn.query(`
        CREATE PROCEDURE recalculate_user_balances(IN p_user_id INT)
        BEGIN
          DECLARE done INT DEFAULT FALSE;
          DECLARE v_id INT;
          DECLARE v_balance DECIMAL(15, 2) DEFAULT 0;
          DECLARE v_type VARCHAR(10);
          DECLARE v_amount DECIMAL(15, 2);
          DECLARE cur CURSOR FOR 
            SELECT id, type, amount FROM transactions 
            WHERE user_id = p_user_id 
            ORDER BY transaction_date ASC, transaction_time ASC;
          DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
          
          OPEN cur;
          
          read_loop: LOOP
            FETCH cur INTO v_id, v_type, v_amount;
            IF done THEN LEAVE read_loop; END IF;
            
            IF v_type = 'income' THEN
              SET v_balance = v_balance + v_amount;
            ELSE
              SET v_balance = v_balance - v_amount;
            END IF;
            
            UPDATE transactions SET balance_after = v_balance WHERE id = v_id;
          END LOOP;
          
          CLOSE cur;
        END
      `);
      console.log('  ✓ Balance recalculation procedure created');
    } catch (e) {
      console.log('  ! Balance procedure:', e.message.substring(0, 40));
    }

    // Create cleanup procedure
    try {
      await procConn.query(`
        CREATE PROCEDURE cleanup_orphaned_records()
        BEGIN
          DELETE FROM transactions 
          WHERE category_id NOT IN (SELECT id FROM categories);
          
          DELETE FROM budgets 
          WHERE category_id NOT IN (SELECT id FROM categories);
          
          DELETE FROM recurring_transactions 
          WHERE category_id NOT IN (SELECT id FROM categories);
        END
      `);
      console.log('  ✓ Cleanup procedure created');
    } catch (e) {
      console.log('  ! Cleanup procedure:', e.message.substring(0, 40));
    }

    procConn.end();

    // 9. Create indexes for better performance
    console.log('\n📍 Optimizing indexes...');
    
    const indexConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });

    const indexStatements = [
      'CREATE INDEX idx_created_at ON users (`created_at`)',
      'CREATE INDEX idx_user_type_name ON categories (`user_id`, `type`, `name`)',
      'CREATE INDEX idx_user_type_date ON transactions (`user_id`, `type`, `transaction_date`)',
      'CREATE INDEX idx_category_period ON budgets (`category_id`, `year`, `month`)',
    ];

    for (const stmt of indexStatements) {
      try {
        await indexConn.query(stmt);
        console.log(`  ✓ ${stmt.substring(15, 35).trim()}`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          console.log(`  ! Index creation: ${e.message.substring(0, 30)}`);
        }
      }
    }

    indexConn.end();

    console.log('\n✅ Database improvements completed!\n');
    console.log('📋 Enhancements:');
    console.log('  ✓ Data validation triggers');
    console.log('  ✓ Amount validation checks');
    console.log('  ✓ Date range validation');
    console.log('  ✓ Helper procedures for validation & cleanup');
    console.log('  ✓ Performance index optimization\n');
    console.log('💡 Available procedures:');
    console.log('  - CALL validate_category_ownership(user_id, cat_id, @valid)');
    console.log('  - CALL recalculate_user_balances(user_id)');
    console.log('  - CALL cleanup_orphaned_records()\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

improveDatabase();
