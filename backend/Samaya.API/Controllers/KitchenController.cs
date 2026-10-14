using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;
using Samaya.API.Services;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/kitchen")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager,Accountant,Cashier")]
    public class KitchenController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        private readonly RecipeStockService _recipeStockService;

        public KitchenController(SamayaDbContext context, RecipeStockService recipeStockService)
        {
            _context = context;
            _recipeStockService = recipeStockService;
        }

        #region Dashboard

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var itemsQuery = _context.InventoryItems.AsNoTracking().Where(i => i.OrganizationId == orgId.Value && i.IsActive);
            if (targetBranchId.HasValue) itemsQuery = itemsQuery.Where(i => i.BranchId == targetBranchId.Value);

            var totalItems = await itemsQuery.CountAsync();
            var inStock = await itemsQuery.CountAsync(i => i.CurrentStock > (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock));
            var lowStock = await itemsQuery.CountAsync(i => i.CurrentStock > 0 && i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock));
            var outOfStock = await itemsQuery.CountAsync(i => i.CurrentStock <= 0);
            var totalStockQuantity = await itemsQuery.SumAsync(i => i.CurrentStock);

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var prodQuery = _context.ActualProductions.AsNoTracking().Where(p => p.OrganizationId == orgId.Value && p.ProductionDate >= today && p.ProductionDate < tomorrow);
            if (targetBranchId.HasValue) prodQuery = prodQuery.Where(p => p.BranchId == targetBranchId.Value);
            var todayProductionCount = await prodQuery.CountAsync();
            var todayProductionQty = await prodQuery.SumAsync(p => p.ActualQuantity);

            var issuesQuery = _context.MaterialIssues.AsNoTracking().Where(m => m.OrganizationId == orgId.Value && m.CreatedAt >= today && m.CreatedAt < tomorrow);
            if (targetBranchId.HasValue) issuesQuery = issuesQuery.Where(m => m.BranchId == targetBranchId.Value);
            var todayIssuesCount = await issuesQuery.CountAsync();
            var todayIssuesQty = await issuesQuery.SumAsync(m => m.Quantity);

            var transfersQuery = _context.StockTransfers.AsNoTracking().Where(t => t.OrganizationId == orgId.Value && (t.Status == "PENDING" || t.Status == "IN_TRANSIT"));
            if (targetBranchId.HasValue) transfersQuery = transfersQuery.Where(t => t.FromBranchId == targetBranchId.Value || t.ToBranchId == targetBranchId.Value);
            var pendingTransfers = await transfersQuery.CountAsync();

            var purchasesQuery = _context.Purchases.AsNoTracking().Where(p => p.OrganizationId == orgId.Value && (p.Status == "Draft" || p.Status == "Ordered"));
            if (targetBranchId.HasValue) purchasesQuery = purchasesQuery.Where(p => p.BranchId == targetBranchId.Value);
            var pendingPurchases = await purchasesQuery.CountAsync();

            var categoryStock = await itemsQuery
                .GroupBy(i => i.Category)
                .Select(g => new
                {
                    category = g.Key,
                    count = g.Count(),
                    totalQuantity = g.Sum(x => x.CurrentStock)
                })
                .OrderByDescending(c => c.totalQuantity)
                .Take(8)
                .ToListAsync();

            var recentMovements = await _context.StockTransactions
                .AsNoTracking()
                .Include(t => t.InventoryItem)
                .Include(t => t.Branch)
                .Where(t => t.OrganizationId == orgId.Value && (!targetBranchId.HasValue || t.BranchId == targetBranchId.Value))
                .OrderByDescending(t => t.CreatedAt)
                .Take(10)
                .Select(t => new
                {
                    t.Id,
                    t.Type,
                    itemName = t.InventoryItem != null ? t.InventoryItem.Name : "",
                    unit = t.InventoryItem != null ? t.InventoryItem.Unit : "",
                    t.Quantity,
                    t.StockBefore,
                    t.StockAfter,
                    branchName = t.Branch != null ? t.Branch.Name : "",
                    t.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                metrics = new
                {
                    totalItems,
                    inStock,
                    lowStock,
                    outOfStock,
                    totalStockQuantity,
                    todayProductionCount,
                    todayProductionQty,
                    todayIssuesCount,
                    todayIssuesQty,
                    pendingTransfers,
                    pendingPurchases
                },
                categoryStock,
                recentMovements
            });
        }

        #endregion

        #region Vendors (Suppliers)

        [HttpGet("vendors")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> GetVendors([FromQuery] string? search = null, [FromQuery] bool includeInactive = false)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var query = _context.Suppliers.AsNoTracking().Where(s => s.OrganizationId == orgId.Value);
            if (!includeInactive) query = query.Where(s => s.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(term) ||
                                         (s.ContactPerson != null && s.ContactPerson.ToLower().Contains(term)) ||
                                         s.Phone.Contains(term) ||
                                         s.Email.ToLower().Contains(term));
            }

            var vendors = await query
                .OrderBy(s => s.Name)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.ContactPerson,
                    s.Phone,
                    s.Email,
                    s.Address,
                    s.GstNumber,
                    s.IsActive,
                    s.CreatedAt,
                    s.UpdatedAt,
                    purchaseCount = s.Purchases.Count
                })
                .ToListAsync();

            return Ok(vendors);
        }

        [HttpPost("vendors")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> CreateVendor(CreateVendorRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Phone))
                return BadRequest(new { message = "Vendor name and phone number are required." });

            var exists = await _context.Suppliers.AnyAsync(s => s.OrganizationId == orgId.Value && s.Name.ToLower() == request.Name.Trim().ToLower());
            if (exists)
                return BadRequest(new { message = "A vendor with this name already exists in your organization." });

            var vendor = new Supplier
            {
                OrganizationId = orgId.Value,
                Name = request.Name.Trim(),
                ContactPerson = request.ContactPerson?.Trim(),
                Phone = request.Phone.Trim(),
                Email = request.Email?.Trim() ?? string.Empty,
                Address = request.Address?.Trim() ?? string.Empty,
                GstNumber = request.GstNumber?.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Suppliers.Add(vendor);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Vendor created successfully.", vendor });
        }

        [HttpPut("vendors/{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> UpdateVendor(int id, UpdateVendorRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var vendor = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.OrganizationId == orgId.Value);
            if (vendor == null) return NotFound(new { message = "Vendor not found." });

            vendor.Name = request.Name.Trim();
            vendor.ContactPerson = request.ContactPerson?.Trim();
            vendor.Phone = request.Phone.Trim();
            vendor.Email = request.Email?.Trim() ?? string.Empty;
            vendor.Address = request.Address?.Trim() ?? string.Empty;
            vendor.GstNumber = request.GstNumber?.Trim();
            vendor.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Vendor updated successfully.", vendor });
        }

        [HttpDelete("vendors/{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> DeactivateVendor(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var vendor = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.OrganizationId == orgId.Value);
            if (vendor == null) return NotFound(new { message = "Vendor not found." });

            vendor.IsActive = !vendor.IsActive;
            vendor.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = vendor.IsActive ? "Vendor activated." : "Vendor deactivated.", isActive = vendor.IsActive });
        }

        #endregion

        #region Purchases & Goods Receipt (With MySQL Transactions)

        [HttpGet("purchases")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> GetPurchases([FromQuery] int? branchId = null, [FromQuery] string? status = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.Purchases
                .AsNoTracking()
                .Include(p => p.Supplier)
                .Include(p => p.Branch)
                .Include(p => p.CreatedByUser)
                .Include(p => p.Items)
                    .ThenInclude(i => i.InventoryItem)
                .Where(p => p.OrganizationId == orgId.Value);

            if (targetBranchId.HasValue) query = query.Where(p => p.BranchId == targetBranchId.Value);
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status.ToLower() == status.Trim().ToLower());

            var purchases = await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(200)
                .Select(p => new
                {
                    p.Id,
                    purchaseNumber = p.PurchaseNumber ?? p.InvoiceNumber,
                    p.InvoiceNumber,
                    vendorId = p.SupplierId,
                    vendorName = p.Supplier != null ? p.Supplier.Name : "",
                    branchId = p.BranchId,
                    branchName = p.Branch != null ? p.Branch.Name : "",
                    purchaseDate = p.PurchaseDate ?? p.CreatedAt,
                    p.TotalAmount,
                    p.Status,
                    p.Notes,
                    createdBy = p.CreatedByUser != null ? p.CreatedByUser.Name : "",
                    p.CreatedAt,
                    p.UpdatedAt,
                    itemCount = p.Items.Count,
                    items = p.Items.Select(i => new
                    {
                        i.Id,
                        i.InventoryItemId,
                        itemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                        quantity = i.Quantity,
                        returnedQuantity = i.ReturnedQuantity,
                        returnReason = i.ReturnReason,
                        unit = i.Unit ?? (i.InventoryItem != null ? i.InventoryItem.Unit : ""),
                        rate = i.UnitCost,
                        amount = i.TotalCost,
                        i.BatchNumber,
                        i.ExpiryDate
                    })
                })
                .ToListAsync();

            return Ok(purchases);
        }

        [HttpPost("purchases")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> CreatePurchase(CreatePurchaseRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });

            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "At least one item is required for purchase." });

            var vendorId = request.EffectiveVendorId;
            var vendor = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == vendorId && s.OrganizationId == orgId.Value && s.IsActive);
            if (vendor == null) return BadRequest(new { message = "Invalid vendor selected." });

            var purchaseNumber = $"PUR-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

            var purchase = new Purchase
            {
                OrganizationId = orgId.Value,
                BranchId = branchId.Value,
                SupplierId = vendor.Id,
                PurchaseNumber = purchaseNumber,
                InvoiceNumber = string.IsNullOrWhiteSpace(request.InvoiceNumber) ? purchaseNumber : request.InvoiceNumber.Trim(),
                PurchaseDate = request.PurchaseDate ?? DateTime.UtcNow,
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Draft" : request.Status.Trim(),
                Notes = request.Notes?.Trim(),
                CreatedByUserId = userId.Value,
                CreatedAt = DateTime.UtcNow
            };

            decimal total = 0;
            foreach (var line in request.Items)
            {
                var effectiveRate = line.EffectiveRate;
                if (line.Quantity <= 0 || effectiveRate < 0)
                    return BadRequest(new { message = "Item quantity must be > 0 and rate >= 0." });

                var invItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == line.InventoryItemId && i.OrganizationId == orgId.Value && i.BranchId == branchId.Value);
                if (invItem == null)
                    return BadRequest(new { message = $"Inventory item ID {line.InventoryItemId} is not valid for the selected branch." });

                var lineTotal = line.Quantity * effectiveRate;
                total += lineTotal;

                purchase.Items.Add(new PurchaseItem
                {
                    InventoryItemId = invItem.Id,
                    Quantity = line.Quantity,
                    UnitCost = effectiveRate,
                    TotalCost = lineTotal,
                    Unit = string.IsNullOrWhiteSpace(line.Unit) ? invItem.Unit : line.Unit.Trim(),
                    BatchNumber = line.BatchNumber?.Trim(),
                    ExpiryDate = line.ExpiryDate
                });
            }

            purchase.TotalAmount = total;

            // If immediately confirmed as Received, use database transaction
            if (purchase.Status.Equals("Received", StringComparison.OrdinalIgnoreCase))
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    _context.Purchases.Add(purchase);
                    await _context.SaveChangesAsync();

                    foreach (var line in purchase.Items)
                    {
                        var invItem = await _context.InventoryItems.FirstAsync(i => i.Id == line.InventoryItemId);
                        var stockBefore = invItem.CurrentStock;
                        invItem.CurrentStock += line.Quantity;
                        invItem.LastPurchasePrice = line.UnitCost;
                        invItem.UpdatedAt = DateTime.UtcNow;

                        _context.StockTransactions.Add(new StockTransaction
                        {
                            OrganizationId = orgId.Value,
                            BranchId = branchId.Value,
                            InventoryItemId = invItem.Id,
                            Type = "PURCHASE",
                            Quantity = line.Quantity,
                            StockBefore = stockBefore,
                            StockAfter = invItem.CurrentStock,
                            Reference = purchase.PurchaseNumber,
                            ReferenceType = "PurchaseReceipt",
                            ReferenceId = purchase.Id.ToString(),
                            SourceLocation = vendor.Name,
                            DestinationLocation = "Main Kitchen / Store",
                            Notes = $"Goods received for PO {purchase.PurchaseNumber}",
                            CreatedByUserId = userId.Value,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { message = "Purchase order created and goods received into inventory.", purchaseId = purchase.Id, purchaseNumber = purchase.PurchaseNumber });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "Failed to record purchase and receive stock: " + ex.Message });
                }
            }

            _context.Purchases.Add(purchase);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Purchase order created successfully.", purchaseId = purchase.Id, purchaseNumber = purchase.PurchaseNumber });
        }

        [HttpPost("purchases/{id:int}/receive")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> ReceiveGoods(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var purchase = await _context.Purchases
                .Include(p => p.Supplier)
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (purchase == null) return NotFound(new { message = "Purchase order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, purchase.BranchId))
                return Forbid();

            if (purchase.Status.Equals("Received", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "This purchase order has already been received into inventory." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                purchase.Status = "Received";
                purchase.UpdatedAt = DateTime.UtcNow;

                var vendorName = purchase.Supplier != null ? purchase.Supplier.Name : "Vendor";

                foreach (var line in purchase.Items)
                {
                    var invItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == line.InventoryItemId && i.OrganizationId == orgId.Value);
                    if (invItem == null)
                        throw new InvalidOperationException($"Inventory item ID {line.InventoryItemId} not found.");

                    var before = invItem.CurrentStock;
                    invItem.CurrentStock += line.Quantity;
                    invItem.LastPurchasePrice = line.UnitCost;
                    invItem.UpdatedAt = DateTime.UtcNow;

                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = purchase.BranchId,
                        InventoryItemId = invItem.Id,
                        Type = "PURCHASE",
                        Quantity = line.Quantity,
                        StockBefore = before,
                        StockAfter = invItem.CurrentStock,
                        Reference = purchase.PurchaseNumber ?? purchase.InvoiceNumber,
                        ReferenceType = "PurchaseReceipt",
                        ReferenceId = purchase.Id.ToString(),
                        SourceLocation = vendorName,
                        DestinationLocation = "Kitchen Store",
                        Notes = $"Goods receipt confirmed for purchase {purchase.PurchaseNumber ?? purchase.InvoiceNumber}",
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Goods receipt confirmed. Inventory stock updated successfully.", purchaseId = purchase.Id });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to receive goods: " + ex.Message });
            }
        }

        [HttpPost("purchases/{id:int}/return")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Accountant,Cashier")]
        public async Task<IActionResult> ReturnPurchaseItems(int id, [FromBody] PurchaseReturnRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var purchase = await _context.Purchases
                .Include(p => p.Supplier)
                .Include(p => p.Items)
                    .ThenInclude(i => i.InventoryItem)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (purchase == null) return NotFound(new { message = "Purchase order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, purchase.BranchId))
                return Forbid();

            if (!purchase.Status.Equals("Received", StringComparison.OrdinalIgnoreCase) &&
                !purchase.Status.Equals("Partially Returned", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Only received purchases can have items returned to the vendor." });
            }

            if (request.Items == null || !request.Items.Any(i => i.Quantity > 0))
            {
                return BadRequest(new { message = "Please specify at least one item and quantity > 0 to return." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var vendorName = purchase.Supplier != null ? purchase.Supplier.Name : "Vendor";
                var defaultReason = string.IsNullOrWhiteSpace(request.Reason) ? "Damaged / Spoiled" : request.Reason.Trim();

                foreach (var line in request.Items.Where(i => i.Quantity > 0))
                {
                    var purchaseItem = purchase.Items.FirstOrDefault(i => i.Id == line.PurchaseItemId);
                    if (purchaseItem == null)
                        throw new InvalidOperationException($"Purchase item ID {line.PurchaseItemId} does not belong to this purchase order.");

                    var remainingReturnable = purchaseItem.Quantity - purchaseItem.ReturnedQuantity;
                    if (line.Quantity > remainingReturnable)
                        throw new InvalidOperationException($"Cannot return {line.Quantity} {purchaseItem.Unit}. Maximum returnable remaining quantity is {remainingReturnable} {purchaseItem.Unit}.");

                    var invItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == purchaseItem.InventoryItemId && i.OrganizationId == orgId.Value);
                    if (invItem == null)
                        throw new InvalidOperationException($"Inventory item for ID {purchaseItem.InventoryItemId} not found.");

                    if (invItem.CurrentStock < line.Quantity)
                        throw new InvalidOperationException($"Insufficient inventory stock. Current available stock for {invItem.Name} is {invItem.CurrentStock} {invItem.Unit}, but return quantity is {line.Quantity} {invItem.Unit}.");

                    var before = invItem.CurrentStock;
                    invItem.CurrentStock -= line.Quantity;
                    invItem.UpdatedAt = DateTime.UtcNow;

                    purchaseItem.ReturnedQuantity += line.Quantity;
                    var itemReason = string.IsNullOrWhiteSpace(line.Reason) ? defaultReason : line.Reason.Trim();
                    purchaseItem.ReturnReason = itemReason;

                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = purchase.BranchId,
                        InventoryItemId = invItem.Id,
                        Type = "PURCHASE_RETURN",
                        Quantity = line.Quantity,
                        StockBefore = before,
                        StockAfter = invItem.CurrentStock,
                        Reference = purchase.PurchaseNumber ?? purchase.InvoiceNumber,
                        ReferenceType = "PurchaseReturn",
                        ReferenceId = purchase.Id.ToString(),
                        SourceLocation = "Kitchen Store",
                        DestinationLocation = vendorName,
                        Notes = $"Purchase Return ({itemReason}): Returned {line.Quantity} {purchaseItem.Unit} of {invItem.Name} to {vendorName}. {request.Notes}".Trim(),
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                bool allReturned = purchase.Items.All(i => i.ReturnedQuantity >= i.Quantity);
                purchase.Status = allReturned ? "Returned" : "Partially Returned";
                purchase.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Purchase return processed successfully. Inventory stock reduced and audit trail logged.",
                    purchaseId = purchase.Id,
                    status = purchase.Status
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Failed to process purchase return: " + ex.Message });
            }
        }

        #endregion

        #region Reorder Alerts

        [HttpGet("reorder-alerts")]
        public async Task<IActionResult> GetReorderAlerts([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Branch)
                .Where(i => i.OrganizationId == orgId.Value && i.IsActive);

            if (targetBranchId.HasValue) query = query.Where(i => i.BranchId == targetBranchId.Value);

            // Fetch items where current stock <= reorder level OR minimum stock OR zero
            var items = await query
                .Where(i => i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) || i.CurrentStock <= 0)
                .OrderBy(i => i.CurrentStock)
                .ThenBy(i => i.Name)
                .Select(i => new
                {
                    i.Id,
                    i.ItemCode,
                    i.Name,
                    i.Category,
                    i.Unit,
                    branchId = i.BranchId,
                    branchName = i.Branch != null ? i.Branch.Name : "",
                    currentStock = i.CurrentStock,
                    reorderLevel = i.ReorderLevel,
                    minimumStock = i.MinimumStock,
                    maximumStock = i.MaximumStock,
                    stockStatus = i.CurrentStock <= 0 ? "OUT OF STOCK" : "LOW STOCK",
                    suggestedReorderQuantity = i.MaximumStock > i.CurrentStock
                        ? i.MaximumStock - i.CurrentStock
                        : (i.ReorderLevel > i.CurrentStock ? i.ReorderLevel - i.CurrentStock : (i.MinimumStock > i.CurrentStock ? i.MinimumStock - i.CurrentStock : 10)),
                    lastUpdated = i.UpdatedAt ?? i.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        #endregion

        #region Production Plans (Daily Kitchen Plan & Material Issue/Return Workflow)

        [HttpGet("production-plans")]
        public async Task<IActionResult> GetProductionPlans([FromQuery] string? branchId = null, [FromQuery] string? status = null, [FromQuery] string? date = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.ProductionPlans
                .AsNoTracking()
                .Include(p => p.MenuItem)
                .Include(p => p.Branch)
                .Include(p => p.CreatedByUser)
                .Include(p => p.Items)
                    .ThenInclude(i => i.MenuItem)
                .Include(p => p.Materials)
                    .ThenInclude(m => m.InventoryItem)
                .Where(p => p.OrganizationId == orgId.Value);

            if (targetBranchId.HasValue)
            {
                var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == targetBranchId.Value);
                if (branch?.ModuleType == "KMS Only")
                {
                    return Ok(new List<object>());
                }
                query = query.Where(p => p.BranchId == targetBranchId.Value);
            }
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status.ToLower() == status.Trim().ToLower());
            DateTime? parsedDate = null;
            if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date.Trim(), out var pDate))
            {
                parsedDate = pDate;
            }
            if (parsedDate.HasValue)
            {
                var d = parsedDate.Value.Date;
                var nextD = d.AddDays(1);
                query = query.Where(p => p.PlanDate >= d && p.PlanDate < nextD);
            }

            var plans = await query
                .OrderByDescending(p => p.PlanDate)
                .ThenByDescending(p => p.Id)
                .Take(200)
                .Select(p => new
                {
                    p.Id,
                    planNumber = p.PlanNumber ?? $"PLN-{p.Id}",
                    planDate = p.PlanDate,
                    shift = p.Shift ?? "Morning",
                    kitchenName = p.KitchenName ?? "Main Kitchen",
                    mealType = p.MealType,
                    menuItemId = p.MenuItemId,
                    menuItemName = p.MenuItem != null ? p.MenuItem.Name : "",
                    plannedQuantity = p.PlannedQuantity,
                    unit = p.Unit,
                    branchId = p.BranchId,
                    branchName = p.Branch != null ? p.Branch.Name : "",
                    status = p.Status,
                    remarks = p.Remarks,
                    createdBy = p.CreatedByUser != null ? p.CreatedByUser.Name : "",
                    p.CreatedAt,
                    p.UpdatedAt,
                    items = p.Items.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        dish = i.MenuItem != null ? i.MenuItem.Name : "",
                        menuItemName = i.MenuItem != null ? i.MenuItem.Name : "",
                        plannedQuantity = i.PlannedQuantity,
                        producedQuantity = i.ActualQuantity,
                        orderedQuantity = i.ActualSales,
                        remainingQuantity = Math.Max(0, i.PlannedQuantity - i.ActualSales),
                        availableQuantity = Math.Max(0, i.PlannedQuantity - i.ActualSales),
                        status = !string.IsNullOrWhiteSpace(i.Status) 
                            ? i.Status 
                            : (i.ActualSales >= i.PlannedQuantity ? "Completed / Fully Allocated" : (i.ActualQuantity > 0 ? "In Production" : "Planned")),
                        expectedSales = i.ExpectedSales,
                        actualQuantity = i.ActualQuantity,
                        actualSales = i.ActualSales,
                        unsoldQuantity = i.UnsoldQuantity,
                        wastageQuantity = i.WastageQuantity,
                        lossReason = i.LossReason ?? "",
                        remarks = i.Remarks ?? "",
                        variance = i.PlannedQuantity - i.ActualQuantity,
                        unit = i.Unit ?? "Portion"
                    }),
                    materials = p.Materials.Select(m => new
                    {
                        m.Id,
                        m.InventoryItemId,
                        itemName = m.InventoryItem != null ? m.InventoryItem.Name : "",
                        itemCode = m.InventoryItem != null ? m.InventoryItem.ItemCode : "",
                        centralStock = m.InventoryItem != null ? m.InventoryItem.CurrentStock : 0,
                        plannedQuantity = m.PlannedQuantity,
                        actualSentQuantity = m.ActualSentQuantity,
                        actualUsedQuantity = m.ActualUsedQuantity,
                        remainingQuantity = m.RemainingQuantity,
                        returnedQuantity = m.ReturnedQuantity,
                        wastageQuantity = m.WastageQuantity,
                        unit = m.Unit,
                        status = m.Status,
                        notes = m.Notes ?? ""
                    })
                })
                .ToListAsync();

            return Ok(plans);
        }

        [HttpGet("production-plans/{id:int}")]
        public async Task<IActionResult> GetProductionPlan(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var p = await _context.ProductionPlans
                .AsNoTracking()
                .Include(x => x.MenuItem)
                .Include(x => x.Branch)
                .Include(x => x.CreatedByUser)
                .Include(x => x.Items)
                    .ThenInclude(i => i.MenuItem)
                .Include(x => x.Materials)
                    .ThenInclude(m => m.InventoryItem)
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == orgId.Value);

            if (p == null) return NotFound(new { message = "Production plan not found." });

            return Ok(new
            {
                p.Id,
                planNumber = p.PlanNumber ?? $"PLN-{p.Id}",
                planDate = p.PlanDate,
                shift = p.Shift ?? "Morning",
                kitchenName = p.KitchenName ?? "Main Kitchen",
                mealType = p.MealType,
                menuItemId = p.MenuItemId,
                menuItemName = p.MenuItem != null ? p.MenuItem.Name : "",
                plannedQuantity = p.PlannedQuantity,
                unit = p.Unit,
                branchId = p.BranchId,
                branchName = p.Branch != null ? p.Branch.Name : "",
                status = p.Status,
                remarks = p.Remarks,
                createdBy = p.CreatedByUser != null ? p.CreatedByUser.Name : "",
                p.CreatedAt,
                p.UpdatedAt,
                items = p.Items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    dish = i.MenuItem != null ? i.MenuItem.Name : "",
                    menuItemName = i.MenuItem != null ? i.MenuItem.Name : "",
                    plannedQuantity = i.PlannedQuantity,
                    producedQuantity = i.ActualQuantity,
                    orderedQuantity = i.ActualSales,
                    remainingQuantity = Math.Max(0, i.PlannedQuantity - i.ActualSales),
                    availableQuantity = Math.Max(0, i.PlannedQuantity - i.ActualSales),
                    status = !string.IsNullOrWhiteSpace(i.Status) 
                        ? i.Status 
                        : (i.ActualSales >= i.PlannedQuantity ? "Completed / Fully Allocated" : (i.ActualQuantity > 0 ? "In Production" : "Planned")),
                    expectedSales = i.ExpectedSales,
                    actualQuantity = i.ActualQuantity,
                    actualSales = i.ActualSales,
                    unsoldQuantity = i.UnsoldQuantity,
                    wastageQuantity = i.WastageQuantity,
                    lossReason = i.LossReason ?? "",
                    remarks = i.Remarks ?? "",
                    variance = i.PlannedQuantity - i.ActualQuantity,
                    unit = i.Unit ?? "Portion"
                }),
                materials = p.Materials.Select(m => new
                {
                    m.Id,
                    m.InventoryItemId,
                    itemName = m.InventoryItem != null ? m.InventoryItem.Name : "",
                    itemCode = m.InventoryItem != null ? m.InventoryItem.ItemCode : "",
                    centralStock = m.InventoryItem != null ? m.InventoryItem.CurrentStock : 0,
                    plannedQuantity = m.PlannedQuantity,
                    actualSentQuantity = m.ActualSentQuantity,
                    actualUsedQuantity = m.ActualUsedQuantity,
                    remainingQuantity = m.RemainingQuantity,
                    returnedQuantity = m.ReturnedQuantity,
                    wastageQuantity = m.WastageQuantity,
                    unit = m.Unit,
                    status = m.Status,
                    notes = m.Notes ?? ""
                })
            });
        }

        [HttpPost("production-plans")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> CreateProductionPlan(CreateProductionPlanRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value && b.OrganizationId == orgId.Value);
            if (branch == null) return BadRequest(new { message = "Invalid branch." });
            if (branch.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "Production Plan is disabled for KMS Only branches." });
            }

            var hasDishes = (request.Items != null && request.Items.Count > 0) || request.MenuItemId > 0;
            var hasMaterials = request.Materials != null && request.Materials.Count > 0;

            if (!hasDishes && !hasMaterials)
                return BadRequest(new { message = "Please specify planned dishes or materials to send to the kitchen." });

            var planNumber = $"PLN-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

            var plan = new ProductionPlan
            {
                OrganizationId = orgId.Value,
                BranchId = branchId.Value,
                PlanNumber = planNumber,
                PlanDate = request.EffectiveDate,
                Shift = string.IsNullOrWhiteSpace(request.Shift) ? "Morning" : request.Shift.Trim(),
                KitchenName = string.IsNullOrWhiteSpace(request.KitchenName) ? "Main Kitchen" : request.KitchenName.Trim(),
                MealType = string.IsNullOrWhiteSpace(request.MealType) ? "General" : request.MealType.Trim(),
                MenuItemId = request.MenuItemId > 0 ? request.MenuItemId : null,
                PlannedQuantity = request.PlannedQuantity,
                Unit = string.IsNullOrWhiteSpace(request.Unit) ? "Portion" : request.Unit.Trim(),
                Remarks = request.EffectiveNotes?.Trim(),
                Status = string.IsNullOrWhiteSpace(request.Status) ? "PLANNED" : request.Status.Trim().ToUpperInvariant(),
                CreatedByUserId = userId.Value,
                CreatedAt = DateTime.UtcNow
            };

            // Add Dishes to produce
            if (request.Items != null && request.Items.Count > 0)
            {
                foreach (var item in request.Items.Where(i => i.MenuItemId > 0))
                {
                    plan.Items.Add(new ProductionPlanItem
                    {
                        MenuItemId = item.MenuItemId,
                        PlannedQuantity = item.PlannedQuantity,
                        ExpectedSales = item.ExpectedSales > 0 ? item.ExpectedSales : item.PlannedQuantity,
                        ActualQuantity = item.ActualQuantity,
                        ActualSales = item.ActualSales,
                        UnsoldQuantity = item.UnsoldQuantity,
                        WastageQuantity = item.WastageQuantity,
                        LossReason = item.LossReason,
                        Remarks = item.Remarks,
                        Status = string.IsNullOrWhiteSpace(item.Status) ? "Planned" : item.Status.Trim(),
                        RemainingQuantity = Math.Max(0, item.PlannedQuantity - item.ActualSales),
                        Unit = item.Unit ?? "Portion"
                    });
                }
            }
            else if (request.MenuItemId > 0)
            {
                plan.Items.Add(new ProductionPlanItem
                {
                    MenuItemId = request.MenuItemId,
                    PlannedQuantity = request.PlannedQuantity,
                    ExpectedSales = request.PlannedQuantity,
                    Status = "Planned",
                    RemainingQuantity = request.PlannedQuantity,
                    Unit = request.Unit ?? "Portion"
                });
            }

            // Add Materials to send
            if (request.Materials != null && request.Materials.Count > 0)
            {
                foreach (var mat in request.Materials.Where(m => m.InventoryItemId > 0))
                {
                    plan.Materials.Add(new ProductionPlanMaterial
                    {
                        InventoryItemId = mat.InventoryItemId,
                        PlannedQuantity = mat.PlannedQuantity,
                        ActualSentQuantity = mat.ActualSentQuantity ?? 0,
                        ActualUsedQuantity = 0,
                        RemainingQuantity = 0,
                        ReturnedQuantity = 0,
                        WastageQuantity = 0,
                        Unit = string.IsNullOrWhiteSpace(mat.Unit) ? "KG" : mat.Unit.Trim(),
                        Status = "PLANNED",
                        Notes = mat.Notes,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.ProductionPlans.Add(plan);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Daily Kitchen Production Plan created successfully.",
                planId = plan.Id,
                planNumber = plan.PlanNumber
            });
        }

        [HttpPut("production-plans/{id:int}")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> UpdateProductionPlan(int id, UpdateProductionPlanRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Items)
                .Include(p => p.Materials)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            if (request.PlanDate.HasValue) plan.PlanDate = request.PlanDate.Value;
            if (!string.IsNullOrWhiteSpace(request.Shift)) plan.Shift = request.Shift.Trim();
            if (!string.IsNullOrWhiteSpace(request.KitchenName)) plan.KitchenName = request.KitchenName.Trim();
            if (!string.IsNullOrWhiteSpace(request.MealType)) plan.MealType = request.MealType.Trim();
            if (request.Remarks != null) plan.Remarks = request.Remarks.Trim();
            if (!string.IsNullOrWhiteSpace(request.Status)) plan.Status = request.Status.Trim().ToUpperInvariant();
            plan.UpdatedAt = DateTime.UtcNow;

            // Allow modifying dishes & planned material quantities before or during production (until closed/cancelled)
            if (plan.Status is not "CLOSED" and not "CANCELLED")
            {
                if (request.Items != null)
                {
                    // Update or add dishes
                    foreach (var item in request.Items.Where(i => i.MenuItemId > 0))
                    {
                        var existing = plan.Items.FirstOrDefault(x => x.MenuItemId == item.MenuItemId);
                        if (existing != null)
                        {
                            existing.PlannedQuantity = item.PlannedQuantity;
                            existing.ExpectedSales = item.ExpectedSales > 0 ? item.ExpectedSales : item.PlannedQuantity;
                            existing.RemainingQuantity = Math.Max(0, existing.PlannedQuantity - existing.ActualSales);
                            if (!string.IsNullOrWhiteSpace(item.Status)) existing.Status = item.Status;
                            else if (existing.ActualSales >= existing.PlannedQuantity) existing.Status = "Completed / Fully Allocated";
                            existing.Unit = item.Unit ?? existing.Unit;
                        }
                        else
                        {
                            plan.Items.Add(new ProductionPlanItem
                            {
                                MenuItemId = item.MenuItemId,
                                PlannedQuantity = item.PlannedQuantity,
                                ExpectedSales = item.ExpectedSales > 0 ? item.ExpectedSales : item.PlannedQuantity,
                                RemainingQuantity = item.PlannedQuantity,
                                Status = string.IsNullOrWhiteSpace(item.Status) ? "Planned" : item.Status.Trim(),
                                Unit = item.Unit ?? "Portion"
                            });
                        }
                    }

                    // Remove dishes not in updated list
                    var keepMenuIds = request.Items.Select(x => x.MenuItemId).ToHashSet();
                    var toRemoveItems = plan.Items.Where(x => !keepMenuIds.Contains(x.MenuItemId)).ToList();
                    foreach (var rem in toRemoveItems) plan.Items.Remove(rem);
                }

                if (request.Materials != null)
                {
                    // Update or add materials to send
                    foreach (var mat in request.Materials.Where(m => m.InventoryItemId > 0))
                    {
                        var existingMat = plan.Materials.FirstOrDefault(m => m.InventoryItemId == mat.InventoryItemId);
                        if (existingMat != null)
                        {
                            existingMat.PlannedQuantity = mat.PlannedQuantity;
                            existingMat.Unit = string.IsNullOrWhiteSpace(mat.Unit) ? existingMat.Unit : mat.Unit.Trim();
                            existingMat.Notes = mat.Notes ?? existingMat.Notes;
                        }
                        else
                        {
                            plan.Materials.Add(new ProductionPlanMaterial
                            {
                                InventoryItemId = mat.InventoryItemId,
                                PlannedQuantity = mat.PlannedQuantity,
                                ActualSentQuantity = 0,
                                RemainingQuantity = 0,
                                Unit = string.IsNullOrWhiteSpace(mat.Unit) ? "KG" : mat.Unit.Trim(),
                                Status = "PLANNED",
                                Notes = mat.Notes,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    // Remove materials not in updated list
                    var keepInvIds = request.Materials.Select(x => x.InventoryItemId).ToHashSet();
                    var toRemoveMats = plan.Materials.Where(x => !keepInvIds.Contains(x.InventoryItemId)).ToList();
                    foreach (var rem in toRemoveMats) plan.Materials.Remove(rem);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Production plan updated successfully." });
        }

        [HttpPost("production-plans/{id:int}/issue-materials")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef")]
        public async Task<IActionResult> IssueMaterials(int id, IssueMaterialsRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Materials)
                    .ThenInclude(m => m.InventoryItem)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            var planBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == plan.BranchId && b.OrganizationId == orgId.Value);
            if (planBranch?.ModuleType == "POS Only")
            {
                return BadRequest(new { message = "Material Issue is disabled for POS Only branches." });
            }
            if (planBranch?.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "Production Plan is disabled for KMS Only branches." });
            }

            if (plan.Materials.Count == 0)
                return BadRequest(new { message = "No materials specified in this production plan to issue." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Determine quantities to issue per material
                var issueQuantities = new Dictionary<int, decimal>();
                if (request.Items != null && request.Items.Count > 0)
                {
                    foreach (var item in request.Items)
                    {
                        if (item.ActualSentQuantity > 0)
                            issueQuantities[item.InventoryItemId] = item.ActualSentQuantity;
                    }
                }
                else
                {
                    foreach (var mat in plan.Materials)
                    {
                        var qty = mat.PlannedQuantity > 0 ? mat.PlannedQuantity : mat.ActualSentQuantity;
                        if (qty > 0) issueQuantities[mat.InventoryItemId] = qty;
                    }
                }

                if (issueQuantities.Count == 0)
                    return BadRequest(new { message = "Please specify valid quantities to send to the kitchen." });

                // 1. Validate Central Inventory stock
                foreach (var (invId, qty) in issueQuantities)
                {
                    var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == invId && i.OrganizationId == orgId.Value && i.BranchId == plan.BranchId);
                    if (item == null)
                        return BadRequest(new { message = $"Inventory item #{invId} not found in this branch." });

                    if (item.CurrentStock < qty)
                    {
                        return BadRequest(new
                        {
                            message = $"Insufficient Central Inventory stock for {item.Name}. Requested: {qty} {item.Unit}, Available: {item.CurrentStock} {item.Unit}."
                        });
                    }
                }

                // 2. Deduct from Central Inventory, credit Kitchen Stock, and record stock transaction
                decimal totalSent = 0;
                var issuedLines = new List<(InventoryItem item, decimal qty, decimal before, decimal after, decimal kBefore, decimal kAfter)>();

                foreach (var (invId, qty) in issueQuantities)
                {
                    var item = await _context.InventoryItems.FirstAsync(i => i.Id == invId);
                    var before = item.CurrentStock;
                    var after = before - qty;
                    item.CurrentStock = after;
                    item.UpdatedAt = DateTime.UtcNow;
                    _context.Entry(item).Property(i => i.CurrentStock).IsModified = true;
                    _context.Entry(item).Property(i => i.UpdatedAt).IsModified = true;
                    totalSent += qty;

                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE inventory_items SET CurrentStock = {after}, UpdatedAt = UTC_TIMESTAMP(6) WHERE Id = {item.Id};");

                    // Update or create KitchenStock record
                    var kStock = await _context.KitchenStocks.FirstOrDefaultAsync(k =>
                        k.OrganizationId == orgId.Value &&
                        k.BranchId == plan.BranchId &&
                        k.KitchenName == (plan.KitchenName ?? "Main Kitchen") &&
                        k.InventoryItemId == invId);

                    decimal kBefore = kStock?.CurrentStock ?? 0;
                    decimal kAfter = kBefore + qty;

                    if (kStock == null)
                    {
                        kStock = new KitchenStock
                        {
                            OrganizationId = orgId.Value,
                            BranchId = plan.BranchId,
                            KitchenName = plan.KitchenName ?? "Main Kitchen",
                            InventoryItemId = invId,
                            CurrentStock = kAfter,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.KitchenStocks.Add(kStock);
                    }
                    else
                    {
                        kStock.CurrentStock = kAfter;
                        kStock.UpdatedAt = DateTime.UtcNow;
                    }

                    issuedLines.Add((item, qty, before, after, kBefore, kAfter));

                    // Update plan material line
                    var planMat = plan.Materials.FirstOrDefault(m => m.InventoryItemId == invId);
                    if (planMat != null)
                    {
                        planMat.ActualSentQuantity = qty;
                        planMat.RemainingQuantity = qty;
                        planMat.Status = "ISSUED";
                        planMat.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        plan.Materials.Add(new ProductionPlanMaterial
                        {
                            InventoryItemId = invId,
                            PlannedQuantity = qty,
                            ActualSentQuantity = qty,
                            RemainingQuantity = qty,
                            Unit = item.Unit,
                            Status = "ISSUED",
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    // Record proper Stock Transaction: Central Inventory -> Kitchen
                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = plan.BranchId,
                        InventoryItemId = item.Id,
                        Type = "MATERIAL_ISSUE",
                        Quantity = qty,
                        StockBefore = before,
                        StockAfter = after,
                        Reference = plan.PlanNumber ?? $"PLN-{plan.Id}",
                        ReferenceType = "ProductionPlan",
                        ReferenceId = plan.Id.ToString(),
                        SourceLocation = "Central Inventory",
                        DestinationLocation = plan.KitchenName ?? "Main Kitchen",
                        Notes = $"Material Issue: {qty} {item.Unit} of {item.Name} issued to {plan.KitchenName ?? "Main Kitchen"} for Daily Plan #{plan.PlanNumber}",
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // 3. Create linked MaterialIssue record for audit and reporting
                var issueNumber = $"ISS-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var matIssue = new MaterialIssue
                {
                    OrganizationId = orgId.Value,
                    BranchId = plan.BranchId,
                    IssueNumber = issueNumber,
                    Date = plan.PlanDate,
                    IssueType = "Kitchen",
                    Department = plan.KitchenName ?? "Main Kitchen",
                    Reference = plan.PlanNumber ?? $"PLN-{plan.Id}",
                    ProductionPlanId = plan.Id,
                    Quantity = totalSent,
                    Notes = request.Notes ?? $"Kitchen Issue for Daily Production Plan #{plan.PlanNumber}",
                    Status = "Confirmed",
                    ReceivedBy = request.ReceivedBy ?? plan.KitchenName ?? "Kitchen Staff",
                    ApprovedBy = request.ApprovedBy ?? "Kitchen Manager",
                    CreatedByUserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };

                _context.MaterialIssues.Add(matIssue);
                await _context.SaveChangesAsync();

                foreach (var line in issuedLines)
                {
                    _context.MaterialIssueItems.Add(new MaterialIssueItem
                    {
                        MaterialIssueId = matIssue.Id,
                        InventoryItemId = line.item.Id,
                        Quantity = line.qty,
                        Unit = line.item.Unit,
                        StockBefore = line.before,
                        StockAfter = line.after,
                        KitchenStockBefore = line.kBefore,
                        KitchenStockAfter = line.kAfter
                    });
                }

                plan.Status = "ISSUED";
                plan.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Materials successfully issued to kitchen. Central Inventory deducted.",
                    planId = plan.Id,
                    planNumber = plan.PlanNumber,
                    issueNumber = matIssue.IssueNumber,
                    status = plan.Status
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to issue materials: " + ex.Message });
            }
        }

        [HttpPost("production-plans/{id:int}/record-usage")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> RecordKitchenUsage(int id, RecordKitchenUsageRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Materials)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            foreach (var line in request.Materials)
            {
                var mat = plan.Materials.FirstOrDefault(m => (line.MaterialId.HasValue && m.Id == line.MaterialId.Value) || m.InventoryItemId == line.InventoryItemId);
                if (mat != null)
                {
                    mat.ActualUsedQuantity = Math.Max(0, line.ActualUsedQuantity);
                    mat.WastageQuantity = Math.Max(0, line.WastageQuantity);
                    mat.RemainingQuantity = Math.Max(0, mat.ActualSentQuantity - mat.ActualUsedQuantity - mat.WastageQuantity - mat.ReturnedQuantity);
                    if (!string.IsNullOrWhiteSpace(line.Notes)) mat.Notes = line.Notes.Trim();
                    mat.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (plan.Status == "ISSUED") plan.Status = "IN_PROGRESS";
            plan.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Kitchen usage successfully recorded." });
        }

        [HttpPost("production-plans/{id:int}/record-production")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> RecordActualProduction(int id, RecordActualProductionRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Items)
                    .ThenInclude(i => i.MenuItem)
                        .ThenInclude(m => m!.Ingredients)
                            .ThenInclude(ing => ing.InventoryItem)
                .Include(p => p.Materials)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            // Normalize single-item request if sent directly
            if (request.Items.Count == 0 && request.MenuItemId.HasValue && request.MenuItemId.Value > 0)
            {
                var q = request.ActualQuantity ?? request.Quantity ?? 0m;
                if (q > 0)
                {
                    request.Items.Add(new RecordDishProductionLineRequest
                    {
                        MenuItemId = request.MenuItemId.Value,
                        ActualQuantity = q
                    });
                }
            }

            if (request.Items.Count == 0)
            {
                return BadRequest(new { message = "Add at least one dish item and quantity to produce." });
            }

            var kitchenName = string.IsNullOrWhiteSpace(plan.KitchenName) ? "Main Kitchen" : plan.KitchenName.Trim();

            // Calculate delta produced and collect items for stock validation
            var itemsToProduce = new List<(ProductionPlanItem Item, decimal DeltaProduced)>();
            var foodsToDeduct = new List<(int MenuItemId, decimal Quantity)>();

            foreach (var line in request.Items)
            {
                var item = plan.Items.FirstOrDefault(i => (line.PlanItemId.HasValue && i.Id == line.PlanItemId.Value) || i.MenuItemId == line.MenuItemId);
                if (item != null)
                {
                    var qtyToCook = line.ActualQuantity > 0 ? line.ActualQuantity : (line.Quantity ?? 0m);
                    if (qtyToCook <= 0) continue;

                    // If request specifically specified a cooked batch quantity (e.g. cooked 10 portions now)
                    decimal deltaProduced = qtyToCook;
                    // If sent as cumulative target greater than already produced:
                    if (qtyToCook > item.ActualQuantity && request.Items.Count > 1)
                    {
                        deltaProduced = qtyToCook - item.ActualQuantity;
                    }

                    if (deltaProduced > 0)
                    {
                        itemsToProduce.Add((item, deltaProduced));
                        foodsToDeduct.Add((item.MenuItemId, deltaProduced));
                    }
                }
            }

            if (itemsToProduce.Count == 0)
            {
                return BadRequest(new { message = "No valid portions to record for production." });
            }

            // Atomic transaction for validation, production update, and stock deduction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Stock Validation: Check whether sufficient Kitchen Stock is available for all recipe ingredients
                var validation = await _recipeStockService.ValidateRecipeStockAsync(
                    orgId.Value,
                    plan.BranchId,
                    kitchenName,
                    foodsToDeduct,
                    requireRecipe: false
                );

                if (!validation.IsSufficient)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new
                    {
                        message = validation.ErrorMessage,
                        shortages = validation.Shortages,
                        error = "Insufficient Kitchen Stock"
                    });
                }

                // 2. Stock Deduction: Deduct recipe ingredients from KitchenStock & create audited StockTransactions
                var deduction = await _recipeStockService.DeductRecipeStockAsync(
                    orgId.Value,
                    plan.BranchId,
                    kitchenName,
                    foodsToDeduct,
                    userId.Value,
                    plan.PlanNumber ?? $"PLN-{plan.Id}",
                    "ProductionPlan",
                    plan.Id.ToString(),
                    existingTransaction: transaction,
                    requireRecipe: false
                );

                if (!deduction.Success)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new
                    {
                        message = deduction.Message,
                        shortages = deduction.Shortages,
                        error = "Insufficient Kitchen Stock"
                    });
                }

                // 3. Update Plan Items status and actual quantities
                foreach (var (item, deltaProduced) in itemsToProduce)
                {
                    item.ActualQuantity += deltaProduced;
                    item.RemainingQuantity = Math.Max(0, item.PlannedQuantity - item.ActualSales);

                    if (item.ActualSales >= item.PlannedQuantity)
                        item.Status = "Completed / Fully Allocated";
                    else if (item.ActualQuantity >= item.PlannedQuantity)
                        item.Status = "Produced";
                    else if (item.ActualQuantity > 0)
                        item.Status = "In Production";
                    else
                        item.Status = "Planned";

                    if (item.ActualSales > 0)
                    {
                        item.UnsoldQuantity = Math.Max(0, item.ActualQuantity - item.ActualSales);
                    }
                }

                // 4. Update plan material usage
                foreach (var req in validation.Requirements)
                {
                    var planMat = plan.Materials.FirstOrDefault(m => m.InventoryItemId == req.InventoryItemId);
                    if (planMat != null)
                    {
                        planMat.ActualUsedQuantity += req.RequiredQuantity;
                        planMat.RemainingQuantity = Math.Max(0, planMat.ActualSentQuantity - planMat.ActualUsedQuantity - planMat.ReturnedQuantity);
                        planMat.UpdatedAt = DateTime.UtcNow;
                    }
                }

                if (plan.Status is "PLANNED" or "ISSUED") plan.Status = "IN_PROGRESS";
                plan.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Actual dish production recorded and recipe ingredients automatically deducted from Kitchen Stock.",
                    deductions = validation.Requirements.Select(r => new
                    {
                        ingredient = r.ItemName,
                        quantityDeducted = r.RequiredQuantity,
                        unit = r.Unit,
                        remainingStock = r.AvailableStock - r.RequiredQuantity
                    })
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to record actual production: " + ex.Message });
            }
        }

        [HttpPost("production-plans/{id:int}/record-sales")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> RecordDishSales(int id, RecordDishSalesRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            foreach (var line in request.Items)
            {
                var item = plan.Items.FirstOrDefault(i => (line.PlanItemId.HasValue && i.Id == line.PlanItemId.Value) || i.MenuItemId == line.MenuItemId);
                if (item != null)
                {
                    item.ActualSales = Math.Max(0, line.ActualSales);
                    item.UnsoldQuantity = Math.Max(0, line.UnsoldQuantity);
                    item.WastageQuantity = Math.Max(0, line.WastageQuantity);
                    if (!string.IsNullOrWhiteSpace(line.LossReason)) item.LossReason = line.LossReason.Trim();
                    if (!string.IsNullOrWhiteSpace(line.Remarks)) item.Remarks = line.Remarks.Trim();
                }
            }

            plan.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Dish sales performance and loss classification saved." });
        }

        [HttpPost("production-plans/{id:int}/sync-sales")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> SyncSalesFromPOS(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            var dayStart = plan.PlanDate.Date;
            var dayEnd = dayStart.AddDays(1);

            // Pull sales count from non-cancelled orders for this branch on the plan date
            var salesList = await _context.OrderItems
                .Include(oi => oi.Order)
                .Where(oi => oi.Order != null &&
                             oi.Order.OrganizationId == orgId.Value &&
                             oi.Order.BranchId == plan.BranchId &&
                             oi.Order.CreatedAt >= dayStart && oi.Order.CreatedAt < dayEnd &&
                             oi.Order.Status != "Cancelled")
                .GroupBy(oi => oi.MenuItemId)
                .Select(g => new { menuItemId = g.Key, totalSold = g.Sum(x => x.Quantity) })
                .ToListAsync();

            foreach (var item in plan.Items)
            {
                var match = salesList.FirstOrDefault(s => s.menuItemId == item.MenuItemId);
                var sold = match != null ? match.totalSold : 0;
                item.ActualSales = sold;

                var diff = item.ActualQuantity - item.ActualSales;
                if (diff > 0)
                {
                    item.UnsoldQuantity = diff;
                    if (string.IsNullOrWhiteSpace(item.LossReason)) item.LossReason = "Unsold";
                }
                else
                {
                    item.UnsoldQuantity = 0;
                }
            }

            plan.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Sales synced from POS orders for " + plan.PlanDate.ToShortDateString(),
                items = plan.Items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    actualSales = i.ActualSales,
                    unsoldQuantity = i.UnsoldQuantity,
                    lossReason = i.LossReason
                })
            });
        }

        [HttpPost("production-plans/{id:int}/return-materials")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef")]
        public async Task<IActionResult> ReturnMaterials(int id, ReturnMaterialsRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Materials)
                    .ThenInclude(m => m.InventoryItem)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            var planBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == plan.BranchId && b.OrganizationId == orgId.Value);
            if (planBranch?.ModuleType == "POS Only")
            {
                return BadRequest(new { message = "Material Return is disabled for POS Only branches." });
            }
            if (planBranch?.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "Production Plan is disabled for KMS Only branches." });
            }

            var validReturns = request.Returns.Where(r => r.ReturnedQuantity > 0).ToList();
            if (validReturns.Count == 0)
                return BadRequest(new { message = "Please specify at least one return quantity > 0." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var retNumber = $"RET-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var returnDetails = new List<(InventoryItem item, decimal qty, decimal before, decimal after, decimal kBefore, decimal kAfter, decimal issued, decimal consumed, string? notes)>();

                foreach (var line in validReturns)
                {
                    var planMat = plan.Materials.FirstOrDefault(m => (line.MaterialId.HasValue && m.Id == line.MaterialId.Value) || m.InventoryItemId == line.InventoryItemId);
                    if (planMat == null)
                        return BadRequest(new { message = $"Material #{line.InventoryItemId} is not part of this production plan." });

                    var invItem = await _context.InventoryItems.FirstAsync(i => i.Id == planMat.InventoryItemId);
                    var before = invItem.CurrentStock;
                    var after = before + line.ReturnedQuantity;
                    invItem.CurrentStock = after;
                    invItem.UpdatedAt = DateTime.UtcNow;
                    _context.Entry(invItem).Property(i => i.CurrentStock).IsModified = true;
                    _context.Entry(invItem).Property(i => i.UpdatedAt).IsModified = true;

                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE inventory_items SET CurrentStock = {after}, UpdatedAt = UTC_TIMESTAMP(6) WHERE Id = {invItem.Id};");

                    // Deduct from KitchenStock
                    var kStock = await _context.KitchenStocks.FirstOrDefaultAsync(k =>
                        k.OrganizationId == orgId.Value &&
                        k.BranchId == plan.BranchId &&
                        k.KitchenName == (plan.KitchenName ?? "Main Kitchen") &&
                        k.InventoryItemId == invItem.Id);

                    decimal kBefore = kStock?.CurrentStock ?? 0;
                    decimal kAfter = Math.Max(0, kBefore - line.ReturnedQuantity);
                    if (kStock != null)
                    {
                        kStock.CurrentStock = kAfter;
                        kStock.UpdatedAt = DateTime.UtcNow;
                    }

                    planMat.ReturnedQuantity += line.ReturnedQuantity;
                    planMat.RemainingQuantity = Math.Max(0, planMat.ActualSentQuantity - planMat.ActualUsedQuantity - planMat.WastageQuantity - planMat.ReturnedQuantity);
                    planMat.Status = "RETURNED";
                    planMat.UpdatedAt = DateTime.UtcNow;

                    returnDetails.Add((invItem, line.ReturnedQuantity, before, after, kBefore, kAfter, planMat.ActualSentQuantity, planMat.ActualUsedQuantity, line.Notes));

                    // Create separate Kitchen Return stock transaction: Kitchen -> Central Inventory
                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = plan.BranchId,
                        InventoryItemId = invItem.Id,
                        Type = "MATERIAL_RETURN",
                        Quantity = line.ReturnedQuantity,
                        StockBefore = before,
                        StockAfter = after,
                        Reference = plan.PlanNumber ?? $"PLN-{plan.Id}",
                        ReferenceType = "ProductionPlan",
                        ReferenceId = plan.Id.ToString(),
                        SourceLocation = plan.KitchenName ?? "Main Kitchen",
                        DestinationLocation = "Central Inventory",
                        Notes = $"Material Return: {line.ReturnedQuantity} {invItem.Unit} of {invItem.Name} returned from {plan.KitchenName ?? "Main Kitchen"} to Central Inventory (Plan #{plan.PlanNumber})",
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Create linked MaterialReturn record for full audit trail
                var totalReturned = validReturns.Sum(r => r.ReturnedQuantity);
                var matReturn = new MaterialReturn
                {
                    OrganizationId = orgId.Value,
                    BranchId = plan.BranchId,
                    ReturnNumber = retNumber,
                    Date = plan.PlanDate,
                    ReturnType = "Kitchen Unused",
                    Department = plan.KitchenName ?? "Main Kitchen",
                    Reference = plan.PlanNumber ?? $"PLN-{plan.Id}",
                    ProductionPlanId = plan.Id,
                    Quantity = totalReturned,
                    IssuedQuantity = returnDetails.Sum(r => r.issued),
                    ConsumedQuantity = returnDetails.Sum(r => r.consumed),
                    ReturnedQuantity = totalReturned,
                    Reason = request.Reason ?? "Unused Materials Returned to Store",
                    Notes = request.Notes ?? $"Materials returned from kitchen for Plan #{plan.PlanNumber}",
                    Status = "Confirmed",
                    ReturnedBy = request.ReturnedBy ?? "Kitchen Staff",
                    ApprovedBy = request.ApprovedBy ?? "Kitchen Manager",
                    CreatedByUserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };

                _context.MaterialReturns.Add(matReturn);
                await _context.SaveChangesAsync();

                foreach (var line in returnDetails)
                {
                    _context.MaterialReturnItems.Add(new MaterialReturnItem
                    {
                        MaterialReturnId = matReturn.Id,
                        InventoryItemId = line.item.Id,
                        Quantity = line.qty,
                        IssuedQuantity = line.issued,
                        ConsumedQuantity = line.consumed,
                        ReturnedQuantity = line.qty,
                        Unit = line.item.Unit,
                        StockBefore = line.before,
                        StockAfter = line.after,
                        KitchenStockBefore = line.kBefore,
                        KitchenStockAfter = line.kAfter,
                        Notes = line.notes
                    });
                }

                plan.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Remaining materials successfully returned to Central Inventory. Kitchen Stock updated.",
                    planId = plan.Id,
                    planNumber = plan.PlanNumber,
                    returnNumber = matReturn.ReturnNumber
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to process returns: " + ex.Message });
            }
        }

        [HttpPost("production-plans/{id:int}/close")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager")]
        public async Task<IActionResult> CloseProductionPlan(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var plan = await _context.ProductionPlans
                .Include(p => p.Items).ThenInclude(i => i.MenuItem)
                .Include(p => p.Materials).ThenInclude(m => m.InventoryItem)
                .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);

            if (plan == null) return NotFound(new { message = "Production plan not found." });

            plan.Status = "CLOSED";
            plan.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Compile complete Daily Summary
            var materialSummary = plan.Materials.Select(m => new
            {
                itemName = m.InventoryItem?.Name ?? "Item",
                unit = m.Unit,
                sent = m.ActualSentQuantity,
                used = m.ActualUsedQuantity,
                remaining = m.RemainingQuantity,
                returned = m.ReturnedQuantity,
                wastage = m.WastageQuantity
            }).ToList();

            var dishSummary = plan.Items.Select(i => new
            {
                dishName = i.MenuItem?.Name ?? "Dish",
                planned = i.PlannedQuantity,
                produced = i.ActualQuantity,
                expectedSales = i.ExpectedSales,
                actualSales = i.ActualSales,
                unsold = i.UnsoldQuantity,
                lossReason = i.LossReason ?? "None"
            }).ToList();

            return Ok(new
            {
                message = "Daily Kitchen Production Plan is now CLOSED.",
                planId = plan.Id,
                status = plan.Status,
                summary = new
                {
                    materialSummary,
                    dishSummary,
                    totalMaterialsSent = plan.Materials.Sum(m => m.ActualSentQuantity),
                    totalMaterialsUsed = plan.Materials.Sum(m => m.ActualUsedQuantity),
                    totalMaterialsReturned = plan.Materials.Sum(m => m.ReturnedQuantity),
                    totalMaterialsWasted = plan.Materials.Sum(m => m.WastageQuantity),
                    totalDishesPlanned = plan.Items.Sum(i => i.PlannedQuantity),
                    totalDishesProduced = plan.Items.Sum(i => i.ActualQuantity),
                    totalExpectedSales = plan.Items.Sum(i => i.ExpectedSales),
                    totalActualSales = plan.Items.Sum(i => i.ActualSales),
                    totalUnsold = plan.Items.Sum(i => i.UnsoldQuantity)
                }
            });
        }

        [HttpPost("production-plans/calculate-materials")]
        public async Task<IActionResult> CalculateMaterialsFromRecipes(CalculateMaterialsRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });

            if (request.Dishes == null || request.Dishes.Count == 0)
                return Ok(new List<object>());

            var menuIds = request.Dishes.Select(d => d.MenuItemId).Distinct().ToList();

            var recipes = await _context.RecipeIngredients
                .AsNoTracking()
                .Include(r => r.InventoryItem)
                .Where(r => r.OrganizationId == orgId.Value && r.BranchId == branchId.Value && menuIds.Contains(r.MenuItemId))
                .ToListAsync();

            var materialMap = new Dictionary<int, (InventoryItem item, decimal totalQty)>();

            foreach (var dish in request.Dishes)
            {
                if (dish.Quantity <= 0) continue;
                var dishRecipes = recipes.Where(r => r.MenuItemId == dish.MenuItemId);
                foreach (var r in dishRecipes)
                {
                    if (r.InventoryItem == null) continue;
                    var needed = r.Quantity * dish.Quantity;
                    if (materialMap.ContainsKey(r.InventoryItemId))
                    {
                        var cur = materialMap[r.InventoryItemId];
                        materialMap[r.InventoryItemId] = (cur.item, cur.totalQty + needed);
                    }
                    else
                    {
                        materialMap[r.InventoryItemId] = (r.InventoryItem, needed);
                    }
                }
            }

            var result = materialMap.Values.Select(v => new
            {
                inventoryItemId = v.item.Id,
                itemName = v.item.Name,
                itemCode = v.item.ItemCode ?? "",
                unit = v.item.Unit,
                availableCentralStock = v.item.CurrentStock,
                plannedQuantityToSend = Math.Round(v.totalQty, 3)
            }).OrderBy(x => x.itemName).ToList();

            return Ok(result);
        }

        [HttpPut("production-plans/{id:int}/status")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> UpdateProductionPlanStatus(int id, UpdateStatusRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var plan = await _context.ProductionPlans.FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId.Value);
            if (plan == null) return NotFound(new { message = "Production plan not found." });

            plan.Status = request.Status.Trim().ToUpperInvariant();
            plan.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Production plan status updated.", status = plan.Status });
        }

        #endregion

        #region Production Entries (With Ingredient Consumption & MySQL Transactions)

        [HttpGet("productions")]
        public async Task<IActionResult> GetProductions([FromQuery] string? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.ActualProductions
                .AsNoTracking()
                .Include(p => p.MenuItem)
                .Include(p => p.Branch)
                .Include(p => p.CreatedByUser)
                .Include(p => p.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .Where(p => p.OrganizationId == orgId.Value);

            if (targetBranchId.HasValue) query = query.Where(p => p.BranchId == targetBranchId.Value);

            var productions = await query
                .OrderByDescending(p => p.ProductionDate)
                .Take(200)
                .Select(p => new
                {
                    p.Id,
                    productionNumber = p.ProductionNumber ?? $"PRD-{p.Id}",
                    productionDate = p.ProductionDate,
                    mealType = p.MealType,
                    menuItemId = p.MenuItemId,
                    menuItemName = p.MenuItem != null ? p.MenuItem.Name : "",
                    plannedQuantity = p.PlannedQuantity,
                    actualQuantity = p.ActualQuantity,
                    wastageQuantity = p.WastageQuantity,
                    branchId = p.BranchId,
                    branchName = p.Branch != null ? p.Branch.Name : "",
                    status = p.Status,
                    remarks = p.Remarks,
                    createdBy = p.CreatedByUser != null ? p.CreatedByUser.Name : "",
                    p.CreatedAt,
                    ingredients = p.Ingredients.Select(i => new
                    {
                        i.Id,
                        i.InventoryItemId,
                        itemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                        quantity = i.Quantity,
                        unit = i.Unit ?? (i.InventoryItem != null ? i.InventoryItem.Unit : "")
                    })
                })
                .ToListAsync();

            return Ok(productions);
        }

        [HttpPost("productions")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> CreateProduction(CreateProductionEntryRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });

            if (request.MenuItemId <= 0 || request.ActualQuantity <= 0)
                return BadRequest(new { message = "Menu item and valid actual quantity > 0 are required." });

            var menuItem = await _context.MenuItems
                .Include(m => m.Ingredients)
                    .ThenInclude(r => r.InventoryItem)
                .FirstOrDefaultAsync(m => m.Id == request.MenuItemId && m.OrganizationId == orgId.Value && m.BranchId == branchId.Value);

            if (menuItem == null) return BadRequest(new { message = "Menu item not found in selected branch." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value && b.OrganizationId == orgId.Value);
            if (branch == null) return BadRequest(new { message = "Invalid branch." });

            if (branch.ModuleType == "POS Only")
            {
                return BadRequest(new { message = "Kitchen production recording is disabled for POS Only branches." });
            }

            bool isKmsOnly = branch.ModuleType == "KMS Only";

            if (!isKmsOnly && menuItem.Ingredients.Count == 0)
                return BadRequest(new { message = $"No recipe ingredients configured for {menuItem.Name}. Configure the recipe first." });

            var kitchenName = "Main Kitchen";
            if (request.ProductionPlanId.HasValue)
            {
                var planRef = await _context.ProductionPlans.FirstOrDefaultAsync(p => p.Id == request.ProductionPlanId.Value);
                if (planRef != null && !string.IsNullOrWhiteSpace(planRef.KitchenName))
                    kitchenName = planRef.KitchenName.Trim();
            }

            // Begin safe database transaction for production & stock deduction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                RecipeStockValidationResult? validation = null;
                if (!isKmsOnly)
                {
                    // 1. Stock Validation: Check whether sufficient Kitchen Stock is available for all recipe ingredients
                    validation = await _recipeStockService.ValidateRecipeStockAsync(
                        orgId.Value,
                        branchId.Value,
                        kitchenName,
                        new[] { (menuItem.Id, request.ActualQuantity) }
                    );

                    if (!validation.IsSufficient)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            message = validation.ErrorMessage,
                            shortages = validation.Shortages,
                            error = "Insufficient Kitchen Stock"
                        });
                    }
                }

                // 2. Create production entry
                var prodNumber = $"PRD-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var production = new ActualProduction
                {
                    OrganizationId = orgId.Value,
                    BranchId = branchId.Value,
                    ProductionPlanId = request.ProductionPlanId,
                    ProductionNumber = prodNumber,
                    ProductionDate = request.ProductionDate ?? DateTime.UtcNow,
                    MealType = string.IsNullOrWhiteSpace(request.MealType) ? "General" : request.MealType.Trim(),
                    MenuItemId = menuItem.Id,
                    PlannedQuantity = request.PlannedQuantity > 0 ? request.PlannedQuantity : request.ActualQuantity,
                    ActualQuantity = request.ActualQuantity,
                    WastageQuantity = request.WastageQuantity,
                    Status = "COMPLETED",
                    Remarks = request.Remarks?.Trim(),
                    CreatedByUserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };

                _context.ActualProductions.Add(production);
                await _context.SaveChangesAsync();

                if (!isKmsOnly)
                {
                    // 3. Stock Deduction: Deduct recipe ingredients from KitchenStock & create audited StockTransactions
                    var deductionResult = await _recipeStockService.DeductRecipeStockAsync(
                        orgId.Value,
                        branchId.Value,
                        kitchenName,
                        new[] { (menuItem.Id, request.ActualQuantity) },
                        userId.Value,
                        prodNumber,
                        "RecipeConsumption",
                        production.Id.ToString(),
                        existingTransaction: transaction
                    );

                    if (!deductionResult.Success)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            message = deductionResult.Message,
                            shortages = deductionResult.Shortages,
                            error = "Insufficient Kitchen Stock"
                        });
                    }

                    // Record ingredients in ActualProduction
                    if (validation != null)
                    {
                        foreach (var req in validation.Requirements)
                        {
                            production.Ingredients.Add(new ActualProductionIngredient
                            {
                                InventoryItemId = req.InventoryItemId,
                                PlannedQuantity = req.RequiredQuantity,
                                Quantity = req.RequiredQuantity,
                                Unit = req.Unit
                            });
                        }
                    }
                }

                // 4. If a plan was referenced, update plan items, materials, and status
                if (request.ProductionPlanId.HasValue)
                {
                    var plan = await _context.ProductionPlans
                        .Include(p => p.Items)
                        .Include(p => p.Materials)
                        .FirstOrDefaultAsync(p => p.Id == request.ProductionPlanId.Value);
                    if (plan != null)
                    {
                        var planItem = plan.Items.FirstOrDefault(i => i.MenuItemId == menuItem.Id);
                        if (planItem != null)
                        {
                            planItem.ActualQuantity += request.ActualQuantity;
                            planItem.RemainingQuantity = Math.Max(0, planItem.PlannedQuantity - planItem.ActualSales);
                            if (planItem.ActualSales >= planItem.PlannedQuantity) planItem.Status = "Completed / Fully Allocated";
                            else if (planItem.ActualQuantity >= planItem.PlannedQuantity) planItem.Status = "Produced";
                            else planItem.Status = "In Production";
                        }
                        foreach (var req in validation.Requirements)
                        {
                            var planMat = plan.Materials.FirstOrDefault(m => m.InventoryItemId == req.InventoryItemId);
                            if (planMat != null)
                            {
                                planMat.ActualUsedQuantity += req.RequiredQuantity;
                                planMat.RemainingQuantity = Math.Max(0, planMat.ActualSentQuantity - planMat.ActualUsedQuantity - planMat.ReturnedQuantity);
                                planMat.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        if (plan.Status is "PLANNED" or "ISSUED") plan.Status = "IN_PROGRESS";
                        plan.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = $"Production completed. {menuItem.Name} produced ({request.ActualQuantity} portion(s)). Recipe ingredients deducted from Kitchen Stock.",
                    productionId = production.Id,
                    productionNumber = production.ProductionNumber,
                    deductions = validation.Requirements.Select(r => new
                    {
                        ingredient = r.ItemName,
                        quantityDeducted = r.RequiredQuantity,
                        unit = r.Unit,
                        remainingStock = r.AvailableStock - r.RequiredQuantity
                    })
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Production transaction failed: " + ex.Message });
            }
        }

        [HttpGet("check-recipe-stock")]
        [HttpPost("check-recipe-stock")]
        public async Task<IActionResult> CheckRecipeStock(
            [FromQuery] int? menuItemId = null,
            [FromQuery] decimal? quantity = null,
            [FromQuery] int? branchId = null,
            [FromQuery] string? kitchenName = null,
            [FromBody] CheckRecipeStockRequest? bodyRequest = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId ?? bodyRequest?.BranchId);
            if (!targetBranchId.HasValue) return BadRequest(new { message = "Branch is required." });

            var targetMenuId = menuItemId ?? bodyRequest?.MenuItemId ?? 0;
            var targetQty = quantity ?? bodyRequest?.Quantity ?? 1m;
            var safeKitchen = string.IsNullOrWhiteSpace(kitchenName)
                ? (bodyRequest?.KitchenName ?? "Main Kitchen")
                : kitchenName;

            if (targetMenuId <= 0 || targetQty <= 0)
            {
                return BadRequest(new { message = "Valid Menu Item ID and Quantity > 0 are required." });
            }

            var validation = await _recipeStockService.ValidateRecipeStockAsync(
                orgId.Value,
                targetBranchId.Value,
                safeKitchen,
                new[] { (targetMenuId, targetQty) },
                requireRecipe: true
            );

            return Ok(new
            {
                isSufficient = validation.IsSufficient,
                message = validation.ErrorMessage,
                shortages = validation.Shortages,
                requirements = validation.Requirements
            });
        }

        [HttpGet("recipe-consumption-history")]
        public async Task<IActionResult> GetRecipeConsumptionHistory(
            [FromQuery] int? branchId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.StockTransactions
                .AsNoTracking()
                .Include(t => t.InventoryItem)
                .Include(t => t.Branch)
                .Include(t => t.CreatedByUser)
                .Where(t => t.OrganizationId == orgId.Value &&
                            (t.Type == "RECIPE_CONSUMPTION" || t.Type == "PRODUCTION_CONSUMPTION"));

            if (targetBranchId.HasValue)
                query = query.Where(t => t.BranchId == targetBranchId.Value);

            if (fromDate.HasValue)
                query = query.Where(t => t.CreatedAt >= fromDate.Value.Date);

            if (toDate.HasValue)
                query = query.Where(t => t.CreatedAt < toDate.Value.Date.AddDays(1));

            var history = await query
                .OrderByDescending(t => t.CreatedAt)
                .Take(200)
                .Select(t => new
                {
                    t.Id,
                    t.CreatedAt,
                    t.BranchId,
                    branchName = t.Branch != null ? t.Branch.Name : "",
                    t.InventoryItemId,
                    itemName = t.InventoryItem != null ? t.InventoryItem.Name : "",
                    ingredientName = t.InventoryItem != null ? t.InventoryItem.Name : "",
                    unit = t.InventoryItem != null ? t.InventoryItem.Unit : "KG",
                    t.Quantity,
                    t.StockBefore,
                    t.StockAfter,
                    type = t.Type,
                    action = "Recipe Consumption",
                    reason = t.Notes ?? t.DestinationLocation ?? "Recipe Consumption",
                    t.Reference,
                    t.ReferenceType,
                    t.ReferenceId,
                    sourceLocation = t.SourceLocation ?? "Main Kitchen",
                    t.DestinationLocation,
                    t.Notes,
                    createdBy = t.CreatedByUser != null ? t.CreatedByUser.Name : "System"
                })
                .ToListAsync();

            return Ok(history);
        }

        #endregion

        #region Kitchen Stock (Real-time stock held in kitchens)

        [HttpGet("stock")]
        public async Task<IActionResult> GetKitchenStock([FromQuery] int? branchId = null, [FromQuery] string? kitchenName = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.KitchenStocks
                .AsNoTracking()
                .Include(k => k.InventoryItem)
                .Include(k => k.Branch)
                .Where(k => k.OrganizationId == orgId.Value);

            if (targetBranchId.HasValue) query = query.Where(k => k.BranchId == targetBranchId.Value);
            if (!string.IsNullOrWhiteSpace(kitchenName)) query = query.Where(k => k.KitchenName.ToLower() == kitchenName.Trim().ToLower());

            var stocks = await query
                .OrderBy(k => k.InventoryItem != null ? k.InventoryItem.Name : "")
                .Select(k => new
                {
                    k.Id,
                    k.BranchId,
                    branchName = k.Branch != null ? k.Branch.Name : "",
                    kitchenName = k.KitchenName,
                    k.InventoryItemId,
                    itemName = k.InventoryItem != null ? k.InventoryItem.Name : "",
                    ingredientName = k.InventoryItem != null ? k.InventoryItem.Name : "",
                    itemCode = k.InventoryItem != null ? k.InventoryItem.ItemCode : "",
                    category = k.InventoryItem != null ? k.InventoryItem.Category : "",
                    unit = k.InventoryItem != null ? k.InventoryItem.Unit : "KG",
                    currentStock = k.CurrentStock,
                    centralStock = k.InventoryItem != null ? k.InventoryItem.CurrentStock : 0,
                    reorderLevel = k.InventoryItem != null ? k.InventoryItem.ReorderLevel : 0,
                    unitCost = k.InventoryItem != null ? k.InventoryItem.LastPurchasePrice : 0,
                    totalValue = k.CurrentStock * (k.InventoryItem != null ? k.InventoryItem.LastPurchasePrice : 0),
                    updatedAt = k.UpdatedAt
                })
                .ToListAsync();

            return Ok(stocks);
        }

        #endregion

        #region Material Issues (Store -> Kitchen with MySQL Transactions)

        [HttpGet("material-issues")]
        public async Task<IActionResult> GetMaterialIssues([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.MaterialIssues
                .AsNoTracking()
                .Include(m => m.Branch)
                .Include(m => m.CreatedByUser)
                .Include(m => m.Items)
                    .ThenInclude(i => i.InventoryItem)
                .Where(m => m.OrganizationId == orgId.Value);

            if (targetBranchId.HasValue)
            {
                var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == targetBranchId.Value);
                if (branch?.ModuleType == "POS Only")
                {
                    return Ok(new List<object>());
                }
                query = query.Where(m => m.BranchId == targetBranchId.Value);
            }

            var issues = await query
                .OrderByDescending(m => m.CreatedAt)
                .Take(200)
                .Select(m => new
                {
                    m.Id,
                    issueNumber = m.IssueNumber ?? $"ISS-{m.Id}",
                    date = m.Date ?? m.CreatedAt,
                    department = m.Department ?? m.IssueType,
                    m.Reference,
                    quantity = m.Quantity,
                    m.Status,
                    m.Remarks,
                    m.ReceivedBy,
                    branchId = m.BranchId,
                    branchName = m.Branch != null ? m.Branch.Name : "",
                    issuedBy = m.CreatedByUser != null ? m.CreatedByUser.Name : "",
                    m.CreatedAt,
                    items = m.Items.Select(i => new
                    {
                        i.Id,
                        i.InventoryItemId,
                        itemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                        quantity = i.Quantity,
                        unit = i.Unit,
                        stockBefore = i.StockBefore,
                        stockAfter = i.StockAfter
                    })
                })
                .ToListAsync();

            return Ok(issues);
        }

        [HttpPost("material-issues")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef")]
        public async Task<IActionResult> CreateMaterialIssue(CreateMaterialIssueRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue || branchId.Value <= 0)
            {
                var firstId = request.Items.FirstOrDefault(x => x.InventoryItemId > 0)?.InventoryItemId;
                if (firstId.HasValue)
                {
                    var firstItm = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == firstId.Value && i.OrganizationId == orgId.Value);
                    if (firstItm != null) branchId = firstItm.BranchId;
                }
            }
            if (!branchId.HasValue || branchId.Value <= 0) return BadRequest(new { message = "Branch is required." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value && b.OrganizationId == orgId.Value);
            if (branch == null) return BadRequest(new { message = "Invalid branch." });
            if (branch.ModuleType == "POS Only")
            {
                return BadRequest(new { message = "Material Issue is disabled for POS Only branches." });
            }

            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "At least one item must be specified for material issue." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Validate stock availability for all items
                foreach (var line in request.Items)
                {
                    if (line.EffectiveQuantity <= 0)
                        return BadRequest(new { message = "Issue quantity must be greater than zero." });

                    var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == line.InventoryItemId && i.OrganizationId == orgId.Value);
                    if (item == null)
                        return BadRequest(new { message = $"Item ID {line.InventoryItemId} not found." });

                    if (item.CurrentStock < line.EffectiveQuantity)
                    {
                        return BadRequest(new
                        {
                            message = $"Insufficient stock for {item.Name}. Requested: {line.EffectiveQuantity} {item.Unit}, Available: {item.CurrentStock} {item.Unit}."
                        });
                    }
                }

                // 2. Create Issue record
                var issueNumber = $"ISS-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var totalQty = request.Items.Sum(i => i.EffectiveQuantity);

                var issue = new MaterialIssue
                {
                    OrganizationId = orgId.Value,
                    BranchId = branchId.Value,
                    IssueNumber = issueNumber,
                    Date = request.Date ?? DateTime.UtcNow,
                    IssueType = string.IsNullOrWhiteSpace(request.Department) ? "Kitchen" : request.Department.Trim(),
                    Department = string.IsNullOrWhiteSpace(request.Department) ? "Kitchen" : request.Department.Trim(),
                    Reference = string.IsNullOrWhiteSpace(request.Reference) ? issueNumber : request.Reference.Trim(),
                    ProductionPlanId = request.ProductionPlanId,
                    Quantity = totalQty,
                    Notes = request.EffectiveNotes?.Trim(),
                    Status = "Confirmed",
                    ReceivedBy = request.ReceivedBy?.Trim(),
                    ApprovedBy = request.ApprovedBy?.Trim(),
                    CreatedByUserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };

                _context.MaterialIssues.Add(issue);
                await _context.SaveChangesAsync();

                // 3. Deduct stock, credit KitchenStock, and record stock movement transactions
                var kitchenDept = string.IsNullOrWhiteSpace(issue.Department) ? "Main Kitchen" : issue.Department;
                foreach (var line in request.Items)
                {
                    var item = await _context.InventoryItems.FirstAsync(i => i.Id == line.InventoryItemId);
                    var before = item.CurrentStock;
                    var after = before - line.EffectiveQuantity;
                    item.CurrentStock = after;
                    item.UpdatedAt = DateTime.UtcNow;
                    _context.Entry(item).Property(i => i.CurrentStock).IsModified = true;
                    _context.Entry(item).Property(i => i.UpdatedAt).IsModified = true;

                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE inventory_items SET CurrentStock = {after}, UpdatedAt = UTC_TIMESTAMP(6) WHERE Id = {item.Id};");

                    // Credit KitchenStock
                    var kStock = await _context.KitchenStocks.FirstOrDefaultAsync(k =>
                        k.OrganizationId == orgId.Value &&
                        k.BranchId == branchId.Value &&
                        k.KitchenName == kitchenDept &&
                        k.InventoryItemId == item.Id);

                    decimal kBefore = kStock?.CurrentStock ?? 0;
                    decimal kAfter = kBefore + line.EffectiveQuantity;

                    if (kStock == null)
                    {
                        kStock = new KitchenStock
                        {
                            OrganizationId = orgId.Value,
                            BranchId = branchId.Value,
                            KitchenName = kitchenDept,
                            InventoryItemId = item.Id,
                            CurrentStock = kAfter,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.KitchenStocks.Add(kStock);
                    }
                    else
                    {
                        kStock.CurrentStock = kAfter;
                        kStock.UpdatedAt = DateTime.UtcNow;
                    }

                    _context.MaterialIssueItems.Add(new MaterialIssueItem
                    {
                        MaterialIssueId = issue.Id,
                        InventoryItemId = item.Id,
                        Quantity = line.EffectiveQuantity,
                        Unit = string.IsNullOrWhiteSpace(line.Unit) ? item.Unit : line.Unit.Trim(),
                        StockBefore = before,
                        StockAfter = after,
                        KitchenStockBefore = kBefore,
                        KitchenStockAfter = kAfter
                    });

                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = item.BranchId,
                        InventoryItemId = item.Id,
                        Type = "MATERIAL_ISSUE",
                        Quantity = line.EffectiveQuantity,
                        StockBefore = before,
                        StockAfter = after,
                        Reference = issueNumber,
                        ReferenceType = "MaterialIssue",
                        ReferenceId = issue.Id.ToString(),
                        SourceLocation = "Central Inventory",
                        DestinationLocation = kitchenDept,
                        Notes = $"Material issued to {kitchenDept}. Reference: {issue.Reference}",
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // If a production plan was linked, update its materials
                if (request.ProductionPlanId.HasValue)
                {
                    var plan = await _context.ProductionPlans
                        .Include(p => p.Materials)
                        .FirstOrDefaultAsync(p => p.Id == request.ProductionPlanId.Value);
                    if (plan != null)
                    {
                        foreach (var line in request.Items)
                        {
                            var planMat = plan.Materials.FirstOrDefault(m => m.InventoryItemId == line.InventoryItemId);
                            if (planMat != null)
                            {
                                planMat.ActualSentQuantity += line.EffectiveQuantity;
                                planMat.RemainingQuantity += line.EffectiveQuantity;
                                planMat.Status = "ISSUED";
                            }
                        }
                        plan.Status = "ISSUED";
                        plan.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Material issue confirmed. Inventory and Kitchen Stock updated.", issueId = issue.Id, issueNumber = issue.IssueNumber });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to process material issue: " + ex.Message });
            }
        }

        #endregion

        #region Material Returns (Return Unused Material: Kitchen -> Store)

        [HttpGet("material-returns")]
        public async Task<IActionResult> GetMaterialReturns([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = ResolveBranch(branchId);

            var query = _context.MaterialReturns
                .AsNoTracking()
                .Include(m => m.Branch)
                .Include(m => m.CreatedByUser)
                .Include(m => m.MaterialIssue)
                .Include(m => m.Items)
                    .ThenInclude(i => i.InventoryItem)
                .Where(m => m.OrganizationId == orgId.Value);

            if (targetBranchId.HasValue)
            {
                var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == targetBranchId.Value);
                if (branch?.ModuleType == "POS Only")
                {
                    return Ok(new List<object>());
                }
                query = query.Where(m => m.BranchId == targetBranchId.Value);
            }

            var returns = await query
                .OrderByDescending(m => m.CreatedAt)
                .Take(200)
                .Select(m => new
                {
                    m.Id,
                    returnNumber = m.ReturnNumber ?? $"RET-{m.Id}",
                    date = m.Date ?? m.CreatedAt,
                    department = m.Department ?? "Kitchen",
                    returnType = m.ReturnType,
                    reference = m.Reference,
                    materialIssueId = m.MaterialIssueId,
                    materialIssueNumber = m.MaterialIssue != null ? m.MaterialIssue.IssueNumber : "",
                    quantity = m.Quantity,
                    reason = m.Reason,
                    remarks = m.Notes,
                    status = m.Status,
                    returnedBy = m.ReturnedBy,
                    receivedBy = m.ReceivedBy,
                    branchId = m.BranchId,
                    branchName = m.Branch != null ? m.Branch.Name : "",
                    processedBy = m.CreatedByUser != null ? m.CreatedByUser.Name : "",
                    m.CreatedAt,
                    items = m.Items.Select(i => new
                    {
                        i.Id,
                        i.InventoryItemId,
                        itemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                        quantity = i.Quantity,
                        unit = i.Unit,
                        stockBefore = i.StockBefore,
                        stockAfter = i.StockAfter,
                        notes = i.Notes
                    })
                })
                .ToListAsync();

            return Ok(returns);
        }

        [HttpPost("material-returns")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef")]
        public async Task<IActionResult> CreateMaterialReturn(CreateMaterialReturnRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue || branchId.Value <= 0)
            {
                var firstId = request.Items.FirstOrDefault(x => x.InventoryItemId > 0)?.InventoryItemId;
                if (firstId.HasValue)
                {
                    var firstItm = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == firstId.Value && i.OrganizationId == orgId.Value);
                    if (firstItm != null) branchId = firstItm.BranchId;
                }
            }
            if (!branchId.HasValue || branchId.Value <= 0) return BadRequest(new { message = "Branch is required." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value && b.OrganizationId == orgId.Value);
            if (branch == null) return BadRequest(new { message = "Invalid branch." });
            if (branch.ModuleType == "POS Only")
            {
                return BadRequest(new { message = "Material Return is disabled for POS Only branches." });
            }

            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "At least one unused item must be specified for material return." });

            var validItems = request.Items.Where(i => i.InventoryItemId > 0 && i.EffectiveQuantity > 0).ToList();
            if (validItems.Count == 0)
                return BadRequest(new { message = "Please specify at least one return item with quantity > 0." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var returnNumber = $"RET-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var totalQty = validItems.Sum(i => i.EffectiveQuantity);

                var matReturn = new MaterialReturn
                {
                    OrganizationId = orgId.Value,
                    BranchId = branchId.Value,
                    ReturnNumber = returnNumber,
                    Date = request.Date ?? DateTime.UtcNow,
                    ReturnType = string.IsNullOrWhiteSpace(request.ReturnType) ? "Kitchen Unused" : request.ReturnType.Trim(),
                    Department = string.IsNullOrWhiteSpace(request.Department) ? "Main Kitchen" : request.Department.Trim(),
                    Reference = string.IsNullOrWhiteSpace(request.Reference) ? returnNumber : request.Reference.Trim(),
                    MaterialIssueId = request.MaterialIssueId,
                    ProductionPlanId = request.ProductionPlanId,
                    Quantity = totalQty,
                    IssuedQuantity = request.IssuedQuantity ?? 0,
                    ConsumedQuantity = request.ConsumedQuantity ?? 0,
                    ReturnedQuantity = request.ReturnedQuantity ?? totalQty,
                    Reason = string.IsNullOrWhiteSpace(request.Reason) ? "Unused Product / Excess" : request.Reason.Trim(),
                    Notes = request.EffectiveNotes?.Trim(),
                    Status = "Confirmed",
                    ReturnedBy = request.ReturnedBy?.Trim(),
                    ApprovedBy = request.ApprovedBy?.Trim(),
                    ReceivedBy = request.ReceivedBy?.Trim(),
                    CreatedByUserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };

                _context.MaterialReturns.Add(matReturn);
                await _context.SaveChangesAsync();

                // Restore stock to Central Inventory and deduct from KitchenStock
                var srcKitchen = string.IsNullOrWhiteSpace(matReturn.Department) ? "Main Kitchen" : matReturn.Department;
                foreach (var line in validItems)
                {
                    var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == line.InventoryItemId && i.OrganizationId == orgId.Value);
                    if (item == null)
                        return BadRequest(new { message = $"Inventory item #{line.InventoryItemId} not found." });

                    var before = item.CurrentStock;
                    var after = before + line.EffectiveQuantity;
                    item.CurrentStock = after;
                    item.UpdatedAt = DateTime.UtcNow;
                    _context.Entry(item).Property(i => i.CurrentStock).IsModified = true;
                    _context.Entry(item).Property(i => i.UpdatedAt).IsModified = true;

                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE inventory_items SET CurrentStock = {after}, UpdatedAt = UTC_TIMESTAMP(6) WHERE Id = {item.Id};");

                    // Deduct from KitchenStock
                    var kStock = await _context.KitchenStocks.FirstOrDefaultAsync(k =>
                        k.OrganizationId == orgId.Value &&
                        k.BranchId == branchId.Value &&
                        k.KitchenName == srcKitchen &&
                        k.InventoryItemId == item.Id);

                    decimal kBefore = kStock?.CurrentStock ?? 0;
                    decimal kAfter = Math.Max(0, kBefore - line.EffectiveQuantity);
                    if (kStock != null)
                    {
                        kStock.CurrentStock = kAfter;
                        kStock.UpdatedAt = DateTime.UtcNow;
                    }

                    _context.MaterialReturnItems.Add(new MaterialReturnItem
                    {
                        MaterialReturnId = matReturn.Id,
                        InventoryItemId = item.Id,
                        Quantity = line.EffectiveQuantity,
                        IssuedQuantity = line.IssuedQuantity ?? 0,
                        ConsumedQuantity = line.ConsumedQuantity ?? 0,
                        ReturnedQuantity = line.ReturnedQuantity ?? line.EffectiveQuantity,
                        Unit = string.IsNullOrWhiteSpace(line.Unit) ? item.Unit : line.Unit.Trim(),
                        StockBefore = before,
                        StockAfter = after,
                        KitchenStockBefore = kBefore,
                        KitchenStockAfter = kAfter,
                        Notes = line.Notes
                    });

                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = item.BranchId,
                        InventoryItemId = item.Id,
                        Type = "MATERIAL_RETURN",
                        Quantity = line.EffectiveQuantity,
                        StockBefore = before,
                        StockAfter = after,
                        Reference = returnNumber,
                        ReferenceType = "MaterialReturn",
                        ReferenceId = matReturn.Id.ToString(),
                        SourceLocation = srcKitchen,
                        DestinationLocation = "Central Inventory",
                        Notes = $"Unused material returned to inventory from {srcKitchen}. Reason: {matReturn.Reason}. Ref: {matReturn.Reference}",
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // If production plan was linked, update its materials
                if (request.ProductionPlanId.HasValue)
                {
                    var plan = await _context.ProductionPlans
                        .Include(p => p.Materials)
                        .FirstOrDefaultAsync(p => p.Id == request.ProductionPlanId.Value);
                    if (plan != null)
                    {
                        foreach (var line in validItems)
                        {
                            var planMat = plan.Materials.FirstOrDefault(m => m.InventoryItemId == line.InventoryItemId);
                            if (planMat != null)
                            {
                                planMat.ReturnedQuantity += line.EffectiveQuantity;
                                planMat.RemainingQuantity = Math.Max(0, planMat.ActualSentQuantity - planMat.ActualUsedQuantity - planMat.WastageQuantity - planMat.ReturnedQuantity);
                                planMat.Status = "RETURNED";
                                planMat.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        plan.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Unused material returned successfully. Central Inventory restored and Kitchen Stock updated.", returnId = matReturn.Id, returnNumber = matReturn.ReturnNumber });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to process material return: " + ex.Message });
            }
        }

        #endregion

        #region Transfer Requests (Branch to Branch with MySQL Transactions)

        [HttpGet("transfers")]
        [HttpGet("/api/inventory/transfers")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef,Staff")]
        public async Task<IActionResult> GetTransfers(
            [FromQuery] string? status = null,
            [FromQuery] int? branchId = null,
            [FromQuery] int? toBranchId = null,
            [FromQuery] int? fromBranchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var query = _context.StockTransfers
                .AsNoTracking()
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .Include(t => t.InventoryItem)
                .Include(t => t.CreatedByUser)
                .Include(t => t.ApprovedByUser)
                .Where(t => t.OrganizationId == orgId.Value);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var ownBranchId = AuthorizationHelper.GetBranchId(User);
                if (ownBranchId.HasValue)
                {
                    query = query.Where(t => t.FromBranchId == ownBranchId.Value || t.ToBranchId == ownBranchId.Value);
                }
            }
            else if (branchId.HasValue)
            {
                query = query.Where(t => t.FromBranchId == branchId.Value || t.ToBranchId == branchId.Value);
            }

            if (toBranchId.HasValue)
            {
                query = query.Where(t => t.ToBranchId == toBranchId.Value);
            }

            if (fromBranchId.HasValue)
            {
                query = query.Where(t => t.FromBranchId == fromBranchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normStatus = status.Trim().ToLower().Replace("_", " ");
                query = query.Where(t => t.Status.ToLower().Replace("_", " ") == normStatus);
            }

            var rawRows = await query
                .OrderByDescending(t => t.CreatedAt)
                .Take(500)
                .ToListAsync();

            // Group by TransferNumber so multi-item transfers appear as one transfer entity
            var grouped = rawRows
                .GroupBy(t => string.IsNullOrWhiteSpace(t.TransferNumber) ? $"TRF-{t.Id:D5}" : t.TransferNumber!)
                .Select(g =>
                {
                    var first = g.First();
                    var itemsList = g.Select(i => new
                    {
                        id = i.Id,
                        inventoryItemId = i.InventoryItemId,
                        itemName = i.InventoryItem != null ? i.InventoryItem.Name : "Item",
                        itemCode = i.InventoryItem != null ? (i.InventoryItem.ItemCode ?? $"ITM-{i.InventoryItemId}") : "",
                        unit = i.InventoryItem != null ? i.InventoryItem.Unit : "Units",
                        quantity = i.Quantity,
                        requestedQuantity = i.Quantity,
                        dispatchedQuantity = i.DispatchedQuantity ?? i.Quantity,
                        receivedQuantity = i.ReceivedQuantity ?? ((i.Status == "RECEIVED" || i.Status == "COMPLETED") ? i.Quantity : 0)
                    }).ToList();

                    var rawStatus = (first.Status ?? "").Trim();
                    var upperStatus = rawStatus.ToUpperInvariant().Replace("_", " ");
                    string displayStatus = "Pending";
                    if (upperStatus == "RECEIVED" || upperStatus == "COMPLETED") displayStatus = "Received";
                    else if (upperStatus == "CANCELLED" || upperStatus == "REJECTED") displayStatus = "Cancelled";
                    else if (upperStatus == "IN TRANSIT") displayStatus = "In Transit";
                    else displayStatus = "Pending";

                    var transferredAtDate = first.TransferDate ?? first.CreatedAt;

                    return new
                    {
                        id = first.Id,
                        transferId = g.Key,
                        transferNumber = g.Key,
                        fromBranchId = first.FromBranchId,
                        fromBranchName = first.FromBranch != null ? first.FromBranch.Name : "Main Branch",
                        toBranchId = first.ToBranchId,
                        toBranchName = first.ToBranch != null ? first.ToBranch.Name : "Destination Branch",
                        itemId = first.InventoryItemId,
                        inventoryItemId = first.InventoryItemId,
                        item = itemsList.FirstOrDefault()?.itemName ?? "Item",
                        itemName = itemsList.FirstOrDefault()?.itemName ?? "Item",
                        itemCode = itemsList.FirstOrDefault()?.itemCode ?? "",
                        unit = itemsList.FirstOrDefault()?.unit ?? "KG",
                        quantity = itemsList.Sum(x => x.quantity),
                        transferQuantity = itemsList.Sum(x => x.quantity),
                        remarks = first.Notes ?? "",
                        notes = first.Notes ?? "",
                        status = displayStatus,
                        transferredAt = transferredAtDate,
                        transferredBy = first.CreatedByUser != null ? first.CreatedByUser.Name : "",
                        transferredByUserId = first.CreatedByUserId,
                        receivedAt = first.ReceivedAt,
                        receivedBy = first.ApprovedByUser != null ? first.ApprovedByUser.Name : "",
                        receivedByUserId = first.ApprovedByUserId,
                        createdAt = first.CreatedAt,
                        updatedAt = first.UpdatedAt,
                        dispatchedAt = first.DispatchedAt,
                        itemCount = itemsList.Count,
                        items = itemsList
                    };
                })
                .ToList();

            return Ok(grouped);
        }

        [HttpGet("transfers/{id:int}")]
        [HttpGet("/api/inventory/transfers/{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef,Staff")]
        public async Task<IActionResult> GetTransferById(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var record = await _context.StockTransfers
                .AsNoTracking()
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .Include(t => t.InventoryItem)
                .Include(t => t.CreatedByUser)
                .Include(t => t.ApprovedByUser)
                .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == orgId.Value);

            if (record == null) return NotFound(new { message = "Transfer not found." });

            var transferNumber = record.TransferNumber ?? $"TRF-{record.Id:D5}";

            var siblingRecords = await _context.StockTransfers
                .AsNoTracking()
                .Include(t => t.InventoryItem)
                .Where(t => t.OrganizationId == orgId.Value && (t.TransferNumber == transferNumber || t.Id == id))
                .ToListAsync();

            var itemsList = siblingRecords.Select(i => new
            {
                id = i.Id,
                inventoryItemId = i.InventoryItemId,
                itemName = i.InventoryItem != null ? i.InventoryItem.Name : "Item",
                itemCode = i.InventoryItem != null ? (i.InventoryItem.ItemCode ?? $"ITM-{i.InventoryItemId}") : "",
                unit = i.InventoryItem != null ? i.InventoryItem.Unit : "Units",
                quantity = i.Quantity,
                requestedQuantity = i.Quantity,
                dispatchedQuantity = i.DispatchedQuantity ?? i.Quantity,
                receivedQuantity = i.ReceivedQuantity ?? ((i.Status == "RECEIVED" || i.Status == "COMPLETED") ? i.Quantity : 0)
            }).ToList();

            var rawStatus = (record.Status ?? "").Trim();
            var upperStatus = rawStatus.ToUpperInvariant().Replace("_", " ");
            string displayStatus = "Pending";
            if (upperStatus == "RECEIVED" || upperStatus == "COMPLETED") displayStatus = "Received";
            else if (upperStatus == "CANCELLED" || upperStatus == "REJECTED") displayStatus = "Cancelled";
            else if (upperStatus == "IN TRANSIT") displayStatus = "In Transit";
            else displayStatus = "Pending";

            var transferredAtDate = record.TransferDate ?? record.CreatedAt;

            return Ok(new
            {
                id = record.Id,
                transferId = transferNumber,
                transferNumber = transferNumber,
                fromBranchId = record.FromBranchId,
                fromBranchName = record.FromBranch != null ? record.FromBranch.Name : "Main Branch",
                toBranchId = record.ToBranchId,
                toBranchName = record.ToBranch != null ? record.ToBranch.Name : "Destination Branch",
                itemId = record.InventoryItemId,
                inventoryItemId = record.InventoryItemId,
                item = itemsList.FirstOrDefault()?.itemName ?? "Item",
                itemName = itemsList.FirstOrDefault()?.itemName ?? "Item",
                itemCode = itemsList.FirstOrDefault()?.itemCode ?? "",
                unit = itemsList.FirstOrDefault()?.unit ?? "KG",
                quantity = itemsList.Sum(x => x.quantity),
                transferQuantity = itemsList.Sum(x => x.quantity),
                remarks = record.Notes ?? "",
                notes = record.Notes ?? "",
                status = displayStatus,
                transferredAt = transferredAtDate,
                transferredBy = record.CreatedByUser != null ? record.CreatedByUser.Name : "",
                transferredByUserId = record.CreatedByUserId,
                receivedAt = record.ReceivedAt,
                receivedBy = record.ApprovedByUser != null ? record.ApprovedByUser.Name : "",
                receivedByUserId = record.ApprovedByUserId,
                createdAt = record.CreatedAt,
                updatedAt = record.UpdatedAt,
                dispatchedAt = record.DispatchedAt,
                itemCount = itemsList.Count,
                items = itemsList
            });
        }

        [HttpPost("transfers")]
        [HttpPost("/api/inventory/transfers")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> CreateTransfer(CreateTransferRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            // 1. Determine FromBranchId (Sender branch)
            int fromBranchId;
            if (AuthorizationHelper.IsBranchUser(User))
            {
                var ownBranchId = AuthorizationHelper.GetBranchId(User);
                if (!ownBranchId.HasValue) return Forbid();
                fromBranchId = ownBranchId.Value;
            }
            else if (request.FromBranchId.HasValue && request.FromBranchId.Value > 0)
            {
                fromBranchId = request.FromBranchId.Value;
            }
            else
            {
                var mainBranch = await _context.Branches
                    .FirstOrDefaultAsync(b => b.OrganizationId == orgId.Value && (b.Name.ToLower().Contains("main") || b.Name.ToLower().Contains("central")))
                    ?? await _context.Branches.FirstOrDefaultAsync(b => b.OrganizationId == orgId.Value);

                if (mainBranch == null)
                    return BadRequest(new { message = "No valid branch found for this organization." });

                fromBranchId = mainBranch.Id;
            }

            // 2. Validate ToBranchId
            if (fromBranchId == request.ToBranchId)
                return BadRequest(new { message = "Source branch and destination branch cannot be the same." });

            var fromBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == fromBranchId && b.OrganizationId == orgId.Value);
            var destBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == request.ToBranchId && b.OrganizationId == orgId.Value && b.IsActive);
            if (destBranch == null)
                return BadRequest(new { message = "Destination branch not found or inactive." });

            // 3. Assemble items list from request
            var lines = new List<(int ItemId, decimal Qty)>();
            if (request.Items != null && request.Items.Count > 0)
            {
                foreach (var it in request.Items)
                {
                    if (it.InventoryItemId <= 0 || it.Quantity <= 0)
                        return BadRequest(new { message = "Each item must have a valid selection and quantity greater than zero." });
                    lines.Add((it.InventoryItemId, it.Quantity));
                }
            }
            else
            {
                var itemId = request.ItemId ?? request.InventoryItemId;
                var qty = request.TransferQuantity ?? request.Quantity;
                if (!itemId.HasValue || itemId.Value <= 0)
                    return BadRequest(new { message = "Please select an inventory item to transfer." });
                if (!qty.HasValue || qty.Value <= 0)
                    return BadRequest(new { message = "Transfer quantity must be greater than 0." });

                lines.Add((itemId.Value, qty.Value));
            }

            // 4. Duplicate items check
            var distinctIds = lines.Select(l => l.ItemId).Distinct().Count();
            if (distinctIds != lines.Count)
                return BadRequest(new { message = "Duplicate items cannot be added to the same transfer." });

            // 5. Validate source stock for all items
            var itemEntities = new Dictionary<int, InventoryItem>();
            foreach (var line in lines)
            {
                var sourceItem = await _context.InventoryItems.FirstOrDefaultAsync(i =>
                    i.Id == line.ItemId && i.OrganizationId == orgId.Value && i.BranchId == fromBranchId);

                if (sourceItem == null)
                    return BadRequest(new { message = $"Inventory item ID {line.ItemId} not found in branch '{fromBranch?.Name ?? "Sender Branch"}'." });

                if (sourceItem.CurrentStock < line.Qty)
                    return BadRequest(new { message = $"Transfer quantity cannot exceed available stock. Available stock for '{sourceItem.Name}': {sourceItem.CurrentStock} {sourceItem.Unit}, Requested: {line.Qty} {sourceItem.Unit}." });

                itemEntities[line.ItemId] = sourceItem;
            }

            // 6. Generate clean unique Transfer ID: TRF-xxxxx
            var existingTrfs = await _context.StockTransfers
                .Where(t => t.OrganizationId == orgId.Value && t.TransferNumber != null)
                .Select(t => t.TransferNumber!)
                .ToListAsync();

            var trfSet = new HashSet<string>(existingTrfs, StringComparer.OrdinalIgnoreCase);

            int maxNum = 0;
            foreach (var trf in existingTrfs)
            {
                if (trf.StartsWith("TRF-", StringComparison.OrdinalIgnoreCase))
                {
                    var suffix = trf.Substring(4);
                    if (int.TryParse(suffix, out var num))
                    {
                        if (num > maxNum) maxNum = num;
                    }
                }
            }
            var maxId = await _context.StockTransfers.MaxAsync(t => (int?)t.Id) ?? 0;
            if (maxNum < maxId) maxNum = maxId;

            var transferNumber = $"TRF-{(maxNum + 1):D5}";
            while (trfSet.Contains(transferNumber))
            {
                maxNum++;
                transferNumber = $"TRF-{(maxNum + 1):D5}";
            }

            var nowUtc = DateTime.UtcNow;
            var createdTransfers = new List<StockTransfer>();

            using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var line in lines)
                {
                    var sourceItem = itemEntities[line.ItemId];
                    var sourceBefore = sourceItem.CurrentStock;

                    // A. DEDUCT TRANSFER QUANTITY FROM SENDER BRANCH INVENTORY IMMEDIATELY!
                    sourceItem.CurrentStock -= line.Qty;
                    sourceItem.UpdatedAt = nowUtc;

                    // B. CREATE TRANSFER RECORD (Status = Pending, TransferredAt = exact time)
                    var st = new StockTransfer
                    {
                        OrganizationId = orgId.Value,
                        FromBranchId = fromBranchId,
                        ToBranchId = request.ToBranchId,
                        InventoryItemId = line.ItemId,
                        Quantity = line.Qty,
                        TransferNumber = transferNumber,
                        Status = "Pending",
                        Notes = (request.Remarks ?? request.Notes)?.Trim(),
                        CreatedByUserId = userId.Value,
                        CreatedAt = nowUtc,
                        TransferDate = nowUtc, // TransferredAt
                        ReceivedAt = null,
                        ApprovedByUserId = null
                    };
                    _context.StockTransfers.Add(st);
                    createdTransfers.Add(st);
                    await _context.SaveChangesAsync();

                    // C. RECORD TRANSFER_OUT AUDIT STOCK MOVEMENT FOR SENDER BRANCH
                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = fromBranchId,
                        InventoryItemId = sourceItem.Id,
                        Type = "TRANSFER_OUT",
                        Quantity = line.Qty,
                        StockBefore = sourceBefore,
                        StockAfter = sourceItem.CurrentStock,
                        Reference = transferNumber,
                        ReferenceType = "Transfer",
                        ReferenceId = st.Id.ToString(),
                        SourceLocation = fromBranch?.Name ?? "Main Branch",
                        DestinationLocation = destBranch.Name,
                        Notes = $"Internal stock transfer to {destBranch.Name}. {(request.Remarks ?? request.Notes)}".Trim(),
                        CreatedByUserId = userId.Value,
                        CreatedAt = nowUtc
                    });
                }

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                // Destination branch stock is NOT changed yet!
                var firstCreated = createdTransfers.First();
                var firstItem = itemEntities[firstCreated.InventoryItemId];

                return Ok(new
                {
                    message = $"Inventory Transfer {transferNumber} created successfully. Stock deducted from {fromBranch?.Name ?? "Sender Branch"}.",
                    transferId = firstCreated.Id,
                    id = firstCreated.Id,
                    transferNumber = transferNumber,
                    status = "Pending",
                    transferredAt = nowUtc,
                    transferredBy = User.Identity?.Name ?? "",
                    fromBranchId = fromBranchId,
                    fromBranchName = fromBranch?.Name ?? "",
                    toBranchId = request.ToBranchId,
                    toBranchName = destBranch.Name,
                    itemId = firstItem.Id,
                    itemName = firstItem.Name,
                    quantity = lines.Sum(x => x.Qty),
                    unit = firstItem.Unit,
                    availableStock = firstItem.CurrentStock
                });
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync();
                return StatusCode(500, new { message = "Failed to create transfer: " + ex.Message });
            }
        }

        [HttpPost("transfers/{id:int}/dispatch")]
        [HttpPost("/api/inventory/transfers/{id:int}/dispatch")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager")]
        public async Task<IActionResult> DispatchTransfer(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var primary = await _context.StockTransfers
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == orgId.Value);

            if (primary == null) return NotFound(new { message = "Transfer request not found." });

            var transferNumber = primary.TransferNumber ?? $"TRF-{primary.Id:D5}";

            var siblings = await _context.StockTransfers
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .Include(t => t.InventoryItem)
                .Where(t => t.OrganizationId == orgId.Value && (t.TransferNumber == transferNumber || t.Id == id))
                .ToListAsync();

            var currentStatus = primary.Status.ToUpperInvariant().Replace("_", " ");
            if (currentStatus == "IN TRANSIT" || currentStatus == "RECEIVED" || currentStatus == "COMPLETED")
                return BadRequest(new { message = $"Transfer {transferNumber} is already {currentStatus} and cannot be dispatched again." });

            if (currentStatus == "REJECTED")
                return BadRequest(new { message = $"Cannot dispatch a rejected transfer." });

            // Validate source stock for all items before beginning database transaction
            foreach (var transfer in siblings)
            {
                var sourceItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == transfer.InventoryItemId);
                if (sourceItem == null)
                    return BadRequest(new { message = $"Inventory item {transfer.InventoryItemId} not found." });

                if (sourceItem.CurrentStock < transfer.Quantity)
                    return BadRequest(new { message = $"Insufficient stock for '{sourceItem.Name}' in Central Inventory. Available: {sourceItem.CurrentStock} {sourceItem.Unit}, Requested: {transfer.Quantity} {sourceItem.Unit}." });
            }

            using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var transfer in siblings)
                {
                    var sourceItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == transfer.InventoryItemId);
                    if (sourceItem == null)
                        throw new InvalidOperationException($"Inventory item {transfer.InventoryItemId} not found.");

                    if (sourceItem.CurrentStock < transfer.Quantity)
                        return BadRequest(new { message = $"Insufficient stock for '{sourceItem.Name}' in Central Inventory. Available: {sourceItem.CurrentStock}." });

                    // 1. Deduct stock from Central Inventory
                    var sourceBefore = sourceItem.CurrentStock;
                    sourceItem.CurrentStock -= transfer.Quantity;
                    sourceItem.UpdatedAt = DateTime.UtcNow;

                    // 2. Record TRANSFER_OUT stock movement for Central
                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = sourceItem.BranchId,
                        InventoryItemId = sourceItem.Id,
                        Type = "TRANSFER_OUT",
                        Quantity = transfer.Quantity,
                        StockBefore = sourceBefore,
                        StockAfter = sourceItem.CurrentStock,
                        Reference = transferNumber,
                        ReferenceType = "Transfer",
                        ReferenceId = transfer.Id.ToString(),
                        SourceLocation = transfer.FromBranch != null ? transfer.FromBranch.Name : "Central Inventory",
                        DestinationLocation = transfer.ToBranch != null ? transfer.ToBranch.Name : "Destination Branch",
                        Notes = $"Transfer dispatched to {transfer.ToBranch?.Name ?? "Destination Branch"}",
                        CreatedByUserId = userId.Value,
                        CreatedAt = DateTime.UtcNow
                    });

                    transfer.Status = "IN TRANSIT";
                    transfer.DispatchedAt = DateTime.UtcNow;
                    transfer.DispatchedQuantity = transfer.Quantity;
                    transfer.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                // Destination branch stock remains UNCHANGED!
                return Ok(new { message = $"Transfer {transferNumber} dispatched and now IN TRANSIT.", status = "IN TRANSIT" });
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync();
                return StatusCode(500, new { message = "Failed to dispatch transfer: " + ex.Message });
            }
        }

        [HttpPost("transfers/{id:int}/receive")]
        [HttpPost("/api/inventory/transfers/{id:int}/receive")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> ReceiveTransfer(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var primary = await _context.StockTransfers
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .Include(t => t.InventoryItem)
                .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == orgId.Value);

            if (primary == null) return NotFound(new { message = "Transfer request not found." });

            var transferNumber = primary.TransferNumber ?? $"TRF-{primary.Id:D5}";

            // Duplicate Protection: Check Status == "Pending"
            var currentStatus = (primary.Status ?? "").Trim().ToUpperInvariant().Replace("_", " ");
            if (currentStatus == "RECEIVED" || currentStatus == "COMPLETED")
                return BadRequest(new { message = $"Transfer {transferNumber} has already been received. Duplicate receive is prevented." });

            if (currentStatus == "CANCELLED" || currentStatus == "REJECTED")
                return BadRequest(new { message = "Cannot receive a cancelled transfer." });

            // Branch authorization check: must belong to destination branch or be Org/Super Admin
            if (AuthorizationHelper.IsBranchUser(User))
            {
                var ownBranchId = AuthorizationHelper.GetBranchId(User);
                if (ownBranchId.HasValue && primary.ToBranchId.HasValue && ownBranchId.Value != primary.ToBranchId.Value)
                    return StatusCode(403, new { message = "You can only receive transfers destined for your branch." });
            }

            var siblings = await _context.StockTransfers
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .Include(t => t.InventoryItem)
                .Where(t => t.OrganizationId == orgId.Value && (t.TransferNumber == transferNumber || t.Id == id))
                .ToListAsync();

            using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                var nowUtc = DateTime.UtcNow;

                foreach (var transfer in siblings)
                {
                    var sourceItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == transfer.InventoryItemId);
                    if (sourceItem == null)
                        throw new InvalidOperationException($"Inventory item {transfer.InventoryItemId} not found.");

                    if (!transfer.ToBranchId.HasValue)
                        throw new InvalidOperationException("Destination branch is not specified.");

                    // Find matching item in destination branch or create one
                    var destItem = await _context.InventoryItems.FirstOrDefaultAsync(i =>
                        i.OrganizationId == orgId.Value &&
                        i.BranchId == transfer.ToBranchId.Value &&
                        i.Name.ToLower() == sourceItem.Name.ToLower() &&
                        i.IsActive);

                    if (destItem == null)
                    {
                        destItem = new InventoryItem
                        {
                            OrganizationId = orgId.Value,
                            BranchId = transfer.ToBranchId.Value,
                            Name = sourceItem.Name,
                            ItemCode = sourceItem.ItemCode,
                            Category = sourceItem.Category,
                            CategoryId = sourceItem.CategoryId,
                            Unit = sourceItem.Unit,
                            MinimumStock = sourceItem.MinimumStock,
                            ReorderLevel = sourceItem.ReorderLevel,
                            MaximumStock = sourceItem.MaximumStock,
                            LastPurchasePrice = sourceItem.LastPurchasePrice,
                            CurrentStock = 0,
                            IsActive = true,
                            CreatedAt = nowUtc
                        };
                        _context.InventoryItems.Add(destItem);
                        await _context.SaveChangesAsync();
                    }

                    // 1. Add transferred quantity to receiver branch inventory
                    var destBefore = destItem.CurrentStock;
                    destItem.CurrentStock += transfer.Quantity;
                    destItem.UpdatedAt = nowUtc;

                    // 2. Record TRANSFER_IN stock movement for destination branch
                    _context.StockTransactions.Add(new StockTransaction
                    {
                        OrganizationId = orgId.Value,
                        BranchId = destItem.BranchId,
                        InventoryItemId = destItem.Id,
                        Type = "TRANSFER_IN",
                        Quantity = transfer.Quantity,
                        StockBefore = destBefore,
                        StockAfter = destItem.CurrentStock,
                        Reference = transferNumber,
                        ReferenceType = "Transfer",
                        ReferenceId = transfer.Id.ToString(),
                        SourceLocation = transfer.FromBranch != null ? transfer.FromBranch.Name : "Main Branch",
                        DestinationLocation = transfer.ToBranch != null ? transfer.ToBranch.Name : "Destination Branch",
                        Notes = $"Internal stock transfer received from {transfer.FromBranch?.Name ?? "Main Branch"}",
                        CreatedByUserId = userId.Value,
                        CreatedAt = nowUtc
                    });

                    // 3. Update status and exact Receive time (TransferredAt is preserved!)
                    transfer.Status = "Received";
                    transfer.ReceivedAt = nowUtc;
                    transfer.ApprovedByUserId = userId.Value; // ReceivedBy
                    transfer.ReceivedQuantity = transfer.Quantity;
                    transfer.UpdatedAt = nowUtc;
                }

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                return Ok(new
                {
                    message = $"Stock for transfer {transferNumber} received successfully. Destination inventory updated.",
                    status = "Received",
                    receivedAt = nowUtc,
                    transferredAt = primary.TransferDate
                });
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync();
                return StatusCode(500, new { message = "Failed to receive transfer: " + ex.Message });
            }
        }

        [HttpPost("transfers/{id:int}/cancel")]
        [HttpPost("/api/inventory/transfers/{id:int}/cancel")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager")]
        public async Task<IActionResult> CancelTransfer(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var primary = await _context.StockTransfers
                .Include(t => t.FromBranch)
                .Include(t => t.ToBranch)
                .Include(t => t.InventoryItem)
                .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == orgId.Value);

            if (primary == null) return NotFound(new { message = "Transfer request not found." });

            var currentStatus = (primary.Status ?? "").Trim().ToUpperInvariant().Replace("_", " ");
            if (currentStatus == "RECEIVED" || currentStatus == "COMPLETED")
                return BadRequest(new { message = "Cannot cancel an already received transfer." });

            if (currentStatus == "CANCELLED" || currentStatus == "REJECTED")
                return BadRequest(new { message = "Transfer is already cancelled." });

            var transferNumber = primary.TransferNumber ?? $"TRF-{primary.Id:D5}";
            var siblings = await _context.StockTransfers
                .Where(t => t.OrganizationId == orgId.Value && (t.TransferNumber == transferNumber || t.Id == id))
                .ToListAsync();

            using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                var nowUtc = DateTime.UtcNow;
                foreach (var transfer in siblings)
                {
                    var sourceItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == transfer.InventoryItemId);
                    if (sourceItem != null)
                    {
                        var beforeStock = sourceItem.CurrentStock;
                        sourceItem.CurrentStock += transfer.Quantity;
                        sourceItem.UpdatedAt = nowUtc;

                        _context.StockTransactions.Add(new StockTransaction
                        {
                            OrganizationId = orgId.Value,
                            BranchId = sourceItem.BranchId,
                            InventoryItemId = sourceItem.Id,
                            Type = "TRANSFER_CANCEL",
                            Quantity = transfer.Quantity,
                            StockBefore = beforeStock,
                            StockAfter = sourceItem.CurrentStock,
                            Reference = transferNumber,
                            ReferenceType = "Transfer",
                            ReferenceId = transfer.Id.ToString(),
                            SourceLocation = transfer.FromBranch?.Name ?? "Main Branch",
                            DestinationLocation = transfer.ToBranch?.Name ?? "Destination Branch",
                            Notes = $"Transfer cancelled. Stock restored to {transfer.FromBranch?.Name ?? "Main Branch"}",
                            CreatedByUserId = userId.Value,
                            CreatedAt = nowUtc
                        });
                    }

                    transfer.Status = "Cancelled";
                    transfer.UpdatedAt = nowUtc;
                }

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                return Ok(new { message = $"Transfer {transferNumber} cancelled successfully. Stock restored to sender branch.", status = "Cancelled" });
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync();
                return StatusCode(500, new { message = "Failed to cancel transfer: " + ex.Message });
            }
        }

        [HttpPost("transfers/{id:int}/approve")]
        [HttpPost("/api/inventory/transfers/{id:int}/approve")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> ApproveTransfer(int id)
        {
            return await UpdateTransferStatus(id, new UpdateTransferStatusRequest { Status = "APPROVED" });
        }

        [HttpPost("transfers/{id:int}/status")]
        [HttpPost("/api/inventory/transfers/{id:int}/status")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> UpdateTransferStatus(int id, UpdateTransferStatusRequest request)
        {
            var nextStatus = request.Status.Trim().ToUpperInvariant().Replace("_", " ");

            if (nextStatus == "DISPATCHED" || nextStatus == "IN TRANSIT")
            {
                return await DispatchTransfer(id);
            }

            if (nextStatus == "RECEIVED" || nextStatus == "COMPLETED")
            {
                return await ReceiveTransfer(id);
            }

            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var primary = await _context.StockTransfers
                .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == orgId.Value);

            if (primary == null) return NotFound(new { message = "Transfer request not found." });

            var transferNumber = primary.TransferNumber ?? $"TRF-{primary.Id:D5}";

            var siblings = await _context.StockTransfers
                .Where(t => t.OrganizationId == orgId.Value && (t.TransferNumber == transferNumber || t.Id == id))
                .ToListAsync();

            if (nextStatus == "APPROVED")
            {
                foreach (var t in siblings)
                {
                    t.Status = "APPROVED";
                    t.ApprovedByUserId = userId.Value;
                    t.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                return Ok(new { message = $"Transfer {transferNumber} approved.", status = "APPROVED" });
            }

            if (nextStatus == "REJECTED")
            {
                foreach (var t in siblings)
                {
                    t.Status = "REJECTED";
                    t.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                return Ok(new { message = $"Transfer {transferNumber} rejected.", status = "REJECTED" });
            }

            return BadRequest(new { message = $"Invalid transfer status: {request.Status}." });
        }

        #endregion

        #region Plan vs Actual

        [HttpGet("plan-vs-actual")]
        public async Task<IActionResult> GetPlanVsActual([FromQuery] string? branchId = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bid) && bid > 0) parsedBranchId = bid;
            var targetBranchId = ResolveBranch(parsedBranchId);

            DateTime? parsedFrom = null;
            if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out var fdt)) parsedFrom = fdt;
            DateTime? parsedTo = null;
            if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out var tdt)) parsedTo = tdt;

            var start = parsedFrom ?? DateTime.UtcNow.AddDays(-7).Date;
            var end = (parsedTo ?? DateTime.UtcNow).Date.AddDays(1);

            // Fetch actual productions in the date range
            var actualQuery = _context.ActualProductions
                .AsNoTracking()
                .Include(p => p.MenuItem)
                .Include(p => p.Branch)
                .Include(p => p.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .Where(p => p.OrganizationId == orgId.Value && p.ProductionDate >= start && p.ProductionDate < end);

            if (targetBranchId.HasValue) actualQuery = actualQuery.Where(p => p.BranchId == targetBranchId.Value);

            var actuals = await actualQuery.ToListAsync();

            // Group by Menu Item
            var menuComparison = actuals
                .GroupBy(a => new { a.MenuItemId, a.MenuItem?.Name })
                .Select(g =>
                {
                    var planned = g.Sum(x => x.PlannedQuantity);
                    var actual = g.Sum(x => x.ActualQuantity);
                    var diff = actual - planned;
                    var diffPct = planned > 0 ? (diff / planned) * 100 : 0;
                    var wastage = g.Sum(x => x.WastageQuantity);

                    return new
                    {
                        menuItemId = g.Key.MenuItemId,
                        menuItemName = g.Key.Name ?? "Unknown Item",
                        plannedQuantity = planned,
                        actualQuantity = actual,
                        difference = diff,
                        differencePercentage = Math.Round(diffPct, 1),
                        totalWastage = wastage,
                        batchCount = g.Count()
                    };
                })
                .OrderByDescending(x => x.actualQuantity)
                .ToList();

            // Ingredient Usage Comparison
            var allIngredientUsages = actuals.SelectMany(a => a.Ingredients).ToList();
            var ingredientComparison = allIngredientUsages
                .GroupBy(i => new { i.InventoryItemId, i.InventoryItem?.Name, i.InventoryItem?.Unit })
                .Select(g =>
                {
                    var planned = g.Sum(x => x.PlannedQuantity);
                    var actual = g.Sum(x => x.Quantity);
                    var diff = actual - planned;
                    var diffPct = planned > 0 ? (diff / planned) * 100 : 0;

                    return new
                    {
                        inventoryItemId = g.Key.InventoryItemId,
                        itemName = g.Key.Name ?? "Unknown Ingredient",
                        unit = g.Key.Unit ?? "KG",
                        plannedQuantity = planned,
                        actualQuantity = actual,
                        difference = diff,
                        differencePercentage = Math.Round(diffPct, 1)
                    };
                })
                .OrderByDescending(x => x.actualQuantity)
                .ToList();

            return Ok(new
            {
                dateRange = new { start, end },
                productionComparison = menuComparison,
                ingredientComparison = ingredientComparison
            });
        }

        #endregion

        #region Kitchen Reports

        [HttpGet("reports")]
        public async Task<IActionResult> GetReports(
            [FromQuery] string type = "inventory",
            [FromQuery] string? branchId = null,
            [FromQuery] string? fromDate = null,
            [FromQuery] string? toDate = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bid) && bid > 0) parsedBranchId = bid;
            var targetBranchId = ResolveBranch(parsedBranchId);

            DateTime? parsedFrom = null;
            if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out var fdt)) parsedFrom = fdt;
            DateTime? parsedTo = null;
            if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out var tdt)) parsedTo = tdt;

            var start = parsedFrom ?? DateTime.UtcNow.AddDays(-30).Date;
            var end = (parsedTo ?? DateTime.UtcNow).Date.AddDays(1);

            switch (type.ToLowerInvariant())
            {
                case "purchases":
                {
                    var query = _context.Purchases
                        .AsNoTracking()
                        .Include(p => p.Supplier)
                        .Include(p => p.Branch)
                        .Include(p => p.CreatedByUser)
                        .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
                        .Where(p => p.OrganizationId == orgId.Value && p.CreatedAt >= start && p.CreatedAt < end);

                    if (targetBranchId.HasValue) query = query.Where(p => p.BranchId == targetBranchId.Value);

                    var purchases = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
                    var data = purchases.Select(p => new
                    {
                        p.Id,
                        purchaseNumber = p.PurchaseNumber ?? p.InvoiceNumber,
                        invoiceNumber = p.InvoiceNumber,
                        vendorName = p.Supplier != null ? p.Supplier.Name : "",
                        branchName = p.Branch != null ? p.Branch.Name : "",
                        purchaseDate = p.PurchaseDate,
                        totalAmount = p.TotalAmount,
                        status = p.Status,
                        itemsCount = p.Items.Count,
                        totalQuantity = p.Items.Sum(it => it.Quantity),
                        itemsSummary = string.Join(", ", p.Items.Select(it => $"{(it.InventoryItem != null ? it.InventoryItem.Name : "Item")} ({it.Quantity:G29} {it.Unit ?? "unit"})")),
                        createdBy = p.CreatedByUser != null ? p.CreatedByUser.Name : "",
                        createdAt = p.CreatedAt,
                        items = p.Items.Select(it => new
                        {
                            it.Id,
                            itemName = it.InventoryItem != null ? it.InventoryItem.Name : "",
                            quantity = it.Quantity,
                            unitCost = it.UnitCost,
                            totalCost = it.TotalCost,
                            unit = it.Unit,
                            batchNumber = it.BatchNumber,
                            expiryDate = it.ExpiryDate
                        }).ToList()
                    }).ToList();

                    return Ok(new { reportType = "purchases", totalRecords = data.Count, data });
                }

                case "grn":
                {
                    var query = _context.Purchases
                        .AsNoTracking()
                        .Include(p => p.Supplier)
                        .Include(p => p.Branch)
                        .Include(p => p.CreatedByUser)
                        .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
                        .Where(p => p.OrganizationId == orgId.Value &&
                                    (p.Status == "Received" || p.Status == "Partially Returned" || p.Status == "Returned") &&
                                    ((p.UpdatedAt ?? p.CreatedAt) >= start && (p.UpdatedAt ?? p.CreatedAt) < end));

                    if (targetBranchId.HasValue) query = query.Where(p => p.BranchId == targetBranchId.Value);

                    var receivedPurchases = await query.OrderByDescending(p => p.UpdatedAt ?? p.CreatedAt).ToListAsync();
                    var data = receivedPurchases.Select(p => new
                    {
                        p.Id,
                        grnNumber = "GRN-" + (!string.IsNullOrWhiteSpace(p.PurchaseNumber) ? p.PurchaseNumber.Replace("PO-", "").Replace("PUR-", "") : p.Id.ToString("D5")),
                        poNumber = p.PurchaseNumber ?? p.InvoiceNumber,
                        invoiceNumber = p.InvoiceNumber,
                        vendorName = p.Supplier != null ? p.Supplier.Name : "",
                        branchName = p.Branch != null ? p.Branch.Name : "",
                        receivedDate = p.UpdatedAt ?? p.CreatedAt,
                        purchaseDate = p.PurchaseDate,
                        totalAmount = p.TotalAmount,
                        status = p.Status,
                        itemsCount = p.Items.Count,
                        totalQuantity = p.Items.Sum(it => it.Quantity),
                        itemsSummary = string.Join(", ", p.Items.Select(it => $"{(it.InventoryItem != null ? it.InventoryItem.Name : "Item")} ({it.Quantity:G29} {it.Unit ?? "unit"}{(string.IsNullOrWhiteSpace(it.BatchNumber) ? "" : $" | Batch: {it.BatchNumber}")})")),
                        receivedBy = p.CreatedByUser != null ? p.CreatedByUser.Name : "",
                        notes = p.Notes,
                        items = p.Items.Select(it => new
                        {
                            it.Id,
                            itemName = it.InventoryItem != null ? it.InventoryItem.Name : "",
                            quantity = it.Quantity,
                            unitCost = it.UnitCost,
                            totalCost = it.TotalCost,
                            unit = it.Unit,
                            batchNumber = it.BatchNumber,
                            expiryDate = it.ExpiryDate
                        }).ToList()
                    }).ToList();

                    return Ok(new { reportType = "grn", totalRecords = data.Count, data });
                }

                case "vendors":
                {
                    var query = _context.Suppliers
                        .AsNoTracking()
                        .Include(s => s.Purchases)
                        .Where(s => s.OrganizationId == orgId.Value);

                    var data = await query.OrderBy(s => s.Name).Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.ContactPerson,
                        s.Phone,
                        s.Email,
                        s.GstNumber,
                        s.IsActive,
                        totalOrders = s.Purchases.Count,
                        totalSpend = s.Purchases.Where(p => p.Status == "Received").Sum(p => p.TotalAmount)
                    }).ToListAsync();

                    return Ok(new { reportType = "vendors", totalRecords = data.Count, data });
                }

                case "stock_movements":
                {
                    var query = _context.StockTransactions
                        .AsNoTracking()
                        .Include(t => t.InventoryItem)
                        .Include(t => t.Branch)
                        .Include(t => t.CreatedByUser)
                        .Where(t => t.OrganizationId == orgId.Value && t.CreatedAt >= start && t.CreatedAt < end);

                    if (targetBranchId.HasValue) query = query.Where(t => t.BranchId == targetBranchId.Value);

                    var data = await query.OrderByDescending(t => t.CreatedAt).Take(500).Select(t => new
                    {
                        t.Id,
                        date = t.CreatedAt,
                        itemName = t.InventoryItem != null ? t.InventoryItem.Name : "",
                        unit = t.InventoryItem != null ? t.InventoryItem.Unit : "",
                        branchName = t.Branch != null ? t.Branch.Name : "",
                        t.Type,
                        t.Quantity,
                        t.StockBefore,
                        t.StockAfter,
                        t.Reference,
                        source = t.SourceLocation,
                        destination = t.DestinationLocation,
                        user = t.CreatedByUser != null ? t.CreatedByUser.Name : ""
                    }).ToListAsync();

                    return Ok(new { reportType = "stock_movements", totalRecords = data.Count, data });
                }

                case "material_issues":
                {
                    var query = _context.MaterialIssues
                        .AsNoTracking()
                        .Include(m => m.Branch)
                        .Include(m => m.CreatedByUser)
                        .Include(m => m.Items).ThenInclude(i => i.InventoryItem)
                        .Where(m => m.OrganizationId == orgId.Value && m.CreatedAt >= start && m.CreatedAt < end);

                    if (targetBranchId.HasValue) query = query.Where(m => m.BranchId == targetBranchId.Value);

                    var data = await query.OrderByDescending(m => m.CreatedAt).Select(m => new
                    {
                        m.Id,
                        issueNumber = m.IssueNumber ?? $"ISS-{m.Id}",
                        date = m.Date ?? m.CreatedAt,
                        department = m.Department ?? m.IssueType,
                        m.Reference,
                        totalQuantity = m.Quantity,
                        m.Status,
                        m.ReceivedBy,
                        issuedBy = m.CreatedByUser != null ? m.CreatedByUser.Name : "",
                        itemCount = m.Items.Count
                    }).ToListAsync();

                    return Ok(new { reportType = "material_issues", totalRecords = data.Count, data });
                }

                case "transfers":
                {
                    var query = _context.StockTransfers
                        .AsNoTracking()
                        .Include(t => t.FromBranch)
                        .Include(t => t.ToBranch)
                        .Include(t => t.InventoryItem)
                        .Include(t => t.CreatedByUser)
                        .Where(t => t.OrganizationId == orgId.Value && t.CreatedAt >= start && t.CreatedAt < end);

                    if (targetBranchId.HasValue) query = query.Where(t => t.FromBranchId == targetBranchId.Value || t.ToBranchId == targetBranchId.Value);

                    var data = await query.OrderByDescending(t => t.CreatedAt).Select(t => new
                    {
                        t.Id,
                        transferNumber = t.TransferNumber ?? $"TRF-{t.Id}",
                        fromBranch = t.FromBranch != null ? t.FromBranch.Name : "Store",
                        toBranch = t.ToBranch != null ? t.ToBranch.Name : "Kitchen",
                        itemName = t.InventoryItem != null ? t.InventoryItem.Name : "",
                        t.Quantity,
                        t.Status,
                        requestedBy = t.CreatedByUser != null ? t.CreatedByUser.Name : "",
                        t.CreatedAt,
                        t.ReceivedAt
                    }).ToListAsync();

                    return Ok(new { reportType = "transfers", totalRecords = data.Count, data });
                }

                case "production":
                {
                    var query = _context.ActualProductions
                        .AsNoTracking()
                        .Include(p => p.MenuItem)
                        .Include(p => p.Branch)
                        .Include(p => p.CreatedByUser)
                        .Where(p => p.OrganizationId == orgId.Value && p.ProductionDate >= start && p.ProductionDate < end);

                    if (targetBranchId.HasValue) query = query.Where(p => p.BranchId == targetBranchId.Value);

                    var data = await query.OrderByDescending(p => p.ProductionDate).Select(p => new
                    {
                        p.Id,
                        productionNumber = p.ProductionNumber ?? $"PRD-{p.Id}",
                        date = p.ProductionDate,
                        menuItemName = p.MenuItem != null ? p.MenuItem.Name : "",
                        p.PlannedQuantity,
                        p.ActualQuantity,
                        p.WastageQuantity,
                        variance = p.ActualQuantity - p.PlannedQuantity,
                        p.Status,
                        p.Remarks,
                        createdBy = p.CreatedByUser != null ? p.CreatedByUser.Name : ""
                    }).ToListAsync();

                    return Ok(new { reportType = "production", totalRecords = data.Count, data });
                }

                case "low_stock":
                {
                    var query = _context.InventoryItems
                        .AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId.Value && i.IsActive && (i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) || i.CurrentStock <= 0));

                    if (targetBranchId.HasValue) query = query.Where(i => i.BranchId == targetBranchId.Value);

                    var data = await query.OrderBy(i => i.CurrentStock).Select(i => new
                    {
                        i.Id,
                        i.ItemCode,
                        i.Name,
                        i.Category,
                        i.Unit,
                        branchName = i.Branch != null ? i.Branch.Name : "",
                        i.CurrentStock,
                        i.ReorderLevel,
                        i.MinimumStock,
                        i.MaximumStock,
                        status = i.CurrentStock <= 0 ? "OUT OF STOCK" : "LOW STOCK",
                        suggestedReorderQuantity = i.MaximumStock > i.CurrentStock ? i.MaximumStock - i.CurrentStock : (i.ReorderLevel > i.CurrentStock ? i.ReorderLevel - i.CurrentStock : 10)
                    }).ToListAsync();

                    return Ok(new { reportType = "low_stock", totalRecords = data.Count, data });
                }

                case "inventory":
                default:
                {
                    var query = _context.InventoryItems
                        .AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId.Value && i.IsActive);

                    if (targetBranchId.HasValue) query = query.Where(i => i.BranchId == targetBranchId.Value);

                    var data = await query.OrderBy(i => i.Category).ThenBy(i => i.Name).Select(i => new
                    {
                        i.Id,
                        i.ItemCode,
                        i.Name,
                        i.Category,
                        i.Unit,
                        branchName = i.Branch != null ? i.Branch.Name : "",
                        i.CurrentStock,
                        i.MinimumStock,
                        i.ReorderLevel,
                        i.MaximumStock,
                        status = i.CurrentStock <= 0 ? "OUT OF STOCK" : (i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) ? "LOW STOCK" : "IN STOCK"),
                        lastUpdated = i.UpdatedAt ?? i.CreatedAt
                    }).ToListAsync();

                    return Ok(new { reportType = "inventory", totalRecords = data.Count, data });
                }
            }
        }

        #endregion

        #region Helper Methods

        private int? ResolveBranch(int? requested)
        {
            if (AuthorizationHelper.IsBranchUser(User))
                return AuthorizationHelper.GetBranchId(User);
            return requested;
        }

        private int? ResolveBranch(string? requested)
        {
            int? parsed = null;
            if (!string.IsNullOrWhiteSpace(requested) && int.TryParse(requested.Trim(), out var bId) && bId > 0)
            {
                parsed = bId;
            }
            return ResolveBranch(parsed);
        }

        private int? GetCurrentUserId()
        {
            var value = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("sub")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        #endregion
    }

    #region Request DTOs

    public class CreateVendorRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? GstNumber { get; set; }
    }

    public class UpdateVendorRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? GstNumber { get; set; }
    }

    public class CreatePurchaseRequest
    {
        public int? BranchId { get; set; }
        public int VendorId { get; set; }
        public int? SupplierId { get; set; }
        public int EffectiveVendorId => VendorId > 0 ? VendorId : (SupplierId ?? 0);
        public string? InvoiceNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Status { get; set; } = "Draft"; // Draft, Ordered, Received
        public string? Notes { get; set; }
        public List<PurchaseItemLineRequest> Items { get; set; } = new();
    }

    public class PurchaseItemLineRequest
    {
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal Rate { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? UnitCost { get; set; }
        public decimal EffectiveRate => Rate > 0 ? Rate : (UnitPrice ?? UnitCost ?? 0);
        public string? Unit { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
    }

    public class CreateProductionPlanRequest
    {
        public int? BranchId { get; set; }
        public DateTime? PlanDate { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public DateTime EffectiveDate => PlanDate ?? ScheduledDate ?? DateTime.UtcNow;
        public string? MealType { get; set; } = "General";
        public string? Shift { get; set; } = "Morning";
        public string? KitchenName { get; set; } = "Main Kitchen";
        public int MenuItemId { get; set; }
        public decimal PlannedQuantity { get; set; }
        public string? Unit { get; set; } = "Portion";
        public string? Remarks { get; set; }
        public string? Notes { get; set; }
        public string? EffectiveNotes => Notes ?? Remarks;
        public string? Status { get; set; } = "PLANNED";
        public List<ProductionPlanLineItemRequest>? Items { get; set; }
        public List<ProductionPlanMaterialLineRequest>? Materials { get; set; }
    }

    public class UpdateProductionPlanRequest
    {
        public DateTime? PlanDate { get; set; }
        public string? MealType { get; set; }
        public string? Shift { get; set; }
        public string? KitchenName { get; set; }
        public string? Remarks { get; set; }
        public string? Status { get; set; }
        public List<ProductionPlanLineItemRequest>? Items { get; set; }
        public List<ProductionPlanMaterialLineRequest>? Materials { get; set; }
    }

    public class ProductionPlanLineItemRequest
    {
        public int? Id { get; set; }
        public int MenuItemId { get; set; }
        public decimal PlannedQuantity { get; set; }
        public decimal ExpectedSales { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal ActualSales { get; set; }
        public decimal UnsoldQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string? LossReason { get; set; }
        public string? Remarks { get; set; }
        public string? Status { get; set; }
        public string? Unit { get; set; } = "Portion";
    }

    public class ProductionPlanMaterialLineRequest
    {
        public int? Id { get; set; }
        public int InventoryItemId { get; set; }
        public decimal PlannedQuantity { get; set; }
        public decimal? ActualSentQuantity { get; set; }
        public string? Unit { get; set; }
        public string? Notes { get; set; }
    }

    public class IssueMaterialsRequest
    {
        public List<IssueMaterialLineItemRequest>? Items { get; set; }
        public string? ReceivedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public string? Notes { get; set; }
    }

    public class IssueMaterialLineItemRequest
    {
        public int InventoryItemId { get; set; }
        public decimal ActualSentQuantity { get; set; }
        public string? Unit { get; set; }
    }

    public class RecordKitchenUsageRequest
    {
        public List<RecordMaterialUsageLineRequest> Materials { get; set; } = new();
    }

    public class RecordMaterialUsageLineRequest
    {
        public int? MaterialId { get; set; }
        public int InventoryItemId { get; set; }
        public decimal ActualUsedQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string? Notes { get; set; }
    }

    public class RecordActualProductionRequest
    {
        public int? MenuItemId { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? ActualQuantity { get; set; }
        public List<RecordDishProductionLineRequest> Items { get; set; } = new();
    }

    public class RecordDishProductionLineRequest
    {
        public int? PlanItemId { get; set; }
        public int MenuItemId { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal? Quantity { get; set; }
    }

    public class RecordDishSalesRequest
    {
        public List<RecordDishSalesLineRequest> Items { get; set; } = new();
    }

    public class RecordDishSalesLineRequest
    {
        public int? PlanItemId { get; set; }
        public int MenuItemId { get; set; }
        public decimal ActualSales { get; set; }
        public decimal UnsoldQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string? LossReason { get; set; }
        public string? Remarks { get; set; }
    }

    public class ReturnMaterialsRequest
    {
        public List<ReturnMaterialLineRequest> Returns { get; set; } = new();
        public string? ReturnedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public string? Reason { get; set; }
        public string? Notes { get; set; }
    }

    public class ReturnMaterialLineRequest
    {
        public int? MaterialId { get; set; }
        public int InventoryItemId { get; set; }
        public decimal ReturnedQuantity { get; set; }
        public decimal? IssuedQuantity { get; set; }
        public decimal? ConsumedQuantity { get; set; }
        public string? Notes { get; set; }
    }

    public class CalculateMaterialsRequest
    {
        public int? BranchId { get; set; }
        public List<DishQuantityItem> Dishes { get; set; } = new();
    }

    public class DishQuantityItem
    {
        public int MenuItemId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class CreateProductionEntryRequest
    {
        public int? BranchId { get; set; }
        public int? ProductionPlanId { get; set; }
        public int MenuItemId { get; set; }
        public DateTime? ProductionDate { get; set; }
        public string? MealType { get; set; } = "General";
        public decimal PlannedQuantity { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string? Remarks { get; set; }
        public string? Notes { get; set; }
        public string? EffectiveNotes => Notes ?? Remarks;
    }

    public class CreateMaterialIssueRequest
    {
        public int? BranchId { get; set; }
        public DateTime? Date { get; set; }
        public string? Department { get; set; } = "Kitchen";
        public string? Reference { get; set; }
        public int? ProductionPlanId { get; set; }
        public string? ReceivedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public string? Remarks { get; set; }
        public string? Notes { get; set; }
        public string? EffectiveNotes => Notes ?? Remarks;
        public List<MaterialIssueLineRequest> Items { get; set; } = new();
    }

    public class MaterialIssueLineRequest
    {
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal? IssuedQuantity { get; set; }
        public decimal? RequestedQuantity { get; set; }
        public decimal EffectiveQuantity => Quantity > 0 ? Quantity : ((IssuedQuantity.HasValue && IssuedQuantity.Value > 0) ? IssuedQuantity.Value : (RequestedQuantity ?? 0));
        public string? Unit { get; set; }
    }

    public class CreateMaterialReturnRequest
    {
        public int? BranchId { get; set; }
        public DateTime? Date { get; set; }
        public string? Department { get; set; } = "Main Kitchen";
        public string? ReturnType { get; set; } = "Kitchen Unused";
        public string? Reference { get; set; }
        public int? MaterialIssueId { get; set; }
        public int? ProductionPlanId { get; set; }
        public decimal? IssuedQuantity { get; set; }
        public decimal? ConsumedQuantity { get; set; }
        public decimal? ReturnedQuantity { get; set; }
        public string? Reason { get; set; } = "Unused Product / Excess";
        public string? ReturnedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ReceivedBy { get; set; }
        public string? Remarks { get; set; }
        public string? Notes { get; set; }
        public string? EffectiveNotes => Notes ?? Remarks;
        public List<MaterialReturnLineRequest> Items { get; set; } = new();
    }

    public class MaterialReturnLineRequest
    {
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal? IssuedQuantity { get; set; }
        public decimal? ConsumedQuantity { get; set; }
        public decimal? ReturnedQuantity { get; set; }
        public decimal EffectiveQuantity => Quantity > 0 ? Quantity : (ReturnedQuantity ?? 0);
        public string? Unit { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateTransferRequest
    {
        public int? FromBranchId { get; set; }
        public int ToBranchId { get; set; }
        public DateTime? TransferDate { get; set; }
        public DateTime? TransferredAt { get; set; }
        public int? InventoryItemId { get; set; }
        public int? ItemId { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? TransferQuantity { get; set; }
        public string? Unit { get; set; }
        public string? Remarks { get; set; }
        public string? Notes { get; set; }
        public List<CreateTransferItemDto>? Items { get; set; }
    }

    public class CreateTransferItemDto
    {
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class UpdateTransferStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class PurchaseReturnRequest
    {
        public DateTime? ReturnDate { get; set; }
        public string? Reason { get; set; } = "Damaged / Spoiled";
        public string? Notes { get; set; }
        public List<PurchaseReturnLineRequest> Items { get; set; } = new();
    }

    public class PurchaseReturnLineRequest
    {
        public int PurchaseItemId { get; set; }
        public decimal Quantity { get; set; }
        public string? Reason { get; set; }
    }

    public class CheckRecipeStockRequest
    {
        public int MenuItemId { get; set; }
        public decimal Quantity { get; set; }
        public int? BranchId { get; set; }
        public string? KitchenName { get; set; } = "Main Kitchen";
    }

    #endregion
}
