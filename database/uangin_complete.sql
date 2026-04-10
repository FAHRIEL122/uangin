-- ============================================================
-- UANGIN - Aplikasi Buku Kas Pribadi
-- Complete Database Schema with Sample Data
-- ============================================================
-- WARNING: This script will drop and recreate the 'buku_kas' database!
-- All existing data will be lost. For production, remove the DROP statement below.
-- ============================================================

-- Drop database if exists (REMOVE THIS LINE IN PRODUCTION)
DROP DATABASE IF EXISTS `buku_kas`;

-- Create database
CREATE DATABASE `buku_kas` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `buku_kas`;

-- ==================== USERS TABLE ====================
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100),
  `phone` VARCHAR(20),
  `photo_url` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Note: UNIQUE constraints already create indexes, no need for explicit INDEX
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CATEGORIES TABLE ====================
CREATE TABLE `categories` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `color` VARCHAR(7),
  `is_default` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_category` (`user_id`, `name`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_type` (`user_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TRANSACTIONS TABLE ====================
CREATE TABLE `transactions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL CHECK (`amount` > 0),
  `type` ENUM('income', 'expense') NOT NULL,
  `description` VARCHAR(255),
  `transaction_date` DATE NOT NULL,
  `transaction_time` TIME NOT NULL DEFAULT '00:00:00',
  `balance_after` DECIMAL(15, 2),
  `is_recurring` BOOLEAN DEFAULT FALSE,
  `recurring_id` INT,
  `attachment_path` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`recurring_id`) REFERENCES `recurring_transactions`(`id`) ON DELETE SET NULL,
  -- Removed redundant idx_user_month (duplicate of idx_user_date)
  INDEX `idx_user_date` (`user_id`, `transaction_date`),
  INDEX `idx_user_datetime` (`user_id`, `transaction_date`, `transaction_time`),
  INDEX `idx_category` (`category_id`)
  -- Note: idx_type removed - low selectivity on ENUM with only 2 values
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== RECURRING TRANSACTIONS TABLE ====================
CREATE TABLE `recurring_transactions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL CHECK (`amount` > 0),
  `type` ENUM('income', 'expense') NOT NULL,
  `description` VARCHAR(255),
  `frequency` ENUM('daily', 'weekly', 'monthly', 'yearly') DEFAULT 'monthly',
  `day_of_month` INT CHECK (`day_of_month` IS NULL OR `day_of_month` BETWEEN 1 AND 31),
  `start_date` DATE NOT NULL,
  `end_date` DATE CHECK (`end_date` IS NULL OR `end_date` >= `start_date`),
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_generated` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
  INDEX `idx_user_active` (`user_id`, `is_active`),
  INDEX `idx_processing` (`is_active`, `last_generated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== BUDGETS TABLE ====================
CREATE TABLE `budgets` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `limit_amount` DECIMAL(15, 2) NOT NULL CHECK (`limit_amount` > 0),
  `month` INT NOT NULL CHECK (`month` BETWEEN 1 AND 12),
  `year` INT NOT NULL CHECK (`year` BETWEEN 2000 AND 2100),
  `spent_amount` DECIMAL(15, 2) DEFAULT 0 CHECK (`spent_amount` >= 0),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_category_period` (`user_id`, `category_id`, `month`, `year`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_period` (`user_id`, `year`, `month`),
  INDEX `idx_category_period` (`category_id`, `year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== UNDO LOG TABLE ====================
CREATE TABLE `undo_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `transaction_id` INT,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  `old_data` JSON,
  `new_data` JSON,
  `action_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_timestamp` (`user_id`, `action_timestamp` DESC),
  INDEX `idx_transaction` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CREATE VIEWS ====================
CREATE VIEW `v_monthly_summary` AS
SELECT
  `t`.`user_id`,
  YEAR(`t`.`transaction_date`) as `year`,
  MONTH(`t`.`transaction_date`) as `month`,
  SUM(CASE WHEN `t`.`type` = 'income' THEN `t`.`amount` ELSE 0 END) as `total_income`,
  SUM(CASE WHEN `t`.`type` = 'expense' THEN `t`.`amount` ELSE 0 END) as `total_expense`,
  SUM(CASE WHEN `t`.`type` = 'income' THEN `t`.`amount` ELSE -`t`.`amount` END) as `net_balance`
FROM `transactions` `t`
GROUP BY `t`.`user_id`, YEAR(`t`.`transaction_date`), MONTH(`t`.`transaction_date`);

CREATE VIEW `v_category_summary` AS
SELECT
  `t`.`user_id`,
  `c`.`id` as `category_id`,
  `c`.`name` as `category_name`,
  `t`.`type`,
  YEAR(`t`.`transaction_date`) as `year`,
  MONTH(`t`.`transaction_date`) as `month`,
  COUNT(`t`.`id`) as `transaction_count`,
  SUM(`t`.`amount`) as `total_amount`
FROM `transactions` `t`
JOIN `categories` `c` ON `t`.`category_id` = `c`.`id` AND `t`.`user_id` = `c`.`user_id`
GROUP BY `t`.`user_id`, `c`.`id`, `c`.`name`, `t`.`type`, YEAR(`t`.`transaction_date`), MONTH(`t`.`transaction_date`);

-- Note: balance_after is denormalized for performance.
-- Always update via updateAllBalancesAfter() to maintain consistency.

-- ============================================================
-- Database Schema Complete - Ready for Import
-- ============================================================
-- Import command:
-- mysql -u root < uangin_complete.sql
-- Or in MySQL:
-- source /path/to/uangin_complete.sql
-- ============================================================
