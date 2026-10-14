using Microsoft.EntityFrameworkCore;
using Samaya.API.Models;

namespace Samaya.API.Data
{
    public class SamayaDbContext : DbContext
    {
        public SamayaDbContext(DbContextOptions<SamayaDbContext> options)
            : base(options)
        {
        }

        public DbSet<Organization> Organizations { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }
        public DbSet<StockTransaction> StockTransactions { get; set; }
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<RecipeIngredient> RecipeIngredients { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<KOT> KOTs { get; set; }
        public DbSet<Bill> Bills { get; set; }

        // Kitchen & Inventory Management Module
        public DbSet<ItemCategory> ItemCategories { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Purchase> Purchases { get; set; }
        public DbSet<PurchaseItem> PurchaseItems { get; set; }
        public DbSet<ProductionPlan> ProductionPlans { get; set; }
        public DbSet<ProductionPlanItem> ProductionPlanItems { get; set; }
        public DbSet<ProductionPlanMaterial> ProductionPlanMaterials { get; set; }
        public DbSet<ActualProduction> ActualProductions { get; set; }
        public DbSet<ActualProductionItem> ActualProductionItems { get; set; }
        public DbSet<ActualProductionIngredient> ActualProductionIngredients { get; set; }
        public DbSet<MaterialIssue> MaterialIssues { get; set; }
        public DbSet<MaterialIssueItem> MaterialIssueItems { get; set; }
        public DbSet<MaterialReturn> MaterialReturns { get; set; }
        public DbSet<MaterialReturnItem> MaterialReturnItems { get; set; }
        public DbSet<StockTransfer> StockTransfers { get; set; }
        public DbSet<KitchenStock> KitchenStocks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Organization>().ToTable("organizations");
            modelBuilder.Entity<Branch>().ToTable("branches");
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<Role>().ToTable("roles");

            modelBuilder.Entity<Branch>()
                .HasOne(b => b.Organization)
                .WithMany(o => o.Branches)
                .HasForeignKey(b => b.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Branch)
                .WithMany(b => b.Users)
                .HasForeignKey(u => u.BranchId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Role>()
                .HasData(
                    new Role { Id = 1, Name = "Super Admin" },
                    new Role { Id = 2, Name = "Organization Admin" },
                    new Role { Id = 3, Name = "Branch Manager" },
                    new Role { Id = 4, Name = "Kitchen Manager" },
                    new Role { Id = 5, Name = "Chef" },
                    new Role { Id = 6, Name = "Inventory Manager" },
                    new Role { Id = 7, Name = "Accountant" },
                    new Role { Id = 8, Name = "Staff" },
                    new Role { Id = 9, Name = "Consumer" },
                    new Role { Id = 10, Name = "Waiter" },
                    new Role { Id = 11, Name = "Cashier" }
                );

            modelBuilder.Entity<Organization>()
                .Property(o => o.Name)
                .HasMaxLength(200)
                .IsRequired();

            modelBuilder.Entity<Branch>()
                .Property(b => b.Name)
                .HasMaxLength(200)
                .IsRequired();

            modelBuilder.Entity<Branch>()
                .Property(b => b.Code)
                .HasMaxLength(50)
                .IsRequired();

            modelBuilder.Entity<Branch>()
                .Property(b => b.ModuleType)
                .HasMaxLength(50)
                .HasDefaultValue("Both POS + KMS");

            modelBuilder.Entity<User>()
                .Property(u => u.Email)
                .HasMaxLength(255)
                .IsRequired();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Role>()
                .Property(r => r.Name)
                .HasMaxLength(100)
                .IsRequired();

            // Item Categories
            modelBuilder.Entity<ItemCategory>().ToTable("item_categories");
            modelBuilder.Entity<ItemCategory>().HasOne(c => c.Organization).WithMany().HasForeignKey(c => c.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ItemCategory>().HasIndex(c => new { c.OrganizationId, c.Name }).IsUnique();

            // Inventory Items
            modelBuilder.Entity<InventoryItem>().ToTable("inventory_items");
            modelBuilder.Entity<InventoryItem>().HasOne(i => i.Organization).WithMany().HasForeignKey(i => i.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<InventoryItem>().HasOne(i => i.Branch).WithMany().HasForeignKey(i => i.BranchId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<InventoryItem>().HasOne(i => i.CategoryItem).WithMany().HasForeignKey(i => i.CategoryId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<InventoryItem>().Property(i => i.MinimumStock).HasPrecision(18, 3);
            modelBuilder.Entity<InventoryItem>().Property(i => i.CurrentStock).HasPrecision(18, 3);
            modelBuilder.Entity<InventoryItem>().Property(i => i.ReorderLevel).HasPrecision(18, 3);
            modelBuilder.Entity<InventoryItem>().Property(i => i.MaximumStock).HasPrecision(18, 3);
            modelBuilder.Entity<InventoryItem>().HasIndex(i => new { i.OrganizationId, i.BranchId, i.Name }).IsUnique();

            // Stock Transactions
            modelBuilder.Entity<StockTransaction>().ToTable("stock_transactions");
            modelBuilder.Entity<StockTransaction>().HasOne(t => t.InventoryItem).WithMany(i => i.Transactions).HasForeignKey(t => t.InventoryItemId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<StockTransaction>().HasOne(t => t.CreatedByUser).WithMany().HasForeignKey(t => t.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransaction>().HasOne(t => t.Branch).WithMany().HasForeignKey(t => t.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransaction>().HasOne(t => t.Organization).WithMany().HasForeignKey(t => t.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransaction>().Property(t => t.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<StockTransaction>().Property(t => t.StockBefore).HasPrecision(18, 3);
            modelBuilder.Entity<StockTransaction>().Property(t => t.StockAfter).HasPrecision(18, 3);

            // Suppliers (Vendors)
            modelBuilder.Entity<Supplier>().ToTable("suppliers");
            modelBuilder.Entity<Supplier>().HasOne(s => s.Organization).WithMany().HasForeignKey(s => s.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Supplier>().HasIndex(s => new { s.OrganizationId, s.Name }).IsUnique();

            // Purchases & Purchase Items
            modelBuilder.Entity<Purchase>().ToTable("purchases");
            modelBuilder.Entity<Purchase>().HasOne(p => p.Organization).WithMany().HasForeignKey(p => p.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Purchase>().HasOne(p => p.Branch).WithMany().HasForeignKey(p => p.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Purchase>().HasOne(p => p.Supplier).WithMany(s => s.Purchases).HasForeignKey(p => p.SupplierId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Purchase>().HasOne(p => p.CreatedByUser).WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Purchase>().Property(p => p.TotalAmount).HasPrecision(18, 2);

            modelBuilder.Entity<PurchaseItem>().ToTable("purchase_items");
            modelBuilder.Entity<PurchaseItem>().HasOne(i => i.Purchase).WithMany(p => p.Items).HasForeignKey(i => i.PurchaseId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<PurchaseItem>().HasOne(i => i.InventoryItem).WithMany().HasForeignKey(i => i.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<PurchaseItem>().Property(i => i.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<PurchaseItem>().Property(i => i.UnitCost).HasPrecision(18, 2);
            modelBuilder.Entity<PurchaseItem>().Property(i => i.TotalCost).HasPrecision(18, 2);

            // Production Plans & Items
            modelBuilder.Entity<ProductionPlan>().ToTable("production_plans");
            modelBuilder.Entity<ProductionPlan>().HasOne(p => p.Organization).WithMany().HasForeignKey(p => p.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionPlan>().HasOne(p => p.Branch).WithMany().HasForeignKey(p => p.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionPlan>().HasOne(p => p.MenuItem).WithMany().HasForeignKey(p => p.MenuItemId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ProductionPlan>().HasOne(p => p.CreatedByUser).WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionPlan>().Property(p => p.PlannedQuantity).HasPrecision(18, 3);

            modelBuilder.Entity<ProductionPlanItem>().ToTable("production_plan_items");
            modelBuilder.Entity<ProductionPlanItem>().HasOne(i => i.ProductionPlan).WithMany(p => p.Items).HasForeignKey(i => i.ProductionPlanId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ProductionPlanItem>().HasOne(i => i.MenuItem).WithMany().HasForeignKey(i => i.MenuItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionPlanItem>().Property(i => i.PlannedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanItem>().Property(i => i.ExpectedSales).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanItem>().Property(i => i.ActualQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanItem>().Property(i => i.ActualSales).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanItem>().Property(i => i.UnsoldQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanItem>().Property(i => i.WastageQuantity).HasPrecision(18, 3);

            modelBuilder.Entity<ProductionPlanMaterial>().ToTable("production_plan_materials");
            modelBuilder.Entity<ProductionPlanMaterial>().HasOne(m => m.ProductionPlan).WithMany(p => p.Materials).HasForeignKey(m => m.ProductionPlanId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ProductionPlanMaterial>().HasOne(m => m.InventoryItem).WithMany().HasForeignKey(m => m.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionPlanMaterial>().Property(m => m.PlannedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanMaterial>().Property(m => m.ActualSentQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanMaterial>().Property(m => m.ActualUsedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanMaterial>().Property(m => m.RemainingQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanMaterial>().Property(m => m.ReturnedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ProductionPlanMaterial>().Property(m => m.WastageQuantity).HasPrecision(18, 3);

            // Actual Productions, Items, Ingredients
            modelBuilder.Entity<ActualProduction>().ToTable("actual_productions");
            modelBuilder.Entity<ActualProduction>().HasOne(p => p.Organization).WithMany().HasForeignKey(p => p.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ActualProduction>().HasOne(p => p.Branch).WithMany().HasForeignKey(p => p.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ActualProduction>().HasOne(p => p.ProductionPlan).WithMany().HasForeignKey(p => p.ProductionPlanId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ActualProduction>().HasOne(p => p.MenuItem).WithMany().HasForeignKey(p => p.MenuItemId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ActualProduction>().HasOne(p => p.CreatedByUser).WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ActualProduction>().Property(p => p.PlannedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ActualProduction>().Property(p => p.ActualQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ActualProduction>().Property(p => p.WastageQuantity).HasPrecision(18, 3);

            modelBuilder.Entity<ActualProductionItem>().ToTable("actual_production_items");
            modelBuilder.Entity<ActualProductionItem>().HasOne(i => i.ActualProduction).WithMany(p => p.Items).HasForeignKey(i => i.ActualProductionId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ActualProductionItem>().HasOne(i => i.MenuItem).WithMany().HasForeignKey(i => i.MenuItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ActualProductionItem>().Property(i => i.ActualQuantity).HasPrecision(18, 3);

            modelBuilder.Entity<ActualProductionIngredient>().ToTable("actual_production_ingredients");
            modelBuilder.Entity<ActualProductionIngredient>().HasOne(i => i.ActualProduction).WithMany(p => p.Ingredients).HasForeignKey(i => i.ActualProductionId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ActualProductionIngredient>().HasOne(i => i.InventoryItem).WithMany().HasForeignKey(i => i.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ActualProductionIngredient>().Property(i => i.PlannedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<ActualProductionIngredient>().Property(i => i.Quantity).HasPrecision(18, 3);

            // Material Issues & Items
            modelBuilder.Entity<MaterialIssue>().ToTable("material_issues");
            modelBuilder.Entity<MaterialIssue>().HasOne(m => m.Organization).WithMany().HasForeignKey(m => m.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialIssue>().HasOne(m => m.Branch).WithMany().HasForeignKey(m => m.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialIssue>().HasOne(m => m.CreatedByUser).WithMany().HasForeignKey(m => m.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialIssue>().HasOne(m => m.ProductionPlan).WithMany().HasForeignKey(m => m.ProductionPlanId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<MaterialIssue>().Property(m => m.Quantity).HasPrecision(18, 3);

            modelBuilder.Entity<MaterialIssueItem>().ToTable("material_issue_items");
            modelBuilder.Entity<MaterialIssueItem>().HasOne(i => i.MaterialIssue).WithMany(m => m.Items).HasForeignKey(i => i.MaterialIssueId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<MaterialIssueItem>().HasOne(i => i.InventoryItem).WithMany().HasForeignKey(i => i.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialIssueItem>().Property(i => i.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialIssueItem>().Property(i => i.StockBefore).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialIssueItem>().Property(i => i.StockAfter).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialIssueItem>().Property(i => i.KitchenStockBefore).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialIssueItem>().Property(i => i.KitchenStockAfter).HasPrecision(18, 3);

            // Material Returns & Items
            modelBuilder.Entity<MaterialReturn>().ToTable("material_returns");
            modelBuilder.Entity<MaterialReturn>().HasOne(m => m.Organization).WithMany().HasForeignKey(m => m.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialReturn>().HasOne(m => m.Branch).WithMany().HasForeignKey(m => m.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialReturn>().HasOne(m => m.MaterialIssue).WithMany().HasForeignKey(m => m.MaterialIssueId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<MaterialReturn>().HasOne(m => m.ProductionPlan).WithMany().HasForeignKey(m => m.ProductionPlanId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<MaterialReturn>().HasOne(m => m.CreatedByUser).WithMany().HasForeignKey(m => m.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialReturn>().Property(m => m.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturn>().Property(m => m.IssuedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturn>().Property(m => m.ConsumedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturn>().Property(m => m.ReturnedQuantity).HasPrecision(18, 3);

            modelBuilder.Entity<MaterialReturnItem>().ToTable("material_return_items");
            modelBuilder.Entity<MaterialReturnItem>().HasOne(i => i.MaterialReturn).WithMany(m => m.Items).HasForeignKey(i => i.MaterialReturnId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<MaterialReturnItem>().HasOne(i => i.InventoryItem).WithMany().HasForeignKey(i => i.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.IssuedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.ConsumedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.ReturnedQuantity).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.StockBefore).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.StockAfter).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.KitchenStockBefore).HasPrecision(18, 3);
            modelBuilder.Entity<MaterialReturnItem>().Property(i => i.KitchenStockAfter).HasPrecision(18, 3);

            // Kitchen Stock
            modelBuilder.Entity<KitchenStock>().ToTable("kitchen_stocks");
            modelBuilder.Entity<KitchenStock>().HasOne(k => k.Organization).WithMany().HasForeignKey(k => k.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<KitchenStock>().HasOne(k => k.Branch).WithMany().HasForeignKey(k => k.BranchId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<KitchenStock>().HasOne(k => k.InventoryItem).WithMany().HasForeignKey(k => k.InventoryItemId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<KitchenStock>().Property(k => k.CurrentStock).HasPrecision(18, 3);
            modelBuilder.Entity<KitchenStock>().HasIndex(k => new { k.OrganizationId, k.BranchId, k.KitchenName, k.InventoryItemId }).IsUnique();

            // Stock Transfers
            modelBuilder.Entity<StockTransfer>().ToTable("stock_transfers");
            modelBuilder.Entity<StockTransfer>().HasOne(t => t.Organization).WithMany().HasForeignKey(t => t.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransfer>().HasOne(t => t.FromBranch).WithMany().HasForeignKey(t => t.FromBranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransfer>().HasOne(t => t.ToBranch).WithMany().HasForeignKey(t => t.ToBranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransfer>().HasOne(t => t.InventoryItem).WithMany().HasForeignKey(t => t.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransfer>().HasOne(t => t.CreatedByUser).WithMany().HasForeignKey(t => t.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransfer>().HasOne(t => t.ApprovedByUser).WithMany().HasForeignKey(t => t.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<StockTransfer>().Property(t => t.Quantity).HasPrecision(18, 3);

            // Menu Items & Recipes
            modelBuilder.Entity<MenuItem>().ToTable("menu_items");
            modelBuilder.Entity<MenuItem>().HasOne(m => m.Organization).WithMany().HasForeignKey(m => m.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<MenuItem>().HasOne(m => m.Branch).WithMany().HasForeignKey(m => m.BranchId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<MenuItem>().HasIndex(m => new { m.OrganizationId, m.BranchId, m.Name }).IsUnique();
            modelBuilder.Entity<MenuItem>().Property(m => m.Price).HasPrecision(18, 2);

            modelBuilder.Entity<RecipeIngredient>().ToTable("recipe_ingredients");
            modelBuilder.Entity<RecipeIngredient>().HasOne(r => r.MenuItem).WithMany(m => m.Ingredients).HasForeignKey(r => r.MenuItemId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<RecipeIngredient>().HasOne(r => r.InventoryItem).WithMany().HasForeignKey(r => r.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<RecipeIngredient>().HasOne(r => r.Branch).WithMany().HasForeignKey(r => r.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<RecipeIngredient>().Property(r => r.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<RecipeIngredient>().HasIndex(r => new { r.MenuItemId, r.InventoryItemId }).IsUnique();

            // Orders & Order Items
            modelBuilder.Entity<Order>().ToTable("orders");
            modelBuilder.Entity<Order>().HasOne(o => o.Organization).WithMany().HasForeignKey(o => o.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Order>().HasOne(o => o.Branch).WithMany().HasForeignKey(o => o.BranchId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Order>().HasOne(o => o.Waiter).WithMany().HasForeignKey(o => o.WaiterId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Order>().Property(o => o.TotalAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Order>().HasIndex(o => new { o.OrganizationId, o.BranchId, o.Status, o.CreatedAt });

            modelBuilder.Entity<OrderItem>().ToTable("order_items");
            modelBuilder.Entity<OrderItem>().HasOne(i => i.Order).WithMany(o => o.Items).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OrderItem>().HasOne(i => i.MenuItem).WithMany(m => m.OrderItems).HasForeignKey(i => i.MenuItemId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<OrderItem>().Property(i => i.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<OrderItem>().Property(i => i.UnitPrice).HasPrecision(18, 2);
            modelBuilder.Entity<OrderItem>().Property(i => i.LineTotal).HasPrecision(18, 2);

            modelBuilder.Entity<Order>().Property(o => o.Subtotal).HasPrecision(18, 2);
            modelBuilder.Entity<Order>().Property(o => o.Tax).HasPrecision(18, 2);
            modelBuilder.Entity<Order>().Property(o => o.Discount).HasPrecision(18, 2);

            // KOTs
            modelBuilder.Entity<KOT>().ToTable("kots");
            modelBuilder.Entity<KOT>().HasOne(k => k.Order).WithMany(o => o.KOTs).HasForeignKey(k => k.OrderId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<KOT>().HasOne(k => k.Waiter).WithMany().HasForeignKey(k => k.WaiterId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<KOT>().HasMany(k => k.Items).WithOne(i => i.KOT).HasForeignKey(i => i.KOTId).OnDelete(DeleteBehavior.SetNull);

            // Bills
            modelBuilder.Entity<Bill>().ToTable("bills");
            modelBuilder.Entity<Bill>().HasOne(b => b.Order).WithMany().HasForeignKey(b => b.OrderId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Bill>().HasOne(b => b.Waiter).WithMany().HasForeignKey(b => b.WaiterId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Bill>().Property(b => b.Subtotal).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.Tax).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.Discount).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.GrandTotal).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().HasIndex(b => b.BillNumber).IsUnique();
        }
    }
}
