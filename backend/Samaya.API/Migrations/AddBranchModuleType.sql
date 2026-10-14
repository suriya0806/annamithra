-- Migration: Add ModuleType to branches table
-- Description: Supports three branch module configurations: KMS Only, POS Only, Both POS + KMS.
-- Preserves existing branch data and defaults existing branches without a valid configuration to 'Both POS + KMS'.

-- 1. Add ModuleType column if it does not already exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'branches' 
  AND COLUMN_NAME = 'ModuleType';

SET @stmt = IF(@col_exists = 0, 
    'ALTER TABLE `branches` ADD COLUMN `ModuleType` VARCHAR(50) NOT NULL DEFAULT \'Both POS + KMS\';', 
    'SELECT \'Column ModuleType already exists\' AS Status;');
PREPARE exec_sql FROM @stmt;
EXECUTE exec_sql;
DEALLOCATE PREPARE exec_sql;

-- 2. Populate default 'Both POS + KMS' for existing branches where ModuleType is null, empty or invalid
UPDATE `branches`
SET `ModuleType` = 'Both POS + KMS'
WHERE `ModuleType` IS NULL 
   OR `ModuleType` = '' 
   OR `ModuleType` NOT IN ('KMS Only', 'POS Only', 'Both POS + KMS');
