CREATE DATABASE IF NOT EXISTS samaya_db;
USE samaya_db;

CREATE TABLE IF NOT EXISTS organizations (
    Id INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(200) NOT NULL,
    Type VARCHAR(100) NOT NULL,
    City VARCHAR(100) NOT NULL,
    Phone VARCHAR(50) NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    PRIMARY KEY (Id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS branches (
    Id INT NOT NULL AUTO_INCREMENT,
    OrganizationId INT NOT NULL,
    Name VARCHAR(200) NOT NULL,
    Code VARCHAR(50) NOT NULL,
    Address VARCHAR(500) NOT NULL,
    City VARCHAR(100) NOT NULL,
    Phone VARCHAR(50) NOT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY IX_branches_org_code (OrganizationId, Code),
    CONSTRAINT FK_branches_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
    Id INT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY IX_roles_name (Name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    Id INT NOT NULL AUTO_INCREMENT,
    OrganizationId INT NOT NULL,
    BranchId INT NULL,
    RoleId INT NOT NULL,
    Name VARCHAR(200) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    PasswordHash VARCHAR(500) NOT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY IX_users_email (Email),
    KEY IX_users_branch (BranchId),
    CONSTRAINT FK_users_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations(Id) ON DELETE CASCADE,
    CONSTRAINT FK_users_branches FOREIGN KEY (BranchId) REFERENCES branches(Id) ON DELETE SET NULL,
    CONSTRAINT FK_users_roles FOREIGN KEY (RoleId) REFERENCES roles(Id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (Id, Name) VALUES
(1, 'Super Admin'),
(2, 'Organization Admin'),
(3, 'Branch Manager'),
(4, 'Kitchen Manager'),
(5, 'Chef'),
(6, 'Inventory Manager'),
(7, 'Accountant'),
(8, 'Staff'),
(9, 'Consumer'),
(10, 'Waiter');

CREATE TABLE IF NOT EXISTS inventory_items (
    Id INT NOT NULL AUTO_INCREMENT,
    OrganizationId INT NOT NULL,
    BranchId INT NOT NULL,
    Name VARCHAR(200) NOT NULL,
    Category VARCHAR(100) NOT NULL,
    Unit VARCHAR(30) NOT NULL,
    MinimumStock DECIMAL(18,3) NOT NULL DEFAULT 0,
    CurrentStock DECIMAL(18,3) NOT NULL DEFAULT 0,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY IX_inventory_items_org_branch_name (OrganizationId, BranchId, Name),
    KEY IX_inventory_items_branch (BranchId),
    CONSTRAINT FK_inventory_items_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations(Id) ON DELETE CASCADE,
    CONSTRAINT FK_inventory_items_branches FOREIGN KEY (BranchId) REFERENCES branches(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_transactions (
    Id INT NOT NULL AUTO_INCREMENT,
    OrganizationId INT NOT NULL,
    BranchId INT NOT NULL,
    InventoryItemId INT NOT NULL,
    Type VARCHAR(40) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL,
    StockBefore DECIMAL(18,3) NOT NULL,
    StockAfter DECIMAL(18,3) NOT NULL,
    Reference VARCHAR(255) NULL,
    Notes VARCHAR(1000) NULL,
    CreatedByUserId INT NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    PRIMARY KEY (Id),
    KEY IX_stock_transactions_org_branch_date (OrganizationId, BranchId, CreatedAt),
    KEY IX_stock_transactions_item_date (InventoryItemId, CreatedAt),
    CONSTRAINT FK_stock_transactions_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations(Id) ON DELETE RESTRICT,
    CONSTRAINT FK_stock_transactions_branches FOREIGN KEY (BranchId) REFERENCES branches(Id) ON DELETE RESTRICT,
    CONSTRAINT FK_stock_transactions_inventory_items FOREIGN KEY (InventoryItemId) REFERENCES inventory_items(Id) ON DELETE CASCADE,
    CONSTRAINT FK_stock_transactions_users FOREIGN KEY (CreatedByUserId) REFERENCES users(Id) ON DELETE RESTRICT
) ENGINE=InnoDB;


-- ============================================================
-- SAMAYA GLOBAL SUPER ADMIN BOOTSTRAP
-- Login: superadmin@samaya.com
-- Password: SuperAdmin@123
-- This account can view all organizations and manage all users.
-- Organization is only a required FK anchor; authorization is global.
-- ============================================================

INSERT INTO organizations (Name, Type, City, Phone, CreatedAt)
SELECT 'SAMAYA System', 'System', 'Global', '', UTC_TIMESTAMP(6)
WHERE NOT EXISTS (
    SELECT 1 FROM organizations WHERE Name = 'SAMAYA System'
);

INSERT INTO users
    (OrganizationId, BranchId, RoleId, Name, Email, PasswordHash, IsActive, CreatedAt)
SELECT
    o.Id,
    NULL,
    1,
    'SAMAYA Super Admin',
    'superadmin@samaya.com',
    '01NbeOJIZ/PIUP7ByFkbekabj4aDvmTYNQV8uf0gSqE=',
    1,
    UTC_TIMESTAMP(6)
FROM organizations o
WHERE o.Name = 'SAMAYA System'
  AND NOT EXISTS (
      SELECT 1 FROM users WHERE Email = 'superadmin@samaya.com'
  );
