-- ============================================================
-- UANGIN - Database Migration Script
-- Fix Transaction Table Issues & Add Missing Constraints
-- Date: April 10, 2026
-- ============================================================
-- Run this on existing database to apply all schema fixes
-- ============================================================

USE `buku_kas`;

-- ==================== FIX 1: Add missing indexes ====================
-- Add index on undo_log.transaction_id if not exists
ALTER TABLE `undo_log`
  ADD INDEX IF NOT EXISTS `idx_transaction` (`transaction_id`);

-- Add index for recurring transactions processing
ALTER TABLE `recurring_transactions`
  ADD INDEX IF NOT EXISTS `idx_processing` (`is_active`, `last_generated`);

-- ==================== FIX 2: Add foreign key for recurring_id ====================
-- First check if constraint already exists
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'buku_kas'
    AND TABLE_NAME = 'transactions'
    AND CONSTRAINT_NAME = 'fk_recurring_transaction'
);

SET @sql = IF(@constraint_exists = 0,
  'ALTER TABLE `transactions` ADD CONSTRAINT `fk_recurring_transaction` FOREIGN KEY (`recurring_id`) REFERENCES `recurring_transactions`(`id`) ON DELETE SET NULL',
  'SELECT "Foreign key fk_recurring_transaction already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================== FIX 3: Add CHECK constraints (MySQL 8.0.16+) ====================

-- Transactions amount must be positive
ALTER TABLE `transactions`
  ADD CONSTRAINT `chk_transaction_amount` CHECK (`amount` > 0);

-- Recurring transaction amount must be positive
ALTER TABLE `recurring_transactions`
  ADD CONSTRAINT `chk_recurring_amount` CHECK (`amount` > 0);

-- Budget validations
ALTER TABLE `budgets`
  ADD CONSTRAINT `chk_budget_limit` CHECK (`limit_amount` > 0),
  ADD CONSTRAINT `chk_budget_spent` CHECK (`spent_amount` >= 0),
  ADD CONSTRAINT `chk_budget_month` CHECK (`month` BETWEEN 1 AND 12),
  ADD CONSTRAINT `chk_budget_year` CHECK (`year` BETWEEN 2000 AND 2100);

-- Recurring transaction validations
ALTER TABLE `recurring_transactions`
  ADD CONSTRAINT `chk_day_of_month` CHECK (`day_of_month` IS NULL OR `day_of_month` BETWEEN 1 AND 31),
  ADD CONSTRAINT `chk_recurring_dates` CHECK (`end_date` IS NULL OR `end_date` >= `start_date`);

-- ==================== FIX 4: Remove redundant indexes ====================
-- Remove duplicate index idx_user_month (same as idx_user_date)
ALTER TABLE `transactions` DROP INDEX IF EXISTS `idx_user_month`;

-- Remove low-selectivity index on type ENUM
ALTER TABLE `transactions` DROP INDEX IF EXISTS `idx_type`;

-- Remove redundant indexes on UNIQUE columns
ALTER TABLE `users` DROP INDEX IF EXISTS `idx_username`;
ALTER TABLE `users` DROP INDEX IF EXISTS `idx_email`;

-- ============================================================
-- Migration Complete
-- ============================================================
-- Verify changes:
-- SHOW CREATE TABLE transactions;
-- SHOW CREATE TABLE budgets;
-- SHOW CREATE TABLE recurring_transactions;
-- SELECT * FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'buku_kas';
-- ============================================================
