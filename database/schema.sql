-- ============================================
-- UANGIN - Complete Database Schema v2.0.0
-- Aplikasi Buku Kas Pribadi Modern
-- ============================================
-- Fitur:
-- ✅ User Management
-- ✅ Categories (Income/Expense)
-- ✅ Transactions
-- ✅ Recurring Transactions
-- ✅ Budgets with Rollover Support
-- ✅ Transaction Tags
-- ✅ Undo Log
-- ✅ Views & Triggers
-- ✅ Performance Indexes
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS buku_kas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE buku_kas;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    photo_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, type),
    UNIQUE KEY unique_user_category (user_id, name, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. RECURRING TRANSACTIONS TABLE
-- ============================================
CREATE TABLE recurring_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT DEFAULT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT DEFAULT NULL,
    day_of_month INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_processed DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_next_process (is_active, last_processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT DEFAULT NULL,
    recurring_id INT DEFAULT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT DEFAULT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIME DEFAULT NULL,
    attachment_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (recurring_id) REFERENCES recurring_transactions(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_user_type (user_id, type),
    INDEX idx_category (category_id),
    INDEX idx_recurring (recurring_id),
    INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. BUDGETS TABLE (with Rollover Support)
-- ============================================
CREATE TABLE budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    limit_amount DECIMAL(15, 2) NOT NULL,
    spent_amount DECIMAL(15, 2) DEFAULT 0.00,
    rollover_amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Amount rolled over from previous month',
    allow_rollover BOOLEAN DEFAULT FALSE COMMENT 'Allow unused budget to roll over to next month',
    month INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category_month (user_id, category_id, month, year),
    INDEX idx_user_month_year (user_id, month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. TAGS TABLE
-- ============================================
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, name),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. TRANSACTION TAGS (Junction Table)
-- ============================================
CREATE TABLE transaction_tags (
    transaction_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. UNDO LOG TABLE
-- ============================================
CREATE TABLE undo_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_id INT NOT NULL,
    action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    old_data JSON DEFAULT NULL,
    new_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATABASE VIEWS
-- ============================================

-- Monthly Summary View
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
    user_id,
    YEAR(transaction_date) AS year,
    MONTH(transaction_date) AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
    (SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
     SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) AS balance
FROM transactions
GROUP BY user_id, YEAR(transaction_date), MONTH(transaction_date);

-- Category Summary View
CREATE OR REPLACE VIEW v_category_summary AS
SELECT 
    t.user_id,
    c.id AS category_id,
    c.name AS category_name,
    c.type AS category_type,
    c.icon,
    c.color,
    COUNT(t.id) AS transaction_count,
    SUM(t.amount) AS total_amount,
    YEAR(t.transaction_date) AS year,
    MONTH(t.transaction_date) AS month
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY t.user_id, c.id, c.name, c.type, c.icon, c.color, 
         YEAR(t.transaction_date), MONTH(t.transaction_date);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update budget spent_amount on transaction insert
DELIMITER $$
CREATE TRIGGER after_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.type = 'expense' AND NEW.category_id IS NOT NULL THEN
        UPDATE budgets 
        SET spent_amount = spent_amount + NEW.amount
        WHERE user_id = NEW.user_id 
          AND category_id = NEW.category_id
          AND month = MONTH(NEW.transaction_date)
          AND year = YEAR(NEW.transaction_date);
    END IF;
END$$
DELIMITER ;

-- Update budget spent_amount on transaction delete
DELIMITER $$
CREATE TRIGGER after_transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW
BEGIN
    IF OLD.type = 'expense' AND OLD.category_id IS NOT NULL THEN
        UPDATE budgets 
        SET spent_amount = GREATEST(0, spent_amount - OLD.amount)
        WHERE user_id = OLD.user_id 
          AND category_id = OLD.category_id
          AND month = MONTH(OLD.transaction_date)
          AND year = YEAR(OLD.transaction_date);
    END IF;
END$$
DELIMITER ;

-- Auto-calculate rollover on budget insert
DELIMITER $$
CREATE TRIGGER before_budget_insert
BEFORE INSERT ON budgets
FOR EACH ROW
BEGIN
    IF NEW.allow_rollover = TRUE THEN
        SET NEW.rollover_amount = COALESCE(
            (SELECT b.limit_amount - b.spent_amount 
             FROM budgets b 
             WHERE b.user_id = NEW.user_id 
               AND b.category_id = NEW.category_id 
               AND b.month = CASE WHEN NEW.month = 1 THEN 12 ELSE NEW.month - 1 END
               AND b.year = CASE WHEN NEW.month = 1 THEN NEW.year - 1 ELSE NEW.year END
               AND b.limit_amount > b.spent_amount),
            0
        );
    ELSE
        SET NEW.rollover_amount = 0;
    END IF;
END$$
DELIMITER ;

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_user_type_date ON transactions(user_id, type, transaction_date);

-- ============================================
-- Database initialization complete!
-- ============================================
SELECT '✅ Database buku_kas v2.0.0 created successfully!' AS message;
SELECT '📊 Tables: users, categories, transactions, recurring_transactions, budgets, tags, transaction_tags, undo_log' AS info;
SELECT '🔧 Features: Rollover budgets, Recurring transactions, Tags, Views, Triggers' AS features;
