-- ============================================================
-- UANGIN - Aplikasi Buku Kas Pribadi
-- Complete Database Schema with Sample Data
-- ============================================================

-- Drop database if exists
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
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`)
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
  `amount` DECIMAL(15, 2) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `description` VARCHAR(255),
  `transaction_date` DATE NOT NULL,
  `transaction_time` TIME NOT NULL,
  `balance_after` DECIMAL(15, 2),
  `is_recurring` BOOLEAN DEFAULT FALSE,
  `recurring_id` INT,
  `attachment_path` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
  INDEX `idx_user_date` (`user_id`, `transaction_date`),
  INDEX `idx_user_datetime` (`user_id`, `transaction_date`, `transaction_time`),
  INDEX `idx_user_month` (`user_id`, `transaction_date`),
  INDEX `idx_type` (`type`),
  INDEX `idx_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== RECURRING TRANSACTIONS TABLE ====================
CREATE TABLE `recurring_transactions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `description` VARCHAR(255),
  `frequency` ENUM('monthly') DEFAULT 'monthly',
  `day_of_month` INT,
  `start_date` DATE NOT NULL,
  `end_date` DATE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_generated` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
  INDEX `idx_user_active` (`user_id`, `is_active`),
  INDEX `idx_next_date` (`user_id`, `day_of_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== BUDGETS TABLE ====================
CREATE TABLE `budgets` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `limit_amount` DECIMAL(15, 2) NOT NULL,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `spent_amount` DECIMAL(15, 2) DEFAULT 0,
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
  `action` VARCHAR(50),
  `old_data` JSON,
  `new_data` JSON,
  `action_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_timestamp` (`user_id`, `action_timestamp` DESC)
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
JOIN `categories` `c` ON `t`.`category_id` = `c`.`id`
GROUP BY `t`.`user_id`, `c`.`id`, `c`.`name`, `t`.`type`, YEAR(`t`.`transaction_date`), MONTH(`t`.`transaction_date`);

-- ============================================================
-- Database Schema Complete - Ready for Import
-- ============================================================
-- Import command:
-- mysql -u root < uangin_complete.sql
-- Or in MySQL:
-- source /path/to/uangin_complete.sql
-- ============================================================
