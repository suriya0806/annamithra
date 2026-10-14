using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Models;
using System.Security.Cryptography;
using System.Text;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager")]
    public class UsersController : ControllerBase
    {
        private readonly SamayaDbContext _context;

        public UsersController(SamayaDbContext context)
        {
            _context = context;
        }

        private bool IsSuperAdmin() => User.IsInRole("Super Admin");

        private int? GetOrganizationId()
        {
            var value = User.FindFirst("organizationId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        private int? GetBranchId()
        {
            var value = User.FindFirst("branchId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        [HttpGet("organizations")]
        [Authorize(Roles = "Super Admin")]
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
                    o.CreatedAt,
                    branchCount = o.Branches.Count,
                    userCount = o.Users.Count()
                })
                .ToListAsync();

            return Ok(organizations);
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var query = _context.Roles.AsNoTracking();

            if (!IsSuperAdmin())
                query = query.Where(r => r.Name != "Super Admin");

            if (User.IsInRole("Branch Manager"))
                query = query.Where(r => r.Name != "Organization Admin" && r.Name != "Branch Manager");

            return Ok(await query
                .Where(r => r.Name != "Consumer")
                .OrderBy(r => r.Id)
                .ToListAsync());
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] int? organizationId = null, [FromQuery] int? branchId = null)
        {
            var organization = GetOrganizationId();

            if (!IsSuperAdmin() && organization == null)
                return Unauthorized();

            var query = _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Include(u => u.Branch)
                .Include(u => u.Organization)
                .AsQueryable();

            if (IsSuperAdmin())
            {
                if (organizationId.HasValue)
                    query = query.Where(u => u.OrganizationId == organizationId.Value);
            }
            else
            {
                query = query.Where(u => u.OrganizationId == organization!.Value);
            }

            if (branchId.HasValue)
            {
                if (!IsSuperAdmin() && organization != null)
                {
                    var branchBelongs = await _context.Branches.AnyAsync(b => b.Id == branchId.Value && b.OrganizationId == organization.Value);
                    if (!branchBelongs)
                    {
                        return Forbid();
                    }
                }
                query = query.Where(u => u.BranchId == branchId.Value);
            }

            if (User.IsInRole("Branch Manager"))
            {
                var bmBranchId = GetBranchId();
                if (bmBranchId.HasValue)
                {
                    query = query.Where(u => u.BranchId == bmBranchId.Value);
                }
            }

            var users = await query
                .OrderBy(u => u.Organization!.Name)
                .ThenBy(u => u.Name)
                .Select(u => new
                {
                    u.Id,
                    u.OrganizationId,
                    OrganizationName = u.Organization == null ? null : u.Organization.Name,
                    u.BranchId,
                    BranchName = u.Branch == null ? null : u.Branch.Name,
                    u.RoleId,
                    Role = u.Role == null ? null : u.Role.Name,
                    u.Name,
                    u.Email,
                    u.IsActive,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser(CreateUserRequest request)
        {
            var currentOrganizationId = GetOrganizationId();

            if (!IsSuperAdmin() && currentOrganizationId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Name, email and password are required." });
            }

            var email = request.Email.Trim().ToLowerInvariant();

            if (await _context.Users.AnyAsync(u => u.Email == email))
                return BadRequest(new { message = "Email already registered." });

            var targetOrganizationId = IsSuperAdmin()
                ? request.OrganizationId
                : currentOrganizationId!.Value;

            if (!targetOrganizationId.HasValue)
                return BadRequest(new { message = "Organization is required." });

            var organizationExists = await _context.Organizations
                .AnyAsync(o => o.Id == targetOrganizationId.Value);

            if (!organizationExists)
                return BadRequest(new { message = "Invalid organization." });

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == request.RoleId);

            if (role == null || role.Name == "Consumer")
                return BadRequest(new { message = "Invalid management role." });

            if (role.Name == "Super Admin" && !IsSuperAdmin())
                return Forbid();

            if (User.IsInRole("Branch Manager"))
            {
                var bmBranchId = GetBranchId();
                if (!bmBranchId.HasValue)
                    return Unauthorized(new { message = "Branch Manager has no associated branch." });

                request.BranchId = bmBranchId.Value;

                if (role.Name == "Super Admin" || role.Name == "Organization Admin" || role.Name == "Branch Manager")
                    return BadRequest(new { message = "Branch Manager can only create branch operational staff (e.g. Waiter, Chef, Kitchen Manager)." });
            }

            Branch? branch = null;

            if (request.BranchId.HasValue)
            {
                branch = await _context.Branches.FirstOrDefaultAsync(b =>
                    b.Id == request.BranchId.Value &&
                    b.OrganizationId == targetOrganizationId.Value &&
                    b.IsActive);

                if (branch == null)
                    return BadRequest(new { message = "Branch does not belong to the selected organization." });
            }

            var branchRoles = new[]
            {
                "Branch Manager", "Kitchen Manager", "Chef",
                "Inventory Manager", "Accountant", "Staff", "Waiter"
            };

            if (branchRoles.Contains(role.Name) && !request.BranchId.HasValue)
                return BadRequest(new { message = $"{role.Name} must be assigned to a branch." });

            if (role.Name == "Super Admin" && request.BranchId.HasValue)
                return BadRequest(new { message = "Super Admin must be organization-level." });

            var user = new User
            {
                OrganizationId = targetOrganizationId.Value,
                BranchId = request.BranchId,
                RoleId = role.Id,
                Name = request.Name.Trim(),
                Email = email,
                PasswordHash = HashPassword(request.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "User created successfully.",
                user = new
                {
                    user.Id,
                    user.OrganizationId,
                    OrganizationName = (await _context.Organizations
                        .Where(o => o.Id == user.OrganizationId)
                        .Select(o => o.Name)
                        .FirstAsync()),
                    user.BranchId,
                    BranchName = branch?.Name,
                    user.RoleId,
                    Role = role.Name,
                    user.Name,
                    user.Email,
                    user.IsActive,
                    user.CreatedAt
                }
            });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var organizationId = GetOrganizationId();

            var user = await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Include(u => u.Branch)
                .Include(u => u.Organization)
                .Where(u => u.Id == id)
                .Where(u => IsSuperAdmin() || (organizationId.HasValue && u.OrganizationId == organizationId.Value))
                .Select(u => new
                {
                    u.Id,
                    u.OrganizationId,
                    OrganizationName = u.Organization == null ? null : u.Organization.Name,
                    u.BranchId,
                    BranchName = u.Branch == null ? null : u.Branch.Name,
                    u.RoleId,
                    Role = u.Role == null ? null : u.Role.Name,
                    u.Name,
                    u.Email,
                    u.IsActive,
                    u.CreatedAt
                })
                .FirstOrDefaultAsync();

            return user == null
                ? NotFound(new { message = "User not found." })
                : Ok(user);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateUser(int id, UpdateUserRequest request)
        {
            var organizationId = GetOrganizationId();

            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Id == id &&
                (IsSuperAdmin() ||
                 (organizationId.HasValue && u.OrganizationId == organizationId.Value)));

            if (user == null)
                return NotFound(new { message = "User not found." });

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == request.RoleId);

            if (role == null || role.Name == "Consumer")
                return BadRequest(new { message = "Invalid management role." });

            if (role.Name == "Super Admin" && !IsSuperAdmin())
                return Forbid();

            var branchRoles = new[]
            {
                "Branch Manager", "Kitchen Manager", "Chef",
                "Inventory Manager", "Accountant", "Staff", "Waiter"
            };

            if (branchRoles.Contains(role.Name) && !request.BranchId.HasValue)
                return BadRequest(new { message = $"{role.Name} must be assigned to a branch." });

            if (request.BranchId.HasValue)
            {
                var branchExists = await _context.Branches.AnyAsync(b =>
                    b.Id == request.BranchId.Value &&
                    b.OrganizationId == user.OrganizationId &&
                    b.IsActive);

                if (!branchExists)
                    return BadRequest(new { message = "Invalid branch." });
            }

            user.Name = request.Name.Trim();
            user.BranchId = request.BranchId;
            user.RoleId = request.RoleId;
            user.IsActive = request.IsActive;

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.PasswordHash = HashPassword(request.Password);

            await _context.SaveChangesAsync();

            return Ok(new { message = "User updated successfully." });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var organizationId = GetOrganizationId();

            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Id == id &&
                (IsSuperAdmin() ||
                 (organizationId.HasValue && u.OrganizationId == organizationId.Value)));

            if (user == null)
                return NotFound(new { message = "User not found." });

            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(currentUserId, out var currentId) && currentId == user.Id)
                return BadRequest(new { message = "You cannot delete your own login account." });

            if (User.IsInRole("Branch Manager"))
            {
                var bmBranchId = GetBranchId();
                if (!bmBranchId.HasValue || user.BranchId != bmBranchId.Value)
                    return Forbid();

                var userRole = await _context.Roles.FirstOrDefaultAsync(r => r.Id == user.RoleId);
                if (userRole?.Name == "Super Admin" || userRole?.Name == "Organization Admin" || userRole?.Name == "Branch Manager")
                    return BadRequest(new { message = "Branch Manager cannot delete other managers or administrators." });
            }

            // Historical records can reference a user. Keep those records intact
            // and remove the login by deactivating the account.
            var hasStockHistory = await _context.StockTransactions
                .AnyAsync(t => t.CreatedByUserId == user.Id);

            var hasOrders = await _context.Orders
                .AnyAsync(o => o.WaiterId == user.Id);

            if (hasStockHistory || hasOrders)
            {
                user.IsActive = false;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "User login deactivated. Historical records were preserved."
                });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "User login deleted successfully."
            });
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            return Convert.ToBase64String(
                sha256.ComputeHash(Encoding.UTF8.GetBytes(password)));
        }
    }

    public class CreateUserRequest
    {
        public int? OrganizationId { get; set; }
        public int? BranchId { get; set; }
        public int RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateUserRequest
    {
        public int? BranchId { get; set; }
        public int RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
