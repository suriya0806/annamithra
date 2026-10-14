-- ==============================================================================
-- SAMAYA Kitchen & Inventory Management Module Migration
-- Target Database: samaya_db (MySQL 8.0)
-- Safe & Idempotent: Does not destroy existing tables or historical data
-- ==============================================================================

USE samaya_db;

-- 1. HELPER PROCEDURE FOR SAFE IDEMPOTENT COLUMN ADDITION
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DELIMITER $$
CREATE PROCEDURE AddColumnIfNotExists(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_def VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND COLUMN_NAME = p_column_name
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_def);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

-- 2. ITEM CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS item_categories (
    Id INT NOT NULL AUTO_INCREMENT,
    OrganizationId INT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Description VARCHAR(500) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'Active',
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY IX_item_categories_org_name (OrganizationId, Name),
    CONSTRAINT FK_item_categories_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations (Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed existing categories from inventory_items if any
INSERT IGNORE INTO item_categories (OrganizationId, Name, Description, Status, IsActive, CreatedAt)
SELECT DISTINCT OrganizationId, Category, CONCAT(Category, ' items'), 'Active', 1, UTC_TIMESTAMP(6)
FROM inventory_items
WHERE Category IS NOT NULL AND Category != '';

-- 3. EXTEND INVENTORY_ITEMS
CALL AddColumnIfNotExists('inventory_items', 'ItemCode', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('inventory_items', 'CategoryId', 'INT NULL');
CALL AddColumnIfNotExists('inventory_items', 'ReorderLevel', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('inventory_items', 'MaximumStock', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('inventory_items', 'Description', 'VARCHAR(500) NULL');
CALL AddColumnIfNotExists('inventory_items', 'UpdatedAt', 'DATETIME(6) NULL');

-- 4. EXTEND SUPPLIERS (VENDORS)
CALL AddColumnIfNotExists('suppliers', 'ContactPerson', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('suppliers', 'GstNumber', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('suppliers', 'UpdatedAt', 'DATETIME(6) NULL');

-- 5. EXTEND PURCHASES
CALL AddColumnIfNotExists('purchases', 'PurchaseNumber', 'VARCHAR(80) NULL');
CALL AddColumnIfNotExists('purchases', 'PurchaseDate', 'DATETIME(6) NULL');
CALL AddColumnIfNotExists('purchases', 'Notes', 'VARCHAR(1000) NULL');
CALL AddColumnIfNotExists('purchases', 'UpdatedAt', 'DATETIME(6) NULL');

-- 6. EXTEND PURCHASE_ITEMS
CALL AddColumnIfNotExists('purchase_items', 'Unit', 'VARCHAR(30) NULL');
CALL AddColumnIfNotExists('purchase_items', 'BatchNumber', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('purchase_items', 'ExpiryDate', 'DATETIME(6) NULL');

-- 7. EXTEND STOCK_TRANSACTIONS (STOCK MOVEMENTS AUDIT TRAIL)
CALL AddColumnIfNotExists('stock_transactions', 'SourceLocation', 'VARCHAR(200) NULL');
CALL AddColumnIfNotExists('stock_transactions', 'DestinationLocation', 'VARCHAR(200) NULL');
CALL AddColumnIfNotExists('stock_transactions', 'ReferenceType', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('stock_transactions', 'ReferenceId', 'VARCHAR(100) NULL');

-- 8. EXTEND PRODUCTION_PLANS
CALL AddColumnIfNotExists('production_plans', 'PlanNumber', 'VARCHAR(80) NULL');
CALL AddColumnIfNotExists('production_plans', 'MenuItemId', 'INT NULL');
CALL AddColumnIfNotExists('production_plans', 'PlannedQuantity', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('production_plans', 'Unit', 'VARCHAR(30) NOT NULL DEFAULT \'Portion\'');
CALL AddColumnIfNotExists('production_plans', 'UpdatedAt', 'DATETIME(6) NULL');

-- 9. EXTEND PRODUCTION_PLAN_ITEMS
CALL AddColumnIfNotExists('production_plan_items', 'Unit', 'VARCHAR(30) NULL');

-- 10. EXTEND ACTUAL_PRODUCTIONS (PRODUCTION ENTRIES)
CALL AddColumnIfNotExists('actual_productions', 'ProductionNumber', 'VARCHAR(80) NULL');
CALL AddColumnIfNotExists('actual_productions', 'MenuItemId', 'INT NULL');
CALL AddColumnIfNotExists('actual_productions', 'PlannedQuantity', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('actual_productions', 'ActualQuantity', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('actual_productions', 'WastageQuantity', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('actual_productions', 'Status', 'VARCHAR(40) NOT NULL DEFAULT \'COMPLETED\'');
CALL AddColumnIfNotExists('actual_productions', 'UpdatedAt', 'DATETIME(6) NULL');

-- 11. EXTEND ACTUAL_PRODUCTION_INGREDIENTS
CALL AddColumnIfNotExists('actual_production_ingredients', 'PlannedQuantity', 'DECIMAL(18,3) NOT NULL DEFAULT 0.000');
CALL AddColumnIfNotExists('actual_production_ingredients', 'Unit', 'VARCHAR(30) NULL');

-- 12. MATERIAL ISSUE ITEMS TABLE
CREATE TABLE IF NOT EXISTS material_issue_items (
    Id INT NOT NULL AUTO_INCREMENT,
    MaterialIssueId INT NOT NULL,
    InventoryItemId INT NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL,
    Unit VARCHAR(30) NOT NULL,
    StockBefore DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    StockAfter DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    PRIMARY KEY (Id),
    KEY IX_material_issue_items_issue (MaterialIssueId),
    KEY FK_material_issue_items_item (InventoryItemId),
    CONSTRAINT FK_material_issue_items_issue FOREIGN KEY (MaterialIssueId) REFERENCES material_issues (Id) ON DELETE CASCADE,
    CONSTRAINT FK_material_issue_items_item FOREIGN KEY (InventoryItemId) REFERENCES inventory_items (Id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. EXTEND MATERIAL_ISSUES
CALL AddColumnIfNotExists('material_issues', 'IssueNumber', 'VARCHAR(80) NULL');
CALL AddColumnIfNotExists('material_issues', 'Date', 'DATETIME(6) NULL');
CALL AddColumnIfNotExists('material_issues', 'Department', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('material_issues', 'Status', 'VARCHAR(40) NOT NULL DEFAULT \'Confirmed\'');
CALL AddColumnIfNotExists('material_issues', 'ReceivedBy', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('material_issues', 'UpdatedAt', 'DATETIME(6) NULL');

-- 14. EXTEND STOCK_TRANSFERS
CALL AddColumnIfNotExists('stock_transfers', 'TransferNumber', 'VARCHAR(80) NULL');
CALL AddColumnIfNotExists('stock_transfers', 'FromBranchId', 'INT NULL');
CALL AddColumnIfNotExists('stock_transfers', 'ToBranchId', 'INT NULL');
CALL AddColumnIfNotExists('stock_transfers', 'ApprovedByUserId', 'INT NULL');
CALL AddColumnIfNotExists('stock_transfers', 'UpdatedAt', 'DATETIME(6) NULL');

-- 15. EXTEND MENU_ITEMS
CALL AddColumnIfNotExists('menu_items', 'Code', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('menu_items', 'Unit', 'VARCHAR(30) NOT NULL DEFAULT \'Portion\'');
CALL AddColumnIfNotExists('menu_items', 'Description', 'VARCHAR(500) NULL');
CALL AddColumnIfNotExists('menu_items', 'UpdatedAt', 'DATETIME(6) NULL');

-- 16. EXTEND RECIPE_INGREDIENTS
CALL AddColumnIfNotExists('recipe_ingredients', 'Unit', 'VARCHAR(30) NULL');
CALL AddColumnIfNotExists('recipe_ingredients', 'Notes', 'VARCHAR(255) NULL');

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
