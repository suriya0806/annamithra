using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Models;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/superadmin")]
    [Authorize(Roles = "Super Admin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly SamayaDbContext _context;

        public SuperAdminController(SamayaDbContext context)
        {
            _context = context;
        }

        [HttpGet("organizations")]
        public async Task<IActionResult> GetOrganizations()
        {
            var organizations = await _context.Organizations
                .AsNoTracking()
                .OrderBy(o => o.Name)
                .Select(o => new
                {
                    o.Id,
                    o.Name,
                    o.Type,
                    o.City,
                    o.Phone,
                    status = "Active",
                    o.CreatedAt,
                    branchCount = o.Branches.Count,
                    userCount = o.Users.Count(),
                    adminName = o.Users.Where(u => u.RoleId == 2).Select(u => u.Name).FirstOrDefault()
                                ?? o.Users.Select(u => u.Name).FirstOrDefault() ?? "",
                    adminEmail = o.Users.Where(u => u.RoleId == 2).Select(u => u.Email).FirstOrDefault()
                                 ?? o.Users.Select(u => u.Email).FirstOrDefault() ?? ""
                })
                .ToListAsync();

            return Ok(organizations);
        }

        [HttpGet("organizations/{id:int}")]
        public async Task<IActionResult> GetOrganization(int id)
        {
            var organization = await _context.Organizations
                .AsNoTracking()
                .Include(o => o.Branches)
                .Include(o => o.Users)
                    .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (organization == null)
            {
                return NotFound(new
                {
                    message = "Organization not found."
                });
            }

            var orgAdmins = organization.Users
                .Where(u => u.RoleId == 2 || (u.Role != null && u.Role.Name == "Organization Admin"))
                .ToList();

            var primaryAdmin = orgAdmins.FirstOrDefault() ?? organization.Users.FirstOrDefault();

            return Ok(new
            {
                organization.Id,
                organization.Name,
                organization.Type,
                organization.City,
                organization.Phone,
                status = "Active",
                organization.CreatedAt,
                branchCount = organization.Branches.Count,
                userCount = organization.Users.Count,
                admin = primaryAdmin != null ? new
                {
                    primaryAdmin.Id,
                    primaryAdmin.Name,
                    primaryAdmin.Email,
                    role = primaryAdmin.Role?.Name ?? "Organization Admin",
                    status = primaryAdmin.IsActive ? "Active" : "Inactive",
                    primaryAdmin.IsActive,
                    primaryAdmin.CreatedAt
                } : null,
                admins = organization.Users
                    .OrderBy(u => u.Id)
                    .Select(u => new
                    {
                        u.Id,
                        u.Name,
                        u.Email,
                        role = u.Role?.Name ?? "Staff",
                        status = u.IsActive ? "Active" : "Inactive",
                        u.IsActive,
                        u.CreatedAt
                    })
                    .ToList(),
                branches = organization.Branches
                    .OrderBy(b => b.Name)
                    .Select(b => new
                    {
                        b.Id,
                        b.OrganizationId,
                        b.Name,
                        b.Code,
                        b.Address,
                        b.City,
                        location = !string.IsNullOrWhiteSpace(b.City) ? b.City : b.Address,
                        b.Phone,
                        status = b.IsActive ? "Active" : "Inactive",
                        b.IsActive,
                        b.CreatedAt
                    })
                    .ToList()
            });
        }

        [HttpPost("organizations")]
        public async Task<IActionResult> CreateOrganization([FromBody] CreateOrganizationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new
                {
                    message = "Organization name is required."
                });
            }

            var trimmedName = request.Name.Trim();
            var exists = await _context.Organizations.AnyAsync(o => o.Name.ToLower() == trimmedName.ToLower());
            if (exists)
            {
                return BadRequest(new
                {
                    message = "An organization with this name already exists."
                });
            }

            var hasAdmin = !string.IsNullOrWhiteSpace(request.AdminEmail);
            string trimmedEmail = string.Empty;
            if (hasAdmin)
            {
                trimmedEmail = request.AdminEmail!.Trim();
                if (string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new
                    {
                        message = "Password is required when providing administrator login email."
                    });
                }

                var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == trimmedEmail.ToLower());
                if (emailExists)
                {
                    return BadRequest(new
                    {
                        message = "A user with this email already exists."
                    });
                }
            }

            var organization = new Organization
            {
                Name = trimmedName,
                Type = string.IsNullOrWhiteSpace(request.Type) ? "Restaurant" : request.Type.Trim(),
                City = request.City?.Trim() ?? string.Empty,
                Phone = request.Phone?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Organizations.Add(organization);
                await _context.SaveChangesAsync();

                User? adminUser = null;
                if (hasAdmin)
                {
                    var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Organization Admin")
                               ?? await _context.Roles.FirstOrDefaultAsync(r => r.Id == 2);

                    if (role == null)
                    {
                        role = new Role { Name = "Organization Admin" };
                        _context.Roles.Add(role);
                        await _context.SaveChangesAsync();
                    }

                    var adminName = string.IsNullOrWhiteSpace(request.AdminName)
                        ? $"{organization.Name} Admin"
                        : request.AdminName.Trim();

                    adminUser = new User
                    {
                        OrganizationId = organization.Id,
                        RoleId = role.Id,
                        Name = adminName,
                        Email = trimmedEmail,
                        PasswordHash = HashPassword(request.Password!),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Users.Add(adminUser);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = hasAdmin
                        ? "Organization and administrator credentials created successfully."
                        : "Organization created successfully.",
                    organization = new
                    {
                        organization.Id,
                        organization.Name,
                        organization.Type,
                        organization.City,
                        organization.Phone,
                        status = "Active",
                        organization.CreatedAt,
                        branchCount = 0,
                        userCount = hasAdmin ? 1 : 0
                    },
                    admin = adminUser != null ? new
                    {
                        adminUser.Id,
                        adminUser.Name,
                        adminUser.Email,
                        role = "Organization Admin",
                        status = "Active",
                        adminUser.CreatedAt
                    } : null
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("organizations/{id:int}/admin-credentials")]
        public async Task<IActionResult> UpdateAdminCredentials(int id, [FromBody] UpdateAdminCredentialsRequest request)
        {
            var organization = await _context.Organizations
                .Include(o => o.Users)
                    .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (organization == null)
            {
                return NotFound(new { message = "Organization not found." });
            }

            if (string.IsNullOrWhiteSpace(request.Password) &&
                string.IsNullOrWhiteSpace(request.AdminEmail) &&
                string.IsNullOrWhiteSpace(request.AdminName))
            {
                return BadRequest(new { message = "At least one credential field (name, email, or password) must be provided." });
            }

            var adminUser = organization.Users
                .FirstOrDefault(u => u.RoleId == 2 || (u.Role != null && u.Role.Name == "Organization Admin"))
                ?? organization.Users.FirstOrDefault();

            if (adminUser != null)
            {
                if (!string.IsNullOrWhiteSpace(request.AdminEmail))
                {
                    var trimmedEmail = request.AdminEmail.Trim();
                    var emailTaken = await _context.Users.AnyAsync(u => u.Id != adminUser.Id && u.Email.ToLower() == trimmedEmail.ToLower());
                    if (emailTaken)
                    {
                        return BadRequest(new { message = "Email is already taken by another user." });
                    }
                    adminUser.Email = trimmedEmail;
                }

                if (!string.IsNullOrWhiteSpace(request.AdminName))
                {
                    adminUser.Name = request.AdminName.Trim();
                }

                if (!string.IsNullOrWhiteSpace(request.Password))
                {
                    adminUser.PasswordHash = HashPassword(request.Password);
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Administrator credentials updated successfully.",
                    admin = new
                    {
                        adminUser.Id,
                        adminUser.Name,
                        adminUser.Email,
                        role = adminUser.Role?.Name ?? "Organization Admin",
                        status = adminUser.IsActive ? "Active" : "Inactive",
                        adminUser.CreatedAt
                    }
                });
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.AdminEmail) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new { message = "Admin email and password are required to create new login credentials." });
                }

                var trimmedEmail = request.AdminEmail.Trim();
                var emailTaken = await _context.Users.AnyAsync(u => u.Email.ToLower() == trimmedEmail.ToLower());
                if (emailTaken)
                {
                    return BadRequest(new { message = "Email is already taken by another user." });
                }

                var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Organization Admin")
                           ?? await _context.Roles.FirstOrDefaultAsync(r => r.Id == 2);

                if (role == null)
                {
                    role = new Role { Name = "Organization Admin" };
                    _context.Roles.Add(role);
                    await _context.SaveChangesAsync();
                }

                var newAdmin = new User
                {
                    OrganizationId = organization.Id,
                    RoleId = role.Id,
                    Name = string.IsNullOrWhiteSpace(request.AdminName) ? $"{organization.Name} Admin" : request.AdminName.Trim(),
                    Email = trimmedEmail,
                    PasswordHash = HashPassword(request.Password),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(newAdmin);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Administrator credentials created successfully.",
                    admin = new
                    {
                        newAdmin.Id,
                        newAdmin.Name,
                        newAdmin.Email,
                        role = role.Name,
                        status = "Active",
                        newAdmin.CreatedAt
                    }
                });
            }
        }

        [HttpDelete("organizations/{id:int}")]
        public async Task<IActionResult> DeleteOrganization(int id)
        {
            var organization = await _context.Organizations
                .Include(o => o.Users)
                .Include(o => o.Branches)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (organization == null)
            {
                return NotFound(new
                {
                    message = "Organization not found."
                });
            }

            if (string.Equals(
                    organization.Name,
                    "SAMAYA System",
                    StringComparison.OrdinalIgnoreCase) ||
                string.Equals(
                    organization.Type,
                    "System",
                    StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message = "The SAMAYA System organization cannot be deleted."
                });
            }

            var currentUserIdValue =
                User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(currentUserIdValue, out var currentUserId) &&
                organization.Users.Any(u => u.Id == currentUserId))
            {
                return BadRequest(new
                {
                    message = "You cannot delete the organization associated with your current Super Admin account."
                });
            }

            var branches = await _context.Branches
                .Where(b => b.OrganizationId == id)
                .ToListAsync();

            var menuItems = await _context.MenuItems
                .Where(m => m.OrganizationId == id)
                .ToListAsync();

            var inventoryItems = await _context.InventoryItems
                .Where(i => i.OrganizationId == id)
                .ToListAsync();

            var orders = await _context.Orders
                .Where(o => o.OrganizationId == id)
                .ToListAsync();

            var orderIds = orders.Select(o => o.Id).ToList();
            var menuItemIds = menuItems.Select(m => m.Id).ToList();
            var inventoryItemIds = inventoryItems.Select(i => i.Id).ToList();

            var bills = orderIds.Count == 0
                ? new List<Bill>()
                : await _context.Bills
                    .Where(b => orderIds.Contains(b.OrderId))
                    .ToListAsync();

            var kots = orderIds.Count == 0
                ? new List<KOT>()
                : await _context.KOTs
                    .Where(k => orderIds.Contains(k.OrderId))
                    .ToListAsync();

            var orderItems = orderIds.Count == 0
                ? new List<OrderItem>()
                : await _context.OrderItems
                    .Where(i => orderIds.Contains(i.OrderId))
                    .ToListAsync();

            var recipeIngredients = menuItemIds.Count == 0
                ? new List<RecipeIngredient>()
                : await _context.RecipeIngredients
                    .Where(r => menuItemIds.Contains(r.MenuItemId))
                    .ToListAsync();

            var stockTransactions = inventoryItemIds.Count == 0
                ? new List<StockTransaction>()
                : await _context.StockTransactions
                    .Where(t => inventoryItemIds.Contains(t.InventoryItemId) || t.OrganizationId == id)
                    .ToListAsync();

            var materialReturns = await _context.MaterialReturns
                .Where(m => m.OrganizationId == id)
                .ToListAsync();
            var materialReturnIds = materialReturns.Select(m => m.Id).ToList();
            var materialReturnItems = materialReturnIds.Count == 0
                ? new List<MaterialReturnItem>()
                : await _context.MaterialReturnItems
                    .Where(i => materialReturnIds.Contains(i.MaterialReturnId))
                    .ToListAsync();

            var materialIssues = await _context.MaterialIssues
                .Where(m => m.OrganizationId == id)
                .ToListAsync();
            var materialIssueIds = materialIssues.Select(m => m.Id).ToList();
            var materialIssueItems = materialIssueIds.Count == 0
                ? new List<MaterialIssueItem>()
                : await _context.MaterialIssueItems
                    .Where(i => materialIssueIds.Contains(i.MaterialIssueId))
                    .ToListAsync();

            var actualProductions = await _context.ActualProductions
                .Where(p => p.OrganizationId == id)
                .ToListAsync();
            var actualProdIds = actualProductions.Select(p => p.Id).ToList();
            var actualProdItems = actualProdIds.Count == 0
                ? new List<ActualProductionItem>()
                : await _context.ActualProductionItems
                    .Where(i => actualProdIds.Contains(i.ActualProductionId))
                    .ToListAsync();
            var actualProdIngs = actualProdIds.Count == 0
                ? new List<ActualProductionIngredient>()
                : await _context.ActualProductionIngredients
                    .Where(i => actualProdIds.Contains(i.ActualProductionId))
                    .ToListAsync();

            var productionPlans = await _context.ProductionPlans
                .Where(p => p.OrganizationId == id)
                .ToListAsync();
            var planIds = productionPlans.Select(p => p.Id).ToList();
            var planItems = planIds.Count == 0
                ? new List<ProductionPlanItem>()
                : await _context.ProductionPlanItems
                    .Where(i => planIds.Contains(i.ProductionPlanId))
                    .ToListAsync();
            var planMaterials = planIds.Count == 0
                ? new List<ProductionPlanMaterial>()
                : await _context.ProductionPlanMaterials
                    .Where(m => planIds.Contains(m.ProductionPlanId))
                    .ToListAsync();

            var purchases = await _context.Purchases
                .Where(p => p.OrganizationId == id)
                .ToListAsync();
            var purchaseIds = purchases.Select(p => p.Id).ToList();
            var purchaseItems = purchaseIds.Count == 0
                ? new List<PurchaseItem>()
                : await _context.PurchaseItems
                    .Where(i => purchaseIds.Contains(i.PurchaseId))
                    .ToListAsync();

            var stockTransfers = await _context.StockTransfers
                .Where(t => t.OrganizationId == id)
                .ToListAsync();

            var kitchenStocks = await _context.KitchenStocks
                .Where(k => k.OrganizationId == id)
                .ToListAsync();

            var suppliers = await _context.Suppliers
                .Where(s => s.OrganizationId == id)
                .ToListAsync();

            var itemCategories = await _context.ItemCategories
                .Where(c => c.OrganizationId == id)
                .ToListAsync();

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                // Remove dependent records first to satisfy foreign key constraints
                _context.Bills.RemoveRange(bills);
                _context.KOTs.RemoveRange(kots);
                _context.OrderItems.RemoveRange(orderItems);
                _context.Orders.RemoveRange(orders);

                _context.MaterialReturnItems.RemoveRange(materialReturnItems);
                _context.MaterialReturns.RemoveRange(materialReturns);

                _context.MaterialIssueItems.RemoveRange(materialIssueItems);
                _context.MaterialIssues.RemoveRange(materialIssues);

                _context.ActualProductionIngredients.RemoveRange(actualProdIngs);
                _context.ActualProductionItems.RemoveRange(actualProdItems);
                _context.ActualProductions.RemoveRange(actualProductions);

                _context.ProductionPlanMaterials.RemoveRange(planMaterials);
                _context.ProductionPlanItems.RemoveRange(planItems);
                _context.ProductionPlans.RemoveRange(productionPlans);

                _context.PurchaseItems.RemoveRange(purchaseItems);
                _context.Purchases.RemoveRange(purchases);

                _context.StockTransfers.RemoveRange(stockTransfers);
                _context.StockTransactions.RemoveRange(stockTransactions);
                _context.RecipeIngredients.RemoveRange(recipeIngredients);

                _context.MenuItems.RemoveRange(menuItems);
                _context.KitchenStocks.RemoveRange(kitchenStocks);
                _context.InventoryItems.RemoveRange(inventoryItems);
                _context.ItemCategories.RemoveRange(itemCategories);
                _context.Suppliers.RemoveRange(suppliers);

                _context.Users.RemoveRange(organization.Users);
                _context.Branches.RemoveRange(branches);

                _context.Organizations.Remove(organization);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = $"Organization '{organization.Name}' and all associated records were deleted successfully.",
                    organizationId = id
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            return Convert.ToBase64String(
                sha256.ComputeHash(Encoding.UTF8.GetBytes(password)));
        }
    }

    public class CreateOrganizationRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Restaurant";
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? AdminName { get; set; }
        public string? AdminEmail { get; set; }
        public string? Password { get; set; }
    }

    public class UpdateAdminCredentialsRequest
    {
        public string? AdminName { get; set; }
        public string? AdminEmail { get; set; }
        public string? Password { get; set; }
    }
}
