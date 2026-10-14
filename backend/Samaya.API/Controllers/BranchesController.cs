using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager")]
    public class BranchesController : ControllerBase
    {
        private readonly SamayaDbContext _context;

        public BranchesController(SamayaDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Authorize(Roles = "Organization Admin")]
        public async Task<IActionResult> CreateBranch(CreateBranchRequest request)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);

            if (organizationId == null)
                return Unauthorized(new { message = "Organization information not found in token." });

            if (string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Code))
                return BadRequest(new { message = "Branch name and code are required." });

            var exists = await _context.Branches.AnyAsync(b =>
                b.OrganizationId == organizationId &&
                b.Code == request.Code);

            if (exists)
                return BadRequest(new { message = "Branch code already exists in this organization." });

            var validModules = new[] { "KMS Only", "POS Only", "Both POS + KMS" };
            var moduleType = string.IsNullOrWhiteSpace(request.ModuleType) ? "Both POS + KMS" : request.ModuleType.Trim();
            if (!validModules.Contains(moduleType))
                return BadRequest(new { message = "Module Type must be one of: KMS Only, POS Only, Both POS + KMS." });

            var branch = new Branch
            {
                OrganizationId = organizationId.Value,
                Name = request.Name,
                Code = request.Code,
                Address = request.Address,
                City = request.City,
                Phone = request.Phone,
                ModuleType = moduleType
            };

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Branch created successfully.",
                branch
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetBranches([FromQuery] bool forTransfer = false)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);

            if (organizationId == null)
                return Unauthorized();

            if (!forTransfer && User.IsInRole("Kitchen Manager"))
                return Forbid();

            var query = _context.Branches
                .Where(b => b.OrganizationId == organizationId.Value);

            // In inventory transfer, branch managers need to select destination branches within the organization.
            // Only when forTransfer=true, return all active branches in the organization.
            // Everywhere else in the application, branch users remain strictly scoped to their own branch.
            if (!forTransfer && AuthorizationHelper.IsBranchUser(User))
            {
                var branchId = AuthorizationHelper.GetBranchId(User);
                query = query.Where(b => b.Id == branchId);
            }

            if (forTransfer)
            {
                query = query.Where(b => b.IsActive);
            }

            var branches = await query.OrderBy(b => b.Name).Select(b => new
            {
                b.Id,
                b.OrganizationId,
                b.Name,
                b.Code,
                b.Address,
                b.City,
                b.Phone,
                b.ModuleType,
                b.IsActive,
                b.CreatedAt,
                ManagerName = b.Users
                    .Where(u => u.RoleId == 3 || (u.Role != null && u.Role.Name == "Branch Manager"))
                    .Select(u => u.Name)
                    .FirstOrDefault() ?? "",
                ManagerPhone = b.Phone,
                ManagerEmail = b.Users
                    .Where(u => u.RoleId == 3 || (u.Role != null && u.Role.Name == "Branch Manager"))
                    .Select(u => u.Email)
                    .FirstOrDefault() ?? "",
                UserCount = b.Users.Count
            }).ToListAsync();

            return Ok(branches);
        }

        [HttpGet("org-summary")]
        [Authorize(Roles = "Organization Admin,Super Admin")]
        public async Task<IActionResult> GetOrgSummary()
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var branches = await _context.Branches.AsNoTracking()
                .Include(b => b.Users)
                    .ThenInclude(u => u.Role)
                .Where(b => b.OrganizationId == organizationId.Value)
                .OrderBy(b => b.Name)
                .ToListAsync();

            var totalUsers = await _context.Users.AsNoTracking()
                .Where(u => u.OrganizationId == organizationId.Value)
                .CountAsync();

            var billsToday = await _context.Bills.AsNoTracking()
                .Where(b => b.OrganizationId == organizationId.Value && b.GeneratedAt >= today && b.GeneratedAt < tomorrow && b.PaymentStatus == "Paid")
                .ToListAsync();

            var ordersToday = await _context.Orders.AsNoTracking()
                .Where(o => o.OrganizationId == organizationId.Value && o.CreatedAt >= today && o.CreatedAt < tomorrow)
                .ToListAsync();

            var pendingOrders = await _context.Orders.AsNoTracking()
                .Where(o => o.OrganizationId == organizationId.Value && (o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Ready" || o.Status == "Open"))
                .CountAsync();

            var todaySales = billsToday.Sum(b => b.GrandTotal);
            if (todaySales == 0)
            {
                todaySales = ordersToday.Where(o => o.Status == "Closed" || o.Status == "Paid" || o.Status == "Served").Sum(o => o.TotalAmount);
            }

            var lowStockCount = await _context.InventoryItems.AsNoTracking()
                .Where(i => i.OrganizationId == organizationId.Value && i.IsActive && i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) && i.CurrentStock > 0)
                .CountAsync();

            var outOfStockCount = await _context.InventoryItems.AsNoTracking()
                .Where(i => i.OrganizationId == organizationId.Value && i.IsActive && i.CurrentStock <= 0)
                .CountAsync();

            var recentActivity = await _context.Orders.AsNoTracking()
                .Include(o => o.Branch)
                .Where(o => o.OrganizationId == organizationId.Value)
                .OrderByDescending(o => o.CreatedAt)
                .Take(10)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    BranchName = o.Branch != null ? o.Branch.Name : "Main Branch",
                    o.CreatedAt,
                    o.TotalAmount,
                    o.Status,
                    o.SaleType
                })
                .ToListAsync();

            var branchSummaries = branches.Select(b =>
            {
                var manager = b.Users.FirstOrDefault(u => u.RoleId == 3 || (u.Role != null && u.Role.Name == "Branch Manager"));
                var bOrders = ordersToday.Where(o => o.BranchId == b.Id).ToList();
                var bBills = billsToday.Where(bi => bi.BranchId == b.Id).ToList();
                var bSales = bBills.Sum(bi => bi.GrandTotal);
                if (bSales == 0)
                {
                    bSales = bOrders.Where(o => o.Status == "Closed" || o.Status == "Paid" || o.Status == "Served").Sum(o => o.TotalAmount);
                }

                return new
                {
                    b.Id,
                    b.Name,
                    b.Code,
                    b.City,
                    b.Address,
                    b.Phone,
                    b.IsActive,
                    ManagerName = manager?.Name ?? "",
                    UserCount = b.Users.Count,
                    TodaySales = bSales,
                    TodayOrders = bOrders.Count
                };
            }).ToList();

            return Ok(new
            {
                totalBranches = branches.Count,
                activeBranches = branches.Count(b => b.IsActive),
                totalUsers,
                todaySales,
                todayOrders = ordersToday.Count,
                pendingOrders,
                lowStockAlerts = lowStockCount,
                outOfStockAlerts = outOfStockCount,
                recentActivity,
                branches = branchSummaries
            });
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager")]
        public async Task<IActionResult> GetBranch(int id)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);

            if (organizationId == null)
                return Unauthorized();

            if (AuthorizationHelper.IsBranchUser(User) &&
                !AuthorizationHelper.BelongsToBranch(User, id))
                return Forbid();

            var branch = await _context.Branches
                .AsNoTracking()
                .Include(b => b.Users)
                    .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(b =>
                    b.Id == id &&
                    b.OrganizationId == organizationId.Value);

            if (branch == null)
                return NotFound(new { message = "Branch not found." });

            var manager = branch.Users.FirstOrDefault(u => u.RoleId == 3 || (u.Role != null && u.Role.Name == "Branch Manager"));

            return Ok(new
            {
                branch.Id,
                branch.OrganizationId,
                branch.Name,
                branch.Code,
                branch.Address,
                branch.City,
                branch.Phone,
                branch.ModuleType,
                branch.IsActive,
                branch.CreatedAt,
                ManagerName = manager?.Name ?? "",
                ManagerEmail = manager?.Email ?? "",
                ManagerPhone = branch.Phone,
                UserCount = branch.Users.Count
            });
        }

        [HttpGet("{id:int}/overview")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager")]
        public async Task<IActionResult> GetBranchOverview(int id)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);
            if (organizationId == null) return Unauthorized();

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, id))
                return Forbid();

            var branch = await _context.Branches
                .AsNoTracking()
                .Include(b => b.Users)
                    .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == organizationId.Value);

            if (branch == null)
                return NotFound(new { message = "Branch not found." });

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var manager = branch.Users.FirstOrDefault(u => u.RoleId == 3 || (u.Role != null && u.Role.Name == "Branch Manager"));

            // Real figures directly from database
            var billsToday = await _context.Bills.AsNoTracking()
                .Where(b => b.BranchId == id && b.GeneratedAt >= today && b.GeneratedAt < tomorrow && b.PaymentStatus == "Paid")
                .ToListAsync();

            var ordersToday = await _context.Orders.AsNoTracking()
                .Where(o => o.BranchId == id && o.CreatedAt >= today && o.CreatedAt < tomorrow)
                .ToListAsync();

            var allOpenOrders = await _context.Orders.AsNoTracking()
                .Where(o => o.BranchId == id && (o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Ready" || o.Status == "Open"))
                .ToListAsync();

            var completedOrders = ordersToday.Count(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid");

            var todaySales = billsToday.Sum(b => b.GrandTotal);
            if (todaySales == 0)
            {
                todaySales = ordersToday.Where(o => o.Status == "Closed" || o.Status == "Paid" || o.Status == "Served").Sum(o => o.TotalAmount);
            }

            var lowStockItems = await _context.InventoryItems.AsNoTracking()
                .Where(i => i.BranchId == id && i.IsActive && i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) && i.CurrentStock > 0)
                .CountAsync();

            var outOfStockItems = await _context.InventoryItems.AsNoTracking()
                .Where(i => i.BranchId == id && i.IsActive && i.CurrentStock <= 0)
                .CountAsync();

            var recentPurchases = await _context.Purchases.AsNoTracking()
                .Where(p => p.BranchId == id && p.CreatedAt >= today.AddDays(-30))
                .ToListAsync();

            var todayProductionPlans = await _context.ProductionPlans.AsNoTracking()
                .Where(pp => pp.BranchId == id && pp.PlanDate >= today && pp.PlanDate < tomorrow)
                .CountAsync();

            var recentTransactions = await _context.Orders.AsNoTracking()
                .Where(o => o.BranchId == id)
                .OrderByDescending(o => o.CreatedAt)
                .Take(10)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.CreatedAt,
                    o.TotalAmount,
                    o.Status,
                    o.SaleType,
                    o.TableNumber
                })
                .ToListAsync();

            return Ok(new
            {
                branch = new
                {
                    branch.Id,
                    branch.OrganizationId,
                    branch.Name,
                    branch.Code,
                    branch.Address,
                    branch.City,
                    branch.Phone,
                    branch.IsActive,
                    branch.CreatedAt,
                    ManagerName = manager?.Name ?? "",
                    ManagerEmail = manager?.Email ?? "",
                    ManagerPhone = branch.Phone,
                    UserCount = branch.Users.Count
                },
                todaySales,
                todayOrders = ordersToday.Count,
                pendingOrders = allOpenOrders.Count,
                completedOrders,
                lowStockAlerts = lowStockItems,
                outOfStockAlerts = outOfStockItems,
                purchaseCount = recentPurchases.Count,
                purchaseTotal = recentPurchases.Sum(p => p.TotalAmount),
                productionPlanCount = todayProductionPlans,
                recentTransactions
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Organization Admin")]
        public async Task<IActionResult> UpdateBranch(int id, UpdateBranchRequest request)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);

            if (organizationId == null)
                return Unauthorized();

            var branch = await _context.Branches.FirstOrDefaultAsync(b =>
                b.Id == id &&
                b.OrganizationId == organizationId.Value);

            if (branch == null)
                return NotFound(new { message = "Branch not found." });

            branch.Name = request.Name;
            branch.Code = request.Code;
            branch.Address = request.Address;
            branch.City = request.City;
            branch.Phone = request.Phone;
            branch.IsActive = request.IsActive;

            if (!string.IsNullOrWhiteSpace(request.ModuleType))
            {
                var validModules = new[] { "KMS Only", "POS Only", "Both POS + KMS" };
                if (validModules.Contains(request.ModuleType.Trim()))
                {
                    branch.ModuleType = request.ModuleType.Trim();
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Branch updated successfully.", branch });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Organization Admin")]
        public async Task<IActionResult> DeleteBranch(int id)
        {
            var organizationId = AuthorizationHelper.GetOrganizationId(User);

            if (organizationId == null)
                return Unauthorized();

            var branch = await _context.Branches.FirstOrDefaultAsync(b =>
                b.Id == id &&
                b.OrganizationId == organizationId.Value);

            if (branch == null)
                return NotFound(new { message = "Branch not found." });

            branch.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Branch deactivated successfully." });
        }
    }

    public class CreateBranchRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string ModuleType { get; set; } = "Both POS + KMS";
    }

    public class UpdateBranchRequest : CreateBranchRequest
    {
        public bool IsActive { get; set; } = true;
    }
}
