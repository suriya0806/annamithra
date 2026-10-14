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
    [Route("api/kot")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
    public class KOTController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        private readonly RecipeStockService _recipeStockService;

        public KOTController(SamayaDbContext context, RecipeStockService recipeStockService)
        {
            _context = context;
            _recipeStockService = recipeStockService;
        }

        [HttpGet]
        public async Task<IActionResult> GetKOTs([FromQuery] int? branchId = null, [FromQuery] string? status = null, [FromQuery] int? orderId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var query = _context.KOTs
                .AsNoTracking()
                .Include(k => k.Waiter)
                .Include(k => k.Order)
                .Include(k => k.Branch)
                .Include(k => k.Items)
                .Where(k => k.OrganizationId == orgId.Value);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var userBranchId = AuthorizationHelper.GetBranchId(User);
                if (!userBranchId.HasValue) return Forbid();
                query = query.Where(k => k.BranchId == userBranchId.Value);
            }
            else if (branchId.HasValue)
            {
                query = query.Where(k => k.BranchId == branchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(k => k.Status == status);
            }

            if (orderId.HasValue)
            {
                query = query.Where(k => k.OrderId == orderId.Value);
            }

            var rawKots = await query
                .OrderByDescending(k => k.CreatedAt)
                .Take(200)
                .ToListAsync();

            var kots = new List<object>();
            foreach (var k in rawKots)
            {
                bool hasInsufficientStock = false;
                bool stockResolved = false;
                List<RecipeStockShortageDetail> shortages = new();
                List<RecipeStockRequirementItem> requirements = new();
                bool isApplied = k.Order?.InventoryApplied ?? false;
                bool isBranchPosOnly = k.Branch?.ModuleType == "POS Only";

                // Evaluate ingredient availability for active KOTs where inventory has not yet been applied (only for non-POS-Only branches)
                if (!isBranchPosOnly && !isApplied && k.Status != "Cancelled" && k.Status != "Served")
                {
                    var foodItems = k.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
                    if (foodItems.Count > 0)
                    {
                        var stockVal = await _recipeStockService.ValidateRecipeStockAsync(
                            k.OrganizationId,
                            k.BranchId,
                            "Main Kitchen",
                            foodItems,
                            requireRecipe: false);

                        if (!stockVal.IsSufficient)
                        {
                            hasInsufficientStock = true;
                            shortages = stockVal.Shortages;
                            requirements = stockVal.Requirements;
                        }
                        else
                        {
                            // Ingredients were not yet deducted, but are currently sufficient in stock
                            stockResolved = true;
                            requirements = stockVal.Requirements;
                        }
                    }
                }

                kots.Add(new
                {
                    k.Id,
                    k.KOTNumber,
                    k.OrderId,
                    orderNumber = k.Order != null ? k.Order.OrderNumber : "—",
                    k.TableNumber,
                    k.CustomerName,
                    waiterId = k.WaiterId,
                    waiterName = k.Waiter != null ? k.Waiter.Name : "Waiter",
                    k.BranchId,
                    branchName = k.Branch != null ? k.Branch.Name : "Main Branch",
                    branchModuleType = k.Branch != null ? k.Branch.ModuleType : "Both POS + KMS",
                    kitchenLocation = "Main Kitchen",
                    k.Status,
                    k.SaleType,
                    isCounterPickup = k.SaleType == "SELF_SERVICE",
                    orderStatus = k.Order != null ? k.Order.Status : "—",
                    k.CreatedAt,
                    k.ReadyAt,
                    k.ServedAt,
                    inventoryApplied = isApplied,
                    hasInsufficientStock,
                    stockResolved,
                    shortages,
                    requirements,
                    items = k.Items.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal
                    })
                });
            }

            return Ok(kots);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var kot = await _context.KOTs
                .AsNoTracking()
                .Include(k => k.Waiter)
                .Include(k => k.Order)
                .Include(k => k.Branch)
                .Include(k => k.Items)
                .FirstOrDefaultAsync(k => k.Id == id && k.OrganizationId == orgId.Value);

            if (kot == null) return NotFound(new { message = "KOT not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, kot.BranchId))
                return Forbid();

            bool isBranchPosOnly = kot.Branch?.ModuleType == "POS Only";
            bool isApplied = kot.Order?.InventoryApplied ?? false;
            bool hasInsufficientStock = false;
            bool stockResolved = false;
            List<RecipeStockShortageDetail> shortages = new();
            List<RecipeStockRequirementItem> requirements = new();

            if (!isBranchPosOnly && !isApplied && kot.Status != "Cancelled" && kot.Status != "Served")
            {
                var foodItems = kot.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
                if (foodItems.Count > 0)
                {
                    var stockVal = await _recipeStockService.ValidateRecipeStockAsync(
                        kot.OrganizationId,
                        kot.BranchId,
                        "Main Kitchen",
                        foodItems,
                        requireRecipe: false);

                    if (!stockVal.IsSufficient)
                    {
                        hasInsufficientStock = true;
                        shortages = stockVal.Shortages;
                        requirements = stockVal.Requirements;
                    }
                    else
                    {
                        stockResolved = true;
                        requirements = stockVal.Requirements;
                    }
                }
            }

            return Ok(new
            {
                kot.Id,
                kot.KOTNumber,
                kot.OrderId,
                orderNumber = kot.Order?.OrderNumber ?? "—",
                kot.TableNumber,
                kot.CustomerName,
                waiterId = kot.WaiterId,
                waiterName = kot.Waiter?.Name ?? "Waiter",
                kot.BranchId,
                branchName = kot.Branch?.Name ?? "Main Branch",
                branchModuleType = kot.Branch?.ModuleType ?? "Both POS + KMS",
                kitchenLocation = "Main Kitchen",
                kot.Status,
                kot.SaleType,
                kot.CreatedAt,
                kot.ReadyAt,
                kot.ServedAt,
                inventoryApplied = isApplied,
                hasInsufficientStock,
                stockResolved,
                shortages,
                requirements,
                items = kot.Items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    i.MenuItemName,
                    i.Quantity,
                    i.UnitPrice,
                    i.LineTotal
                })
            });
        }

        [HttpGet("{id:int}/stock-status")]
        public async Task<IActionResult> GetStockStatus(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var kot = await _context.KOTs
                .AsNoTracking()
                .Include(k => k.Order)
                .Include(k => k.Branch)
                .Include(k => k.Items)
                .FirstOrDefaultAsync(k => k.Id == id && k.OrganizationId == orgId.Value);

            if (kot == null) return NotFound(new { message = "KOT not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, kot.BranchId))
                return Forbid();

            bool isBranchPosOnly = kot.Branch?.ModuleType == "POS Only";
            if (isBranchPosOnly)
            {
                return Ok(new
                {
                    kotId = kot.Id,
                    kotNumber = kot.KOTNumber,
                    orderId = kot.OrderId,
                    orderNumber = kot.Order?.OrderNumber ?? "—",
                    tableNumber = kot.TableNumber ?? "Counter",
                    customerName = kot.CustomerName ?? "Customer",
                    branchId = kot.BranchId,
                    branchName = kot.Branch?.Name ?? "Main Branch",
                    branchModuleType = kot.Branch?.ModuleType ?? "POS Only",
                    kitchenLocation = "Main Kitchen",
                    status = kot.Status,
                    saleType = kot.SaleType,
                    inventoryApplied = false,
                    hasInsufficientStock = false,
                    isSufficient = true,
                    stockResolved = false,
                    items = kot.Items.Select(i => new
                    {
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity
                    }),
                    shortages = new List<object>(),
                    requirements = new List<object>()
                });
            }

            var foodItems = kot.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
            var stockVal = await _recipeStockService.ValidateRecipeStockAsync(
                kot.OrganizationId,
                kot.BranchId,
                "Main Kitchen",
                foodItems,
                requireRecipe: false);

            var isApplied = kot.Order?.InventoryApplied ?? false;
            var hasInsufficient = !isApplied && !stockVal.IsSufficient;

            return Ok(new
            {
                kotId = kot.Id,
                kotNumber = kot.KOTNumber,
                orderId = kot.OrderId,
                orderNumber = kot.Order?.OrderNumber ?? "—",
                tableNumber = kot.TableNumber ?? "Counter",
                customerName = kot.CustomerName ?? "Customer",
                branchId = kot.BranchId,
                branchName = kot.Branch?.Name ?? "Main Branch",
                branchModuleType = kot.Branch?.ModuleType ?? "Both POS + KMS",
                kitchenLocation = "Main Kitchen",
                status = kot.Status,
                saleType = kot.SaleType,
                inventoryApplied = isApplied,
                hasInsufficientStock = hasInsufficient,
                isSufficient = isApplied || stockVal.IsSufficient,
                stockResolved = !isApplied && stockVal.IsSufficient,
                items = kot.Items.Select(i => new
                {
                    i.MenuItemId,
                    i.MenuItemName,
                    i.Quantity
                }),
                shortages = isApplied ? new List<RecipeStockShortageDetail>() : stockVal.Shortages,
                requirements = stockVal.Requirements
            });
        }

        [HttpGet("order/{orderId:int}")]
        public async Task<IActionResult> GetByOrderId(int orderId)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var kots = await _context.KOTs
                .AsNoTracking()
                .Include(k => k.Waiter)
                .Include(k => k.Branch)
                .Include(k => k.Order)
                .Include(k => k.Items)
                .Where(k => k.OrderId == orderId && k.OrganizationId == orgId.Value)
                .OrderBy(k => k.CreatedAt)
                .Select(k => new
                {
                    k.Id,
                    k.KOTNumber,
                    k.OrderId,
                    k.TableNumber,
                    k.CustomerName,
                    waiterId = k.WaiterId,
                    waiterName = k.Waiter != null ? k.Waiter.Name : "Waiter",
                    k.BranchId,
                    branchName = k.Branch != null ? k.Branch.Name : "Main Branch",
                    k.Status,
                    k.SaleType,
                    k.CreatedAt,
                    k.ReadyAt,
                    k.ServedAt,
                    inventoryApplied = k.Order != null && k.Order.InventoryApplied,
                    items = k.Items.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal
                    })
                })
                .ToListAsync();

            return Ok(kots);
        }

        [HttpPost("{id:int}/status")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateKOTStatusRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var kot = await _context.KOTs
                .Include(k => k.Items)
                .Include(k => k.Order)
                .FirstOrDefaultAsync(k => k.Id == id && k.OrganizationId == orgId.Value);

            if (kot == null) return NotFound(new { message = "KOT not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, kot.BranchId))
                return Forbid();

            var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == kot.BranchId);
            bool isPosOnly = branch?.ModuleType == "POS Only";

            var next = request.Status?.Trim();
            if (string.Equals(next, "Picked Up", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(next, "PickedUp", StringComparison.OrdinalIgnoreCase))
            {
                next = "Served";
            }

            if (next is not ("Preparing" or "Ready" or "Served" or "Cancelled"))
                return BadRequest(new { message = "Invalid status. Allowed values: Preparing, Ready, Served, Cancelled." });

            // Idempotency: Prevent duplicate pickup confirmations
            if (next == "Served" && kot.Status == "Served")
            {
                return Ok(new
                {
                    message = $"KOT {kot.KOTNumber} is already confirmed as picked up / served.",
                    kotId = kot.Id,
                    kotNumber = kot.KOTNumber,
                    status = kot.Status,
                    alreadyConfirmed = true
                });
            }

            // Acceptance Test 8: Verify Picked Up action does not occur before Ready for counter pickup orders
            if (next == "Served" && kot.SaleType == "SELF_SERVICE" && kot.Status != "Ready")
            {
                return BadRequest(new
                {
                    message = $"Cannot confirm pickup: Counter order {kot.KOTNumber} must be marked 'Ready' before customer pickup.",
                    currentStatus = kot.Status
                });
            }

            // Requirement 6, 7 & Acceptance Test 11:
            // Do not mark an order as prepared or completed while required ingredients remain unresolved (only for non-POS-Only branches).
            if (!isPosOnly && (next == "Preparing" || next == "Ready") && kot.Order != null && !kot.Order.InventoryApplied)
            {
                var foodItems = kot.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
                var stockVal = await _recipeStockService.ValidateRecipeStockAsync(
                    orgId.Value,
                    kot.BranchId,
                    "Main Kitchen",
                    foodItems,
                    requireRecipe: false);

                if (!stockVal.IsSufficient)
                {
                    return BadRequest(new
                    {
                        message = "Cannot proceed: required recipe ingredients have insufficient stock. Please resolve inventory before preparation.",
                        insufficientStock = true,
                        shortages = stockVal.Shortages
                    });
                }

                // If stock is now sufficient, safely deduct from kitchen stock atomically without double deduction
                var deductionResult = await _recipeStockService.DeductRecipeStockAsync(
                    orgId.Value,
                    kot.BranchId,
                    "Main Kitchen",
                    foodItems,
                    userId.Value,
                    kot.Order.OrderNumber,
                    "KOT_PREPARATION",
                    kot.Id.ToString(),
                    requireRecipe: false);

                if (!deductionResult.Success)
                {
                    return BadRequest(new
                    {
                        message = deductionResult.Message,
                        insufficientStock = true,
                        shortages = deductionResult.Shortages
                    });
                }

                kot.Order.InventoryApplied = true;
            }

            if (next == "Ready" && kot.Status != "Ready" && kot.Status != "Served")
            {
                kot.ReadyAt = DateTime.UtcNow;
            }

            kot.Status = next;
            if (next == "Served") kot.ServedAt = DateTime.UtcNow;

            // Keep order status synced
            if (kot.Order != null)
            {
                if (next == "Ready" && kot.Order.Status != "Closed" && kot.Order.Status != "Cancelled" && kot.Order.Status != "Ready")
                {
                    kot.Order.ReadyAt = DateTime.UtcNow;
                    if (kot.Order.Status == "Open" || kot.Order.Status == "Preparing")
                    {
                        kot.Order.Status = "Ready";
                    }
                }
                else if (next == "Served")
                {
                    kot.Order.ServedAt = DateTime.UtcNow;
                    if (kot.Order.ReadyAt == null) kot.Order.ReadyAt = DateTime.UtcNow;
                    // For counter pickup orders (SELF_SERVICE) or table orders served
                    if (kot.Order.Status != "Closed" && kot.Order.Status != "Cancelled")
                    {
                        kot.Order.Status = "Served";
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = next == "Served" && kot.SaleType == "SELF_SERVICE"
                    ? $"Counter Order {kot.Order?.OrderNumber ?? kot.KOTNumber} marked as Picked Up / Completed."
                    : $"KOT {kot.KOTNumber} marked {next}.",
                kotId = kot.Id,
                kotNumber = kot.KOTNumber,
                status = kot.Status,
                isCounterPickup = kot.SaleType == "SELF_SERVICE",
                orderStatus = kot.Order?.Status ?? "—"
            });
        }

        [HttpPost("{id:int}/pickup")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> PickupKOT(int id)
        {
            return await UpdateStatus(id, new UpdateKOTStatusRequest { Status = "Served" });
        }

        private int? GetUserId() => int.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value, out var id) ? id : null;
    }

    public class UpdateKOTStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
