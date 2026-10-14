using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Samaya.API.Data;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddOpenApi();

builder.Services.AddDbContext<SamayaDbContext>(options =>
{
    options.UseMySQL(
        builder.Configuration.GetConnectionString("DefaultConnection")!
    );
});

builder.Services.AddScoped<Samaya.API.Services.RecipeStockService>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is missing.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("JWT Issuer is missing.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("JWT Audience is missing.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        ),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetIsOriginAllowed(origin =>
                origin.StartsWith("http://localhost:"));
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// The project can be added to an existing SAMAYA database without requiring
// the user to manually create an EF migration for the inventory module.
// These idempotent statements only create the missing inventory tables.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SamayaDbContext>();
    await db.Database.EnsureCreatedAsync();
    await EnsureInventorySchemaAsync(db);
    await EnsureKitchenSchemaAsync(db);
}

app.Run();

static async Task EnsureInventorySchemaAsync(SamayaDbContext db)
{
    await db.Database.ExecuteSqlRawAsync("""
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
            CONSTRAINT FK_inventory_items_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations (Id) ON DELETE CASCADE,
            CONSTRAINT FK_inventory_items_branches FOREIGN KEY (BranchId) REFERENCES branches (Id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
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
            CONSTRAINT FK_stock_transactions_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations (Id) ON DELETE RESTRICT,
            CONSTRAINT FK_stock_transactions_branches FOREIGN KEY (BranchId) REFERENCES branches (Id) ON DELETE RESTRICT,
            CONSTRAINT FK_stock_transactions_inventory_items FOREIGN KEY (InventoryItemId) REFERENCES inventory_items (Id) ON DELETE CASCADE,
            CONSTRAINT FK_stock_transactions_users FOREIGN KEY (CreatedByUserId) REFERENCES users (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);
        await db.Database.ExecuteSqlRawAsync("""
        INSERT IGNORE INTO roles (Id, Name) VALUES (10, 'Waiter');
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS menu_items (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            Name VARCHAR(200) NOT NULL,
            Category VARCHAR(100) NOT NULL,
            Price DECIMAL(18,2) NOT NULL DEFAULT 0,
            IsActive TINYINT(1) NOT NULL DEFAULT 1,
            ImageUrl VARCHAR(2000) NULL,
            CreatedAt DATETIME(6) NOT NULL,
            PRIMARY KEY (Id),
            UNIQUE KEY IX_menu_items_org_branch_name (OrganizationId, BranchId, Name),
            KEY IX_menu_items_branch (BranchId),
            CONSTRAINT FK_menu_items_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations (Id) ON DELETE CASCADE,
            CONSTRAINT FK_menu_items_branches FOREIGN KEY (BranchId) REFERENCES branches (Id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS recipe_ingredients (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            MenuItemId INT NOT NULL,
            InventoryItemId INT NOT NULL,
            Quantity DECIMAL(18,3) NOT NULL,
            PRIMARY KEY (Id),
            UNIQUE KEY IX_recipe_menu_inventory (MenuItemId, InventoryItemId),
            KEY IX_recipe_branch (BranchId),
            CONSTRAINT FK_recipe_menu FOREIGN KEY (MenuItemId) REFERENCES menu_items (Id) ON DELETE CASCADE,
            CONSTRAINT FK_recipe_inventory FOREIGN KEY (InventoryItemId) REFERENCES inventory_items (Id) ON DELETE RESTRICT,
            CONSTRAINT FK_recipe_branch FOREIGN KEY (BranchId) REFERENCES branches (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS orders (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            OrderNumber VARCHAR(80) NOT NULL,
            TableNumber VARCHAR(50) NULL,
            WaiterId INT NOT NULL,
            Status VARCHAR(30) NOT NULL,
            TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
            InventoryApplied TINYINT(1) NOT NULL DEFAULT 0,
            CreatedAt DATETIME(6) NOT NULL,
            ReadyAt DATETIME(6) NULL,
            ServedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            UNIQUE KEY IX_orders_number (OrderNumber),
            KEY IX_orders_branch_status_date (OrganizationId, BranchId, Status, CreatedAt),
            CONSTRAINT FK_orders_organizations FOREIGN KEY (OrganizationId) REFERENCES organizations (Id) ON DELETE RESTRICT,
            CONSTRAINT FK_orders_branches FOREIGN KEY (BranchId) REFERENCES branches (Id) ON DELETE RESTRICT,
            CONSTRAINT FK_orders_waiter FOREIGN KEY (WaiterId) REFERENCES users (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS order_items (
            Id INT NOT NULL AUTO_INCREMENT,
            OrderId INT NOT NULL,
            MenuItemId INT NOT NULL,
            MenuItemName VARCHAR(200) NOT NULL,
            Quantity DECIMAL(18,3) NOT NULL,
            UnitPrice DECIMAL(18,2) NOT NULL,
            LineTotal DECIMAL(18,2) NOT NULL,
            KOTId INT NULL,
            KOTNumber VARCHAR(50) NULL,
            CreatedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            KEY IX_order_items_order (OrderId),
            CONSTRAINT FK_order_items_order FOREIGN KEY (OrderId) REFERENCES orders (Id) ON DELETE CASCADE,
            CONSTRAINT FK_order_items_menu FOREIGN KEY (MenuItemId) REFERENCES menu_items (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS kots (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            OrderId INT NOT NULL,
            KOTNumber VARCHAR(50) NOT NULL,
            TableNumber VARCHAR(50) NULL,
            CustomerName VARCHAR(100) NULL,
            WaiterId INT NOT NULL,
            Status VARCHAR(30) NOT NULL DEFAULT 'Pending',
            CreatedAt DATETIME(6) NOT NULL,
            ReadyAt DATETIME(6) NULL,
            ServedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            KEY IX_kots_order (OrderId),
            KEY IX_kots_branch_status (BranchId, Status),
            CONSTRAINT FK_kots_order FOREIGN KEY (OrderId) REFERENCES orders (Id) ON DELETE CASCADE,
            CONSTRAINT FK_kots_waiter FOREIGN KEY (WaiterId) REFERENCES users (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS bills (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            OrderId INT NOT NULL,
            BillNumber VARCHAR(80) NOT NULL,
            CustomerName VARCHAR(100) NULL,
            TableNumber VARCHAR(50) NULL,
            WaiterId INT NOT NULL,
            Subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
            Tax DECIMAL(18,2) NOT NULL DEFAULT 0,
            Discount DECIMAL(18,2) NOT NULL DEFAULT 0,
            GrandTotal DECIMAL(18,2) NOT NULL DEFAULT 0,
            PaymentStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',
            PaymentMethod VARCHAR(50) NULL,
            GeneratedAt DATETIME(6) NOT NULL,
            PaidAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            UNIQUE KEY IX_bills_number (BillNumber),
            KEY IX_bills_order (OrderId),
            CONSTRAINT FK_bills_order FOREIGN KEY (OrderId) REFERENCES orders (Id) ON DELETE RESTRICT,
            CONSTRAINT FK_bills_waiter FOREIGN KEY (WaiterId) REFERENCES users (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);
}

static async Task EnsureKitchenSchemaAsync(SamayaDbContext db)
{
    await db.Database.ExecuteSqlRawAsync("""
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
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        INSERT IGNORE INTO item_categories (OrganizationId, Name, Description, Status, IsActive, CreatedAt)
        SELECT DISTINCT OrganizationId, Category, CONCAT(Category, ' items'), 'Active', 1, UTC_TIMESTAMP(6)
        FROM inventory_items
        WHERE Category IS NOT NULL AND Category != '';
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS material_issues (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            IssueNumber VARCHAR(80) NULL,
            Date DATETIME(6) NULL,
            IssueType VARCHAR(50) NOT NULL DEFAULT 'Kitchen',
            Department VARCHAR(100) NULL,
            Reference VARCHAR(100) NOT NULL DEFAULT '',
            Quantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            Notes VARCHAR(1000) NULL,
            Status VARCHAR(40) NOT NULL DEFAULT 'Confirmed',
            ReceivedBy VARCHAR(100) NULL,
            CreatedByUserId INT NOT NULL,
            CreatedAt DATETIME(6) NOT NULL,
            UpdatedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            KEY IX_material_issues_org_branch (OrganizationId, BranchId)
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
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
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS material_returns (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            ReturnNumber VARCHAR(80) NULL,
            Date DATETIME(6) NULL,
            ReturnType VARCHAR(50) NOT NULL DEFAULT 'Kitchen Unused',
            Department VARCHAR(100) NULL,
            Reference VARCHAR(100) NOT NULL DEFAULT '',
            MaterialIssueId INT NULL,
            Quantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            Reason VARCHAR(255) NULL,
            Notes VARCHAR(1000) NULL,
            Status VARCHAR(40) NOT NULL DEFAULT 'Confirmed',
            ReturnedBy VARCHAR(100) NULL,
            ReceivedBy VARCHAR(100) NULL,
            CreatedByUserId INT NOT NULL,
            CreatedAt DATETIME(6) NOT NULL,
            UpdatedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            KEY IX_material_returns_org_branch (OrganizationId, BranchId)
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS material_return_items (
            Id INT NOT NULL AUTO_INCREMENT,
            MaterialReturnId INT NOT NULL,
            InventoryItemId INT NOT NULL,
            Quantity DECIMAL(18,3) NOT NULL,
            Unit VARCHAR(30) NOT NULL,
            StockBefore DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            StockAfter DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            Notes VARCHAR(255) NULL,
            PRIMARY KEY (Id),
            KEY IX_material_return_items_return (MaterialReturnId),
            KEY FK_material_return_items_item (InventoryItemId),
            CONSTRAINT FK_material_return_items_return FOREIGN KEY (MaterialReturnId) REFERENCES material_returns (Id) ON DELETE CASCADE,
            CONSTRAINT FK_material_return_items_item FOREIGN KEY (InventoryItemId) REFERENCES inventory_items (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS production_plan_materials (
            Id INT NOT NULL AUTO_INCREMENT,
            ProductionPlanId INT NOT NULL,
            InventoryItemId INT NOT NULL,
            PlannedQuantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            ActualSentQuantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            ActualUsedQuantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            RemainingQuantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            ReturnedQuantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            WastageQuantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            Unit VARCHAR(30) NOT NULL DEFAULT 'KG',
            Status VARCHAR(40) NOT NULL DEFAULT 'PLANNED',
            Notes VARCHAR(255) NULL,
            CreatedAt DATETIME(6) NOT NULL,
            UpdatedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            KEY IX_plan_materials_plan (ProductionPlanId),
            KEY IX_plan_materials_item (InventoryItemId),
            CONSTRAINT FK_plan_materials_plan FOREIGN KEY (ProductionPlanId) REFERENCES production_plans (Id) ON DELETE CASCADE,
            CONSTRAINT FK_plan_materials_item FOREIGN KEY (InventoryItemId) REFERENCES inventory_items (Id) ON DELETE RESTRICT
        ) ENGINE=InnoDB;
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS kitchen_stocks (
            Id INT NOT NULL AUTO_INCREMENT,
            OrganizationId INT NOT NULL,
            BranchId INT NOT NULL,
            KitchenName VARCHAR(100) NOT NULL DEFAULT 'Main Kitchen',
            InventoryItemId INT NOT NULL,
            CurrentStock DECIMAL(18,3) NOT NULL DEFAULT 0.000,
            UpdatedAt DATETIME(6) NULL,
            PRIMARY KEY (Id),
            UNIQUE KEY IX_kitchen_stocks_org_branch_kitchen_item (OrganizationId, BranchId, KitchenName, InventoryItemId),
            KEY IX_kitchen_stocks_branch (BranchId),
            KEY IX_kitchen_stocks_item (InventoryItemId),
            CONSTRAINT FK_kitchen_stocks_org FOREIGN KEY (OrganizationId) REFERENCES organizations (Id) ON DELETE CASCADE,
            CONSTRAINT FK_kitchen_stocks_branch FOREIGN KEY (BranchId) REFERENCES branches (Id) ON DELETE CASCADE,
            CONSTRAINT FK_kitchen_stocks_item FOREIGN KEY (InventoryItemId) REFERENCES inventory_items (Id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """);

    var alterColumns = new (string tbl, string col, string def)[]
    {
        ("inventory_items", "ItemCode", "VARCHAR(50) NULL"),
        ("inventory_items", "CategoryId", "INT NULL"),
        ("inventory_items", "ReorderLevel", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("inventory_items", "MaximumStock", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("inventory_items", "Description", "VARCHAR(500) NULL"),
        ("inventory_items", "UpdatedAt", "DATETIME(6) NULL"),
        ("suppliers", "ContactPerson", "VARCHAR(100) NULL"),
        ("suppliers", "GstNumber", "VARCHAR(50) NULL"),
        ("suppliers", "UpdatedAt", "DATETIME(6) NULL"),
        ("purchases", "PurchaseNumber", "VARCHAR(80) NULL"),
        ("purchases", "PurchaseDate", "DATETIME(6) NULL"),
        ("purchases", "Notes", "VARCHAR(1000) NULL"),
        ("purchases", "UpdatedAt", "DATETIME(6) NULL"),
        ("purchase_items", "Unit", "VARCHAR(30) NULL"),
        ("purchase_items", "BatchNumber", "VARCHAR(100) NULL"),
        ("purchase_items", "ExpiryDate", "DATETIME(6) NULL"),
        ("purchase_items", "ReturnedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("purchase_items", "ReturnReason", "VARCHAR(255) NULL"),
        ("stock_transactions", "SourceLocation", "VARCHAR(200) NULL"),
        ("stock_transactions", "DestinationLocation", "VARCHAR(200) NULL"),
        ("stock_transactions", "ReferenceType", "VARCHAR(50) NULL"),
        ("stock_transactions", "ReferenceId", "VARCHAR(100) NULL"),
        ("production_plans", "PlanNumber", "VARCHAR(80) NULL"),
        ("production_plans", "Shift", "VARCHAR(50) NULL DEFAULT 'Morning'"),
        ("production_plans", "KitchenName", "VARCHAR(100) NULL DEFAULT 'Main Kitchen'"),
        ("production_plans", "MenuItemId", "INT NULL"),
        ("production_plans", "PlannedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plans", "Unit", "VARCHAR(30) NOT NULL DEFAULT 'Portion'"),
        ("production_plans", "UpdatedAt", "DATETIME(6) NULL"),
        ("production_plan_items", "Unit", "VARCHAR(30) NULL"),
        ("production_plan_items", "Status", "VARCHAR(50) NOT NULL DEFAULT 'Planned'"),
        ("production_plan_items", "ExpectedSales", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "ActualQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "ActualSales", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "OrderedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "RemainingQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "UnsoldQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "WastageQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("production_plan_items", "LossReason", "VARCHAR(100) NULL"),
        ("production_plan_items", "Remarks", "VARCHAR(255) NULL"),
        ("actual_productions", "ProductionNumber", "VARCHAR(80) NULL"),
        ("actual_productions", "MenuItemId", "INT NULL"),
        ("actual_productions", "PlannedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("actual_productions", "ActualQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("actual_productions", "WastageQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("actual_productions", "Status", "VARCHAR(40) NOT NULL DEFAULT 'COMPLETED'"),
        ("actual_productions", "UpdatedAt", "DATETIME(6) NULL"),
        ("actual_production_ingredients", "PlannedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("actual_production_ingredients", "Unit", "VARCHAR(30) NULL"),
        ("material_issues", "IssueNumber", "VARCHAR(80) NULL"),
        ("material_issues", "Date", "DATETIME(6) NULL"),
        ("material_issues", "Department", "VARCHAR(100) NULL"),
        ("material_issues", "Status", "VARCHAR(40) NOT NULL DEFAULT 'Confirmed'"),
        ("material_issues", "ProductionPlanId", "INT NULL"),
        ("material_issues", "ApprovedBy", "VARCHAR(100) NULL"),
        ("material_issues", "ReceivedBy", "VARCHAR(100) NULL"),
        ("material_issues", "UpdatedAt", "DATETIME(6) NULL"),
        ("material_issue_items", "KitchenStockBefore", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_issue_items", "KitchenStockAfter", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_returns", "ReturnNumber", "VARCHAR(80) NULL"),
        ("material_returns", "Date", "DATETIME(6) NULL"),
        ("material_returns", "Department", "VARCHAR(100) NULL"),
        ("material_returns", "Status", "VARCHAR(40) NOT NULL DEFAULT 'Confirmed'"),
        ("material_returns", "ProductionPlanId", "INT NULL"),
        ("material_returns", "ApprovedBy", "VARCHAR(100) NULL"),
        ("material_returns", "IssuedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_returns", "ConsumedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_returns", "ReturnedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_returns", "UpdatedAt", "DATETIME(6) NULL"),
        ("material_return_items", "IssuedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_return_items", "ConsumedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_return_items", "ReturnedQuantity", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_return_items", "KitchenStockBefore", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("material_return_items", "KitchenStockAfter", "DECIMAL(18,3) NOT NULL DEFAULT 0.000"),
        ("stock_transfers", "TransferNumber", "VARCHAR(80) NULL"),
        ("stock_transfers", "FromBranchId", "INT NULL"),
        ("stock_transfers", "ToBranchId", "INT NULL"),
        ("stock_transfers", "ApprovedByUserId", "INT NULL"),
        ("stock_transfers", "UpdatedAt", "DATETIME(6) NULL"),
        ("stock_transfers", "DispatchedQuantity", "DECIMAL(18,3) NULL"),
        ("stock_transfers", "ReceivedQuantity", "DECIMAL(18,3) NULL"),
        ("stock_transfers", "DispatchedAt", "DATETIME(6) NULL"),
        ("stock_transfers", "TransferDate", "DATETIME(6) NULL"),
        ("menu_items", "Code", "VARCHAR(50) NULL"),
        ("menu_items", "Unit", "VARCHAR(30) NOT NULL DEFAULT 'Portion'"),
        ("menu_items", "Description", "VARCHAR(500) NULL"),
        ("menu_items", "ImageUrl", "VARCHAR(2000) NULL"),
        ("menu_items", "UpdatedAt", "DATETIME(6) NULL"),
        ("recipe_ingredients", "Unit", "VARCHAR(30) NULL"),
        ("recipe_ingredients", "Notes", "VARCHAR(255) NULL"),
        ("orders", "CustomerName", "VARCHAR(100) NULL"),
        ("orders", "Subtotal", "DECIMAL(18,2) NOT NULL DEFAULT 0"),
        ("orders", "Tax", "DECIMAL(18,2) NOT NULL DEFAULT 0"),
        ("orders", "Discount", "DECIMAL(18,2) NOT NULL DEFAULT 0"),
        ("orders", "ClosedAt", "DATETIME(6) NULL"),
        ("order_items", "KOTId", "INT NULL"),
        ("order_items", "KOTNumber", "VARCHAR(50) NULL"),
        ("order_items", "CreatedAt", "DATETIME(6) NULL"),
        ("orders", "SaleType", "VARCHAR(40) NOT NULL DEFAULT 'TABLE_SERVICE'"),
        ("bills", "SaleType", "VARCHAR(40) NOT NULL DEFAULT 'TABLE_SERVICE'"),
        ("bills", "AmountTendered", "DECIMAL(18,2) NOT NULL DEFAULT 0.00"),
        ("bills", "ChangeGiven", "DECIMAL(18,2) NOT NULL DEFAULT 0.00"),
        ("bills", "VoidReason", "VARCHAR(255) NULL"),
        ("bills", "VoidedAt", "DATETIME(6) NULL"),
        ("kots", "SaleType", "VARCHAR(40) NOT NULL DEFAULT 'TABLE_SERVICE'"),
        ("branches", "ModuleType", "VARCHAR(50) NOT NULL DEFAULT 'Both POS + KMS'")
    };

    foreach (var (tbl, col, def) in alterColumns)
    {
        try
        {
            var exists = await db.Database.SqlQueryRaw<int>($"""
                SELECT COUNT(*) AS Value FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{tbl}' AND COLUMN_NAME = '{col}'
                """).FirstOrDefaultAsync();

            if (exists == 0)
            {
                await db.Database.ExecuteSqlRawAsync($"ALTER TABLE `{tbl}` ADD COLUMN `{col}` {def};");
            }
        }
        catch
        {
            // Ignore if column or table already exists or check fails
        }
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE `branches` SET `ModuleType` = 'Both POS + KMS' 
            WHERE `ModuleType` IS NULL OR `ModuleType` = '';
        """);
    }
    catch
    {
        // Ignore if branches table does not yet have ModuleType
    }
}


