using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;
using System.Text;

namespace Samaya.API.Services
{
    public class RecipeStockRequirementItem
    {
        public int InventoryItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string IngredientName => ItemName;
        public string ItemCode { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty; // Kitchen Stock unit (from InventoryItem)
        public decimal RequiredQuantity { get; set; } // In Kitchen Stock measurement unit
        public decimal AvailableStock { get; set; } // Current stock in KitchenStock
        public decimal Shortage { get; set; } // > 0 if insufficient
        public bool IsSufficient => Shortage <= 0;
        public string Reason { get; set; } = string.Empty; // e.g. "Chicken Biryani × 10"
        public string FoodSummary { get; set; } = string.Empty;
        public string FormattedRequired => UnitConversionHelper.FormatQuantityWithUnit(RequiredQuantity, Unit);
        public string FormattedAvailable => UnitConversionHelper.FormatQuantityWithUnit(AvailableStock, Unit);
        public string FormattedShortage => UnitConversionHelper.FormatQuantityWithUnit(Shortage, Unit);
    }

    public class RecipeStockShortageDetail
    {
        public int InventoryItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string IngredientName => ItemName;
        public decimal Required { get; set; }
        public decimal RequiredQuantity => Required;
        public decimal Available { get; set; }
        public decimal AvailableQuantity => Available;
        public decimal Shortage { get; set; }
        public decimal ShortageQuantity => Shortage;
        public string Unit { get; set; } = string.Empty;
        public string FormattedRequired { get; set; } = string.Empty;
        public string RequiredFormatted => FormattedRequired;
        public string FormattedAvailable { get; set; } = string.Empty;
        public string AvailableFormatted => FormattedAvailable;
        public string FormattedShortage { get; set; } = string.Empty;
        public string ShortageFormatted => FormattedShortage;
    }

    public class RecipeStockValidationResult
    {
        public bool IsSufficient { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public List<RecipeStockShortageDetail> Shortages { get; set; } = new();
        public List<RecipeStockRequirementItem> Requirements { get; set; } = new();
    }

    public class RecipeStockDeductionResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<RecipeStockShortageDetail> Shortages { get; set; } = new();
        public List<StockTransaction> Transactions { get; set; } = new();
        public List<RecipeStockRequirementItem> Requirements { get; set; } = new();
    }

    public class RecipeStockService
    {
        private readonly SamayaDbContext _context;

        public RecipeStockService(SamayaDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Validates whether Kitchen Stock has sufficient quantities for all recipe ingredients
        /// across one or more food items prepared.
        /// Does NOT modify any database records.
        /// </summary>
        public async Task<RecipeStockValidationResult> ValidateRecipeStockAsync(
            int organizationId,
            int branchId,
            string kitchenName,
            IEnumerable<(int MenuItemId, decimal Quantity)> foodItems,
            bool requireRecipe = true)
        {
            var result = new RecipeStockValidationResult { IsSufficient = true };
            var safeKitchenName = string.IsNullOrWhiteSpace(kitchenName) ? "Main Kitchen" : kitchenName.Trim();

            // 1. Gather all menu items with active recipes
            var foodList = foodItems.Where(f => f.MenuItemId > 0 && f.Quantity > 0).ToList();
            if (foodList.Count == 0)
            {
                result.IsSufficient = false;
                result.ErrorMessage = "No food items specified for production.";
                return result;
            }

            var menuIds = foodList.Select(f => f.MenuItemId).Distinct().ToList();
            var menuItems = await _context.MenuItems
                .Include(m => m.Ingredients)
                    .ThenInclude(r => r.InventoryItem)
                .Where(m => menuIds.Contains(m.Id) && m.OrganizationId == organizationId && m.BranchId == branchId && m.IsActive)
                .ToDictionaryAsync(m => m.Id);

            // Accumulate ingredient requirements: InventoryItemId -> (InventoryItem, TotalRequiredInStockUnit, Reasons, FoodNames)
            var accumulated = new Dictionary<int, (InventoryItem Item, decimal TotalRequired, List<string> Reasons, List<string> FoodNames)>();

            foreach (var food in foodList)
            {
                if (!menuItems.TryGetValue(food.MenuItemId, out var menuItem))
                {
                    result.IsSufficient = false;
                    result.ErrorMessage = $"Food item ID {food.MenuItemId} not found or inactive in this branch.";
                    return result;
                }

                if (menuItem.Ingredients.Count == 0)
                {
                    if (requireRecipe)
                    {
                        result.IsSufficient = false;
                        result.ErrorMessage = $"No recipe ingredients configured for {menuItem.Name}. Configure the recipe first.";
                        return result;
                    }
                    continue; // Skip items without recipes if not strictly required
                }

                var foodReason = $"{menuItem.Name} × {(food.Quantity % 1 == 0 ? food.Quantity.ToString("0") : food.Quantity.ToString("0.###"))}";

                foreach (var recipe in menuItem.Ingredients)
                {
                    var invItem = recipe.InventoryItem ?? await _context.InventoryItems.FindAsync(recipe.InventoryItemId);
                    if (invItem == null)
                    {
                        result.IsSufficient = false;
                        result.ErrorMessage = $"Inventory item #{recipe.InventoryItemId} for recipe '{menuItem.Name}' not found.";
                        return result;
                    }

                    // Required raw quantity = Recipe Quantity × Food Quantity Prepared
                    var rawRequired = recipe.Quantity * food.Quantity;

                    // Convert to inventory item's base storage unit (used by KitchenStock)
                    var requiredInStockUnit = UnitConversionHelper.ConvertQuantity(
                        rawRequired,
                        recipe.Unit ?? invItem.Unit,
                        invItem.Unit
                    );

                    if (accumulated.TryGetValue(invItem.Id, out var existing))
                    {
                        existing.TotalRequired += requiredInStockUnit;
                        existing.Reasons.Add(foodReason);
                        if (!existing.FoodNames.Contains(menuItem.Name)) existing.FoodNames.Add(menuItem.Name);
                        accumulated[invItem.Id] = existing;
                    }
                    else
                    {
                        accumulated[invItem.Id] = (invItem, requiredInStockUnit, new List<string> { foodReason }, new List<string> { menuItem.Name });
                    }
                }
            }

            if (accumulated.Count == 0)
            {
                // No ingredients were required (e.g. food without recipe when requireRecipe=false)
                return result;
            }

            // 2. Fetch current KitchenStock for all accumulated ingredients
            var invItemIds = accumulated.Keys.ToList();
            var altKitchenName = safeKitchenName.Equals("Main Kitchen", StringComparison.OrdinalIgnoreCase)
                ? "Kitchen"
                : (safeKitchenName.Equals("Kitchen", StringComparison.OrdinalIgnoreCase) ? "Main Kitchen" : safeKitchenName);

            var kStocksList = await _context.KitchenStocks
                .Where(k => k.OrganizationId == organizationId &&
                            k.BranchId == branchId &&
                            (k.KitchenName == safeKitchenName || k.KitchenName == altKitchenName) &&
                            invItemIds.Contains(k.InventoryItemId))
                .ToListAsync();

            var kitchenStocks = kStocksList
                .GroupBy(k => k.InventoryItemId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.CurrentStock));

            // 3. Check each ingredient's requirement against available KitchenStock
            foreach (var kvp in accumulated)
            {
                var invId = kvp.Key;
                var (invItem, totalRequired, reasons, foodNames) = kvp.Value;

                var stockUnit = invItem.Unit ?? "KG";
                var availableStock = kitchenStocks.TryGetValue(invId, out var kStockVal) ? kStockVal : 0m;
                var shortage = totalRequired > availableStock ? (totalRequired - availableStock) : 0m;

                var reqItem = new RecipeStockRequirementItem
                {
                    InventoryItemId = invId,
                    ItemName = invItem.Name,
                    ItemCode = invItem.ItemCode ?? "",
                    Unit = stockUnit,
                    RequiredQuantity = totalRequired,
                    AvailableStock = availableStock,
                    Shortage = shortage,
                    Reason = string.Join(", ", reasons),
                    FoodSummary = string.Join(", ", foodNames)
                };
                result.Requirements.Add(reqItem);

                if (shortage > 0)
                {
                    result.IsSufficient = false;
                    result.Shortages.Add(new RecipeStockShortageDetail
                    {
                        InventoryItemId = invId,
                        ItemName = invItem.Name,
                        Required = totalRequired,
                        Available = availableStock,
                        Shortage = shortage,
                        Unit = stockUnit,
                        FormattedRequired = UnitConversionHelper.FormatQuantityWithUnit(totalRequired, stockUnit),
                        FormattedAvailable = UnitConversionHelper.FormatQuantityWithUnit(availableStock, stockUnit),
                        FormattedShortage = UnitConversionHelper.FormatQuantityWithUnit(shortage, stockUnit)
                    });
                }
            }

            // 4. If any shortages found, construct clear formatted user message
            if (!result.IsSufficient)
            {
                var sb = new StringBuilder();
                sb.AppendLine("Insufficient Kitchen Stock");
                sb.AppendLine();
                for (int i = 0; i < result.Shortages.Count; i++)
                {
                    var s = result.Shortages[i];
                    sb.AppendLine(s.ItemName);
                    sb.AppendLine($"Required: {s.FormattedRequired}");
                    sb.AppendLine($"Available: {s.FormattedAvailable}");
                    sb.AppendLine($"Shortage: {s.FormattedShortage}");
                    if (i < result.Shortages.Count - 1)
                    {
                        sb.AppendLine();
                    }
                }
                result.ErrorMessage = sb.ToString().TrimEnd();
            }

            return result;
        }

        /// <summary>
        /// Atomically validates Kitchen Stock and deducts recipe ingredients in one backend transaction.
        /// If ANY ingredient is insufficient:
        /// - Does not deduct any ingredient
        /// - Does not partially update stock
        /// - Does not create stock transactions
        /// - Returns failure with full shortage details
        /// </summary>
        public async Task<RecipeStockDeductionResult> DeductRecipeStockAsync(
            int organizationId,
            int branchId,
            string kitchenName,
            IEnumerable<(int MenuItemId, decimal Quantity)> foodItems,
            int userId,
            string referenceNumber,
            string referenceType,
            string? referenceId,
            IDbContextTransaction? existingTransaction = null,
            bool requireRecipe = true)
        {
            var safeKitchenName = string.IsNullOrWhiteSpace(kitchenName) ? "Main Kitchen" : kitchenName.Trim();

            // 1. Validate Kitchen Stock first
            var validation = await ValidateRecipeStockAsync(organizationId, branchId, safeKitchenName, foodItems, requireRecipe);
            if (!validation.IsSufficient)
            {
                return new RecipeStockDeductionResult
                {
                    Success = false,
                    Message = validation.ErrorMessage,
                    Shortages = validation.Shortages,
                    Requirements = validation.Requirements
                };
            }

            if (validation.Requirements.Count == 0)
            {
                return new RecipeStockDeductionResult
                {
                    Success = true,
                    Message = "No recipe ingredients to deduct.",
                    Requirements = validation.Requirements
                };
            }

            // 2. Perform transactional deduction
            IDbContextTransaction? internalTx = null;
            if (existingTransaction == null)
            {
                internalTx = await _context.Database.BeginTransactionAsync();
            }

            try
            {
                var createdTransactions = new List<StockTransaction>();

                var altKitchenName = safeKitchenName.Equals("Main Kitchen", StringComparison.OrdinalIgnoreCase)
                    ? "Kitchen"
                    : (safeKitchenName.Equals("Kitchen", StringComparison.OrdinalIgnoreCase) ? "Main Kitchen" : safeKitchenName);

                foreach (var req in validation.Requirements)
                {
                    // Find or create KitchenStock record (prefer exact name or first matching interchangeable name)
                    var kStockList = await _context.KitchenStocks
                        .Where(k => k.OrganizationId == organizationId &&
                                    k.BranchId == branchId &&
                                    (k.KitchenName == safeKitchenName || k.KitchenName == altKitchenName) &&
                                    k.InventoryItemId == req.InventoryItemId)
                        .ToListAsync();

                    var kStock = kStockList.FirstOrDefault(k => k.KitchenName.Equals(safeKitchenName, StringComparison.OrdinalIgnoreCase))
                                 ?? kStockList.FirstOrDefault();

                    if (kStock == null)
                    {
                        kStock = new KitchenStock
                        {
                            OrganizationId = organizationId,
                            BranchId = branchId,
                            KitchenName = safeKitchenName,
                            InventoryItemId = req.InventoryItemId,
                            CurrentStock = 0m,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.KitchenStocks.Add(kStock);
                    }

                    // If multiple duplicate rows exist across Kitchen / Main Kitchen, consolidate into the active one
                    if (kStockList.Count > 1)
                    {
                        var otherStocks = kStockList.Where(k => k.Id != kStock.Id).ToList();
                        foreach (var other in otherStocks)
                        {
                            kStock.CurrentStock += other.CurrentStock;
                            _context.KitchenStocks.Remove(other);
                        }
                    }

                    decimal kBefore = kStock.CurrentStock;
                    decimal kAfter = Math.Max(0m, kBefore - req.RequiredQuantity);

                    kStock.CurrentStock = kAfter;
                    kStock.UpdatedAt = DateTime.UtcNow;

                    // Create audited StockTransaction entry
                    var tx = new StockTransaction
                    {
                        OrganizationId = organizationId,
                        BranchId = branchId,
                        InventoryItemId = req.InventoryItemId,
                        Type = "RECIPE_CONSUMPTION",
                        Quantity = req.RequiredQuantity,
                        StockBefore = kBefore,
                        StockAfter = kAfter,
                        Reference = referenceNumber,
                        ReferenceType = referenceType,
                        ReferenceId = referenceId,
                        SourceLocation = safeKitchenName,
                        DestinationLocation = $"Recipe Consumption: {req.FoodSummary}",
                        Notes = $"Recipe Consumption: Consumed {UnitConversionHelper.FormatQuantityWithUnit(req.RequiredQuantity, req.Unit)} for {req.Reason}",
                        CreatedByUserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.StockTransactions.Add(tx);
                    createdTransactions.Add(tx);
                }

                await _context.SaveChangesAsync();

                if (internalTx != null)
                {
                    await internalTx.CommitAsync();
                }

                return new RecipeStockDeductionResult
                {
                    Success = true,
                    Message = "Kitchen Stock successfully deducted for recipe consumption.",
                    Transactions = createdTransactions,
                    Requirements = validation.Requirements
                };
            }
            catch (Exception ex)
            {
                if (internalTx != null)
                {
                    await internalTx.RollbackAsync();
                }
                throw new InvalidOperationException($"Failed to deduct recipe ingredients from Kitchen Stock: {ex.Message}", ex);
            }
            finally
            {
                internalTx?.Dispose();
            }
        }

        /// <summary>
        /// Restores/refunds recipe ingredients back to Kitchen Stock when an order is cancelled.
        /// </summary>
        public async Task RestoreRecipeStockAsync(
            int organizationId,
            int branchId,
            string kitchenName,
            IEnumerable<(int MenuItemId, decimal Quantity)> foodItems,
            int userId,
            string referenceNumber,
            string referenceType,
            string referenceId,
            IDbContextTransaction? existingTransaction = null)
        {
            var safeKitchenName = string.IsNullOrWhiteSpace(kitchenName) ? "Main Kitchen" : kitchenName.Trim();
            var altKitchenName = safeKitchenName.Equals("Main Kitchen", StringComparison.OrdinalIgnoreCase)
                ? "Kitchen"
                : (safeKitchenName.Equals("Kitchen", StringComparison.OrdinalIgnoreCase) ? "Main Kitchen" : safeKitchenName);

            var foodList = foodItems.Where(f => f.MenuItemId > 0 && f.Quantity > 0).ToList();
            if (foodList.Count == 0) return;

            var menuIds = foodList.Select(f => f.MenuItemId).Distinct().ToList();
            var menuItems = await _context.MenuItems
                .Include(m => m.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .Where(m => menuIds.Contains(m.Id) && m.OrganizationId == organizationId && m.BranchId == branchId)
                .ToDictionaryAsync(m => m.Id);

            foreach (var food in foodList)
            {
                if (!menuItems.TryGetValue(food.MenuItemId, out var menuItem) || menuItem.Ingredients == null || menuItem.Ingredients.Count == 0)
                    continue;

                foreach (var recipe in menuItem.Ingredients)
                {
                    var invItem = recipe.InventoryItem ?? await _context.InventoryItems.FindAsync(recipe.InventoryItemId);
                    if (invItem == null) continue;

                    var rawRequired = recipe.Quantity * food.Quantity;
                    var qtyToRestore = UnitConversionHelper.ConvertQuantity(
                        rawRequired,
                        recipe.Unit ?? invItem.Unit,
                        invItem.Unit
                    );

                    var kStockList = await _context.KitchenStocks
                        .Where(k => k.OrganizationId == organizationId &&
                                    k.BranchId == branchId &&
                                    (k.KitchenName == safeKitchenName || k.KitchenName == altKitchenName) &&
                                    k.InventoryItemId == invItem.Id)
                        .ToListAsync();

                    var kStock = kStockList.FirstOrDefault(k => k.KitchenName.Equals(safeKitchenName, StringComparison.OrdinalIgnoreCase))
                                 ?? kStockList.FirstOrDefault();

                    if (kStock == null)
                    {
                        kStock = new KitchenStock
                        {
                            OrganizationId = organizationId,
                            BranchId = branchId,
                            KitchenName = safeKitchenName,
                            InventoryItemId = invItem.Id,
                            CurrentStock = 0m,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.KitchenStocks.Add(kStock);
                    }

                    decimal kBefore = kStock.CurrentStock;
                    decimal kAfter = kBefore + qtyToRestore;
                    kStock.CurrentStock = kAfter;
                    kStock.UpdatedAt = DateTime.UtcNow;

                    var tx = new StockTransaction
                    {
                        OrganizationId = organizationId,
                        BranchId = branchId,
                        InventoryItemId = invItem.Id,
                        Type = "RECIPE_RESTORE",
                        Quantity = qtyToRestore,
                        StockBefore = kBefore,
                        StockAfter = kAfter,
                        Reference = referenceNumber,
                        ReferenceType = referenceType,
                        ReferenceId = referenceId,
                        SourceLocation = "Order Cancellation",
                        DestinationLocation = safeKitchenName,
                        Notes = $"Order #{referenceNumber} Cancelled: Restored {UnitConversionHelper.FormatQuantityWithUnit(qtyToRestore, invItem.Unit)} for {menuItem.Name} × {food.Quantity}",
                        CreatedByUserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.StockTransactions.Add(tx);
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
