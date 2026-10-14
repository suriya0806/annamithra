using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/inventory")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager,Accountant,Cashier")]
    public class InventoryController : ControllerBase
    {
        private readonly SamayaDbContext _context;

        private static readonly string[] AllowedTransactionTypes =
        {
            "Opening", "StockIn", "StockOut", "Usage", "Wastage", "Adjustment",
            "PURCHASE", "PURCHASE_RETURN", "MATERIAL_ISSUE", "TRANSFER_IN", "TRANSFER_OUT", "PRODUCTION_CONSUMPTION", "SPOILAGE"
        };

        public InventoryController(SamayaDbContext context)
        {
            _context = context;
        }

        #region Items

        [HttpGet("items")]
        public async Task<IActionResult> GetItems(
            [FromQuery] int? branchId = null,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] string? status = null,
            [FromQuery] bool includeInactive = false)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var query = _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Branch)
                .Where(i => i.OrganizationId == organizationId.Value);

            if (!includeInactive)
                query = query.Where(i => i.IsActive);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var ownBranchId = AuthorizationHelper.GetBranchId(User);
                if (!ownBranchId.HasValue) return Forbid();
                query = query.Where(i => i.BranchId == ownBranchId.Value);
            }
            else if (branchId.HasValue)
            {
                query = query.Where(i => i.BranchId == branchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(i => i.Name.ToLower().Contains(term) ||
                                         (i.ItemCode != null && i.ItemCode.ToLower().Contains(term)) ||
                                         i.Category.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(category) && category != "All")
            {
                query = query.Where(i => i.Category.ToLower() == category.Trim().ToLower());
            }

            var list = await query
                .OrderBy(i => i.Category)
                .ThenBy(i => i.Name)
                .Select(i => new
                {
                    i.Id,
                    i.OrganizationId,
                    i.BranchId,
                    branchName = i.Branch == null ? "" : i.Branch.Name,
                    i.Name,
                    itemCode = i.ItemCode ?? $"ITM-{i.Id}",
                    i.Category,
                    i.CategoryId,
                    i.Unit,
                    i.MinimumStock,
                    i.ReorderLevel,
                    i.MaximumStock,
                    i.CurrentStock,
                    i.Description,
                    i.IsActive,
                    lowStock = i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock),
                    stockStatus = i.CurrentStock <= 0 ? "OUT OF STOCK" : (i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) ? "LOW STOCK" : "IN STOCK"),
                    suggestedReorderQuantity = i.MaximumStock > i.CurrentStock
                        ? i.MaximumStock - i.CurrentStock
                        : (i.ReorderLevel > i.CurrentStock ? i.ReorderLevel - i.CurrentStock : (i.MinimumStock > i.CurrentStock ? i.MinimumStock - i.CurrentStock : 0)),
                    i.CreatedAt,
                    i.UpdatedAt
                })
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                var s = status.Trim().ToLower();
                list = s switch
                {
                    "low_stock" => list.Where(x => x.stockStatus == "LOW STOCK").ToList(),
                    "out_of_stock" => list.Where(x => x.stockStatus == "OUT OF STOCK").ToList(),
                    "in_stock" => list.Where(x => x.stockStatus == "IN STOCK").ToList(),
                    _ => list
                };
            }

            return Ok(list);
        }

        [HttpGet("items/{id:int}")]
        public async Task<IActionResult> GetItemById(int id)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var item = await _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Branch)
                .FirstOrDefaultAsync(i => i.Id == id && i.OrganizationId == organizationId.Value);

            if (item == null) return NotFound(new { message = "Inventory item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            var result = new
            {
                item.Id,
                item.OrganizationId,
                item.BranchId,
                branchName = item.Branch?.Name ?? "",
                item.Name,
                itemCode = item.ItemCode ?? $"ITM-{item.Id}",
                item.Category,
                item.CategoryId,
                item.Unit,
                item.MinimumStock,
                item.ReorderLevel,
                item.MaximumStock,
                item.CurrentStock,
                item.Description,
                item.IsActive,
                stockStatus = item.CurrentStock <= 0 ? "OUT OF STOCK" : (item.CurrentStock <= (item.ReorderLevel > 0 ? item.ReorderLevel : item.MinimumStock) ? "LOW STOCK" : "IN STOCK"),
                suggestedReorderQuantity = item.MaximumStock > item.CurrentStock
                    ? item.MaximumStock - item.CurrentStock
                    : (item.ReorderLevel > item.CurrentStock ? item.ReorderLevel - item.CurrentStock : 0),
                item.CreatedAt,
                item.UpdatedAt
            };

            return Ok(result);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] int? branchId = null)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var query = _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.OrganizationId == organizationId.Value && i.IsActive);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var ownBranchId = AuthorizationHelper.GetBranchId(User);
                if (!ownBranchId.HasValue) return Forbid();
                query = query.Where(i => i.BranchId == ownBranchId.Value);
            }
            else if (branchId.HasValue)
            {
                query = query.Where(i => i.BranchId == branchId.Value);
            }

            var totalItems = await query.CountAsync();
            var lowStock = await query.CountAsync(i => i.CurrentStock > 0 && i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock));
            var outOfStock = await query.CountAsync(i => i.CurrentStock <= 0);
            var stockValueUnits = await query.SumAsync(i => i.CurrentStock);

            return Ok(new { totalItems, lowStock, outOfStock, stockValueUnits });
        }

        [HttpPost("items")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef")]
        public async Task<IActionResult> CreateItem(CreateInventoryItemRequest request)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Unit))
                return BadRequest(new { message = "Item name and unit are required." });

            var branchId = ResolveWriteBranch(request.BranchId);
            if (!branchId.HasValue) return BadRequest(new { message = "A branch is required." });

            var branchExists = await _context.Branches.AnyAsync(b =>
                b.Id == branchId.Value && b.OrganizationId == organizationId.Value && b.IsActive);
            if (!branchExists) return BadRequest(new { message = "Invalid branch." });

            var duplicate = await _context.InventoryItems.AnyAsync(i =>
                i.OrganizationId == organizationId.Value &&
                i.BranchId == branchId.Value &&
                i.Name.ToLower() == request.Name.Trim().ToLower() &&
                i.IsActive);
            if (duplicate) return BadRequest(new { message = "This item already exists in the selected branch." });

            var item = new InventoryItem
            {
                OrganizationId = organizationId.Value,
                BranchId = branchId.Value,
                ItemCode = string.IsNullOrWhiteSpace(request.ItemCode) ? $"ITM-{Random.Shared.Next(1000, 9999)}" : request.ItemCode.Trim(),
                Name = request.Name.Trim(),
                Category = request.Category?.Trim() ?? "General",
                CategoryId = request.CategoryId,
                Unit = request.Unit.Trim().ToUpperInvariant(),
                MinimumStock = request.MinimumStock,
                ReorderLevel = request.ReorderLevel > 0 ? request.ReorderLevel : request.MinimumStock,
                MaximumStock = request.MaximumStock,
                Description = request.Description?.Trim(),
                CurrentStock = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();

            if (request.OpeningStock > 0)
            {
                var currentUserId = GetCurrentUserId();

                if (!currentUserId.HasValue)
                {
                    return Unauthorized(new
                    {
                        message = "User identity could not be determined."
                    });
                }

                await ApplyTransaction(
                    item,
                    "Opening",
                    request.OpeningStock,
                    request.Reference,
                    "Opening stock",
                    currentUserId.Value);
            }

            return Ok(new
            {
                message = "Inventory item created successfully.",
                id = item.Id,
                name = item.Name,
                itemCode = item.ItemCode,
                category = item.Category,
                categoryId = item.CategoryId,
                unit = item.Unit,
                minimumStock = item.MinimumStock,
                maximumStock = item.MaximumStock,
                reorderLevel = item.ReorderLevel,
                currentStock = item.CurrentStock,
                branchId = item.BranchId,
                isActive = item.IsActive
            });
        }

        [HttpPut("items/{id:int}")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> UpdateItem(int id, UpdateInventoryItemRequest request)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var item = await _context.InventoryItems.FirstOrDefaultAsync(i =>
                i.Id == id && i.OrganizationId == organizationId.Value);
            if (item == null) return NotFound(new { message = "Inventory item not found." });

            if (AuthorizationHelper.IsBranchUser(User) &&
                !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            item.Name = request.Name.Trim();
            if (!string.IsNullOrWhiteSpace(request.ItemCode)) item.ItemCode = request.ItemCode.Trim();
            item.Category = request.Category?.Trim() ?? "General";
            item.CategoryId = request.CategoryId;
            item.Unit = request.Unit.Trim().ToUpperInvariant();
            item.MinimumStock = request.MinimumStock;
            item.ReorderLevel = request.ReorderLevel > 0 ? request.ReorderLevel : request.MinimumStock;
            item.MaximumStock = request.MaximumStock;
            item.Description = request.Description?.Trim();
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Inventory item updated successfully.", item });
        }

        [HttpDelete("items/{id:int}")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> DeactivateItem(int id)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var item = await _context.InventoryItems.FirstOrDefaultAsync(i =>
                i.Id == id && i.OrganizationId == organizationId.Value);
            if (item == null) return NotFound(new { message = "Inventory item not found." });

            if (AuthorizationHelper.IsBranchUser(User) &&
                !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            // Toggle active status in MySQL - preserving all historical transactions and audit trail
            item.IsActive = !item.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = item.IsActive ? "Item activated successfully." : "Item deactivated successfully.",
                isActive = item.IsActive
            });
        }

        #endregion

        #region Categories

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var categories = await _context.ItemCategories
                .AsNoTracking()
                .Where(c => c.OrganizationId == orgId.Value && c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.Status,
                    c.IsActive,
                    c.CreatedAt,
                    c.UpdatedAt
                })
                .ToListAsync();

            return Ok(categories);
        }

        [HttpPost("categories")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> CreateCategory(CreateCategoryRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Category name is required." });

            var exists = await _context.ItemCategories.AnyAsync(c =>
                c.OrganizationId == orgId.Value &&
                c.Name.ToLower() == request.Name.Trim().ToLower());

            if (exists)
                return BadRequest(new { message = "Category already exists." });

            var category = new ItemCategory
            {
                OrganizationId = orgId.Value,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Status = "Active",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.ItemCategories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Category created successfully.", category });
        }

        [HttpPut("categories/{id:int}")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> UpdateCategory(int id, UpdateCategoryRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var category = await _context.ItemCategories.FirstOrDefaultAsync(c => c.Id == id && c.OrganizationId == orgId.Value);
            if (category == null) return NotFound(new { message = "Category not found." });

            category.Name = request.Name.Trim();
            category.Description = request.Description?.Trim();
            if (!string.IsNullOrWhiteSpace(request.Status)) category.Status = request.Status.Trim();
            category.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Category updated successfully.", category });
        }

        [HttpDelete("categories/{id:int}")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
        public async Task<IActionResult> DeactivateCategory(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var category = await _context.ItemCategories.FirstOrDefaultAsync(c => c.Id == id && c.OrganizationId == orgId.Value);
            if (category == null) return NotFound(new { message = "Category not found." });

            category.IsActive = !category.IsActive;
            category.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = category.IsActive ? "Category activated." : "Category deactivated.", isActive = category.IsActive });
        }

        #endregion

        #region Transactions

        [HttpPost("transactions")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef,Staff")]
        public async Task<IActionResult> CreateTransaction(CreateStockTransactionRequest request)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (organizationId == null || userId == null) return Unauthorized();

            if (!AllowedTransactionTypes.Contains(request.Type, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = "Invalid transaction type." });

            if (request.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be greater than zero." });

            var item = await _context.InventoryItems.FirstOrDefaultAsync(i =>
                i.Id == request.InventoryItemId &&
                i.OrganizationId == organizationId.Value &&
                i.IsActive);
            if (item == null) return NotFound(new { message = "Inventory item not found." });

            if (AuthorizationHelper.IsBranchUser(User) &&
                !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            var type = NormalizeType(request.Type);
            if (type is "StockOut" or "Usage" or "Wastage" or "MATERIAL_ISSUE" or "PRODUCTION_CONSUMPTION" or "PURCHASE_RETURN" or "SPOILAGE" && item.CurrentStock < request.Quantity)
                return BadRequest(new { message = $"Insufficient stock. Current stock is {item.CurrentStock} {item.Unit}." });

            await ApplyTransaction(item, type, request.Quantity, request.Reference, request.Notes, userId.Value, request.SourceLocation, request.DestinationLocation);

            return Ok(new { message = "Stock transaction recorded successfully.", currentStock = item.CurrentStock });
        }

        [HttpPost("spoilage")]
        [Authorize(Roles = "Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Chef,Staff")]
        public async Task<IActionResult> RecordSpoilage([FromBody] RecordSpoilageRequest request)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetCurrentUserId();
            if (organizationId == null || userId == null) return Unauthorized();

            if (request.Quantity <= 0)
                return BadRequest(new { message = "Spoil quantity must be greater than zero." });

            var item = await _context.InventoryItems.FirstOrDefaultAsync(i =>
                i.Id == request.InventoryItemId &&
                i.OrganizationId == organizationId.Value &&
                i.IsActive);
            if (item == null) return NotFound(new { message = "Inventory item not found." });

            if (AuthorizationHelper.IsBranchUser(User) &&
                !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            if (item.CurrentStock < request.Quantity)
                return BadRequest(new { message = $"Insufficient stock to record spoilage. Available stock is {item.CurrentStock} {item.Unit}." });

            var reason = string.IsNullOrWhiteSpace(request.Reason) ? "Spoiled Food" : request.Reason.Trim();
            var notes = $"[Spoiled Food - {reason}] {request.Notes}".Trim();
            var disposedLoc = string.IsNullOrWhiteSpace(request.DisposedLocation) ? "Kitchen Waste / Scrap" : request.DisposedLocation.Trim();

            await ApplyTransaction(
                item,
                "SPOILAGE",
                request.Quantity,
                request.Reference ?? $"SPOIL-{DateTime.UtcNow:yyyyMMdd}",
                notes,
                userId.Value,
                "Kitchen Store",
                disposedLoc);

            return Ok(new
            {
                message = $"Successfully recorded {request.Quantity} {item.Unit} of spoiled {item.Name}. Current inventory reduced to {item.CurrentStock} {item.Unit}.",
                currentStock = item.CurrentStock
            });
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] int? branchId = null,
            [FromQuery] int? itemId = null,
            [FromQuery] string? type = null)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var query = _context.StockTransactions
                .AsNoTracking()
                .Include(t => t.InventoryItem)
                .Include(t => t.Branch)
                .Include(t => t.CreatedByUser)
                .Where(t => t.OrganizationId == organizationId.Value);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var ownBranchId = AuthorizationHelper.GetBranchId(User);
                if (!ownBranchId.HasValue) return Forbid();
                query = query.Where(t => t.BranchId == ownBranchId.Value);
            }
            else if (branchId.HasValue)
            {
                query = query.Where(t => t.BranchId == branchId.Value);
            }

            if (itemId.HasValue)
                query = query.Where(t => t.InventoryItemId == itemId.Value);

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(t => t.Type.ToLower() == type.Trim().ToLower());

            var result = await query
                .OrderByDescending(t => t.CreatedAt)
                .Take(200)
                .Select(t => new
                {
                    t.Id,
                    t.BranchId,
                    branchName = t.Branch == null ? "" : t.Branch.Name,
                    t.InventoryItemId,
                    itemName = t.InventoryItem == null ? "" : t.InventoryItem.Name,
                    unit = t.InventoryItem == null ? "" : t.InventoryItem.Unit,
                    t.Type,
                    t.Quantity,
                    t.StockBefore,
                    t.StockAfter,
                    t.Reference,
                    t.Notes,
                    sourceLocation = t.SourceLocation,
                    destinationLocation = t.DestinationLocation,
                    createdBy = t.CreatedByUser == null ? "" : t.CreatedByUser.Name,
                    t.CreatedAt
                })
                .ToListAsync();

            return Ok(result);
        }

        [HttpGet("ledger")]
        public async Task<IActionResult> GetStockLedger(
            [FromQuery] string? branchId = null,
            [FromQuery] string? itemId = null,
            [FromQuery] string? fromDate = null,
            [FromQuery] string? toDate = null)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId.Trim(), out var bId))
            {
                parsedBranchId = bId;
            }

            int? parsedItemId = null;
            if (!string.IsNullOrWhiteSpace(itemId) && int.TryParse(itemId.Trim(), out var iId))
            {
                parsedItemId = iId;
            }

            DateTime? parsedFromDate = null;
            if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate.Trim(), out var fDate))
            {
                parsedFromDate = fDate;
            }

            DateTime? parsedToDate = null;
            if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate.Trim(), out var tDate))
            {
                parsedToDate = tDate;
            }

            var targetBranchId = AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : parsedBranchId;

            var query = _context.StockTransactions
                .AsNoTracking()
                .Include(t => t.InventoryItem)
                .Include(t => t.Branch)
                .Include(t => t.CreatedByUser)
                .Where(t => t.OrganizationId == organizationId.Value);

            if (targetBranchId.HasValue)
                query = query.Where(t => t.BranchId == targetBranchId.Value);

            if (parsedItemId.HasValue && parsedItemId.Value > 0)
                query = query.Where(t => t.InventoryItemId == parsedItemId.Value);

            if (parsedFromDate.HasValue)
                query = query.Where(t => t.CreatedAt >= parsedFromDate.Value.Date);

            if (parsedToDate.HasValue)
                query = query.Where(t => t.CreatedAt < parsedToDate.Value.Date.AddDays(1));

            var transactions = await query
                .OrderBy(t => t.CreatedAt)
                .ThenBy(t => t.Id)
                .ToListAsync();

            var ledger = transactions.Select(t =>
            {
                var isAddition = t.StockAfter > t.StockBefore;
                var inQty = isAddition ? t.Quantity : (decimal?)null;
                var outQty = !isAddition && t.Quantity > 0 ? t.Quantity : (decimal?)null;

                var displayType = t.Type switch
                {
                    "MATERIAL_ISSUE" or "KITCHEN_ISSUE" => "Material Issue",
                    "MATERIAL_RETURN" or "KITCHEN_RETURN" => "Material Return",
                    "PRODUCTION_CONSUMPTION" => "Production Consumption",
                    "PURCHASE" or "Purchase" => "Purchase / GRN",
                    "OPENING" or "Opening" => "Opening Stock",
                    "WASTAGE" or "Wastage" or "SPOILAGE" or "Spoilage" => "Wastage",
                    "ADJUSTMENT" or "Adjustment" => "Adjustment",
                    "TRANSFER_IN" => "Transfer In",
                    "TRANSFER_OUT" => "Transfer Out",
                    _ => t.Type
                };

                return new
                {
                    t.Id,
                    date = t.CreatedAt,
                    itemId = t.InventoryItemId,
                    itemName = t.InventoryItem != null ? t.InventoryItem.Name : "Item",
                    unit = t.InventoryItem != null ? t.InventoryItem.Unit : "KG",
                    category = t.InventoryItem != null ? t.InventoryItem.Category : "",
                    transactionType = displayType,
                    rawType = t.Type,
                    reference = string.IsNullOrWhiteSpace(t.Reference) ? "-" : t.Reference,
                    inQuantity = inQty,
                    outQuantity = outQty,
                    balance = t.StockAfter,
                    stockBefore = t.StockBefore,
                    stockAfter = t.StockAfter,
                    sourceLocation = t.SourceLocation ?? "Store",
                    destinationLocation = t.DestinationLocation ?? "-",
                    notes = t.Notes,
                    createdBy = t.CreatedByUser != null ? t.CreatedByUser.Name : "Staff",
                    branchName = t.Branch != null ? t.Branch.Name : ""
                };
            }).ToList();

            var totalIn = ledger.Where(x => x.inQuantity.HasValue).Sum(x => x.inQuantity!.Value);
            var totalOut = ledger.Where(x => x.outQuantity.HasValue).Sum(x => x.outQuantity!.Value);
            var latestBalance = ledger.Count > 0 ? ledger.Last().balance : 0;
            var openingStock = ledger.Count > 0 ? ledger.First().stockBefore : 0;

            return Ok(new
            {
                totalTransactions = ledger.Count,
                openingStock,
                totalIn,
                totalOut,
                currentStock = latestBalance,
                ledger
            });
        }

        [HttpGet("items/{id:int}/ledger")]
        public async Task<IActionResult> GetItemStockLedger(
            int id,
            [FromQuery] string? branchId = null,
            [FromQuery] string? fromDate = null,
            [FromQuery] string? toDate = null)
        {
            return await GetStockLedger(branchId, id.ToString(), fromDate, toDate);
        }

        #endregion

        #region Helpers

        private int? ResolveWriteBranch(int? requestedBranchId)
        {
            if (AuthorizationHelper.IsBranchUser(User))
                return AuthorizationHelper.GetBranchId(User);
            return requestedBranchId;
        }

        private int? GetCurrentUserId()
        {
            var value = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("sub")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        private async Task ApplyTransaction(
            InventoryItem item,
            string type,
            decimal quantity,
            string? reference,
            string? notes,
            int userId,
            string? sourceLocation = null,
            string? destinationLocation = null)
        {
            var before = item.CurrentStock;
            var after = type switch
            {
                "Opening" or "StockIn" or "AdjustmentIn" or "PURCHASE" or "TRANSFER_IN" or "KITCHEN_RETURN" => before + quantity,
                "StockOut" or "Usage" or "Wastage" or "MATERIAL_ISSUE" or "PRODUCTION_CONSUMPTION" or "TRANSFER_OUT" or "PURCHASE_RETURN" or "SPOILAGE" or "KITCHEN_ISSUE" => before - quantity,
                "Adjustment" => quantity,
                _ => before
            };

            if (after < 0)
                throw new InvalidOperationException("Stock cannot become negative.");

            item.CurrentStock = after;
            item.UpdatedAt = DateTime.UtcNow;

            _context.StockTransactions.Add(new StockTransaction
            {
                OrganizationId = item.OrganizationId,
                BranchId = item.BranchId,
                InventoryItemId = item.Id,
                Type = type,
                Quantity = quantity,
                StockBefore = before,
                StockAfter = after,
                Reference = reference,
                Notes = notes,
                SourceLocation = sourceLocation,
                DestinationLocation = destinationLocation,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        private static string NormalizeType(string value)
        {
            return value.Trim().ToLowerInvariant() switch
            {
                "stockin" or "stock in" => "StockIn",
                "stockout" or "stock out" => "StockOut",
                "usage" => "Usage",
                "wastage" => "Wastage",
                "opening" => "Opening",
                "adjustment" => "Adjustment",
                "purchase" => "PURCHASE",
                "purchase_return" or "purchasereturn" or "purchase return" => "PURCHASE_RETURN",
                "material_issue" or "materialissue" or "material issue" => "MATERIAL_ISSUE",
                "transfer_in" or "transfer in" => "TRANSFER_IN",
                "transfer_out" or "transfer out" => "TRANSFER_OUT",
                "production_consumption" or "production" => "PRODUCTION_CONSUMPTION",
                "spoilage" or "spoil" or "spoil food" or "spoil_food" or "spoiled" or "spoiled food" => "SPOILAGE",
                _ => value.Trim()
            };
        }

        #endregion
    }

    #region Requests

    public class CreateInventoryItemRequest
    {
        public int? BranchId { get; set; }
        public string? ItemCode { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public int? CategoryId { get; set; }
        public string Unit { get; set; } = "KG";
        public decimal MinimumStock { get; set; }
        public decimal ReorderLevel { get; set; }
        public decimal MaximumStock { get; set; }
        public decimal OpeningStock { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateInventoryItemRequest
    {
        public string? ItemCode { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public int? CategoryId { get; set; }
        public string Unit { get; set; } = "KG";
        public decimal MinimumStock { get; set; }
        public decimal ReorderLevel { get; set; }
        public decimal MaximumStock { get; set; }
        public string? Description { get; set; }
    }

    public class CreateStockTransactionRequest
    {
        public int InventoryItemId { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public string? SourceLocation { get; set; }
        public string? DestinationLocation { get; set; }
    }

    public class CreateCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Status { get; set; }
    }

    public class RecordSpoilageRequest
    {
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public string? Reason { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public string? DisposedLocation { get; set; }
    }

    #endregion
}
