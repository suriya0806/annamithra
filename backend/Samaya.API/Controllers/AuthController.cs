using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Samaya.API.Data;
using Samaya.API.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(SamayaDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OrganizationName) ||
                string.IsNullOrWhiteSpace(request.AdminName) ||
                string.IsNullOrWhiteSpace(request.AdminEmail) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Organization name, admin name, email and password are required." });
            }

            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.AdminEmail);

            if (existingUser != null)
                return BadRequest(new { message = "Email already registered." });

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == "Organization Admin");

            if (role == null)
                return BadRequest(new { message = "Organization Admin role not found." });

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var organization = new Organization
                {
                    Name = request.OrganizationName,
                    Type = request.OrganizationType,
                    City = request.City,
                    Phone = request.Phone
                };

                _context.Organizations.Add(organization);
                await _context.SaveChangesAsync();

                var user = new User
                {
                    OrganizationId = organization.Id,
                    RoleId = role.Id,
                    Name = request.AdminName,
                    Email = request.AdminEmail,
                    PasswordHash = HashPassword(request.Password)
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Organization registered successfully.",
                    organization = new
                    {
                        id = organization.Id,
                        name = organization.Name,
                        type = organization.Type,
                        city = organization.City,
                        phone = organization.Phone
                    },
                    admin = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = role.Name
                    }
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email and password are required." });

            var user = await _context.Users
                .Include(u => u.Organization)
                .Include(u => u.Role)
                .Include(u => u.Branch)
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !user.IsActive)
                return Unauthorized(new { message = "Invalid email or password." });

            if (user.PasswordHash != HashPassword(request.Password))
                return Unauthorized(new { message = "Invalid email or password." });

            return Ok(new
            {
                message = "Login successful.",
                token = GenerateJwtToken(user),
                user = new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    role = user.Role?.Name,
                    organizationId = user.OrganizationId,
                    organizationName = user.Organization?.Name,
                    branchId = user.BranchId,
                    branchName = user.Branch?.Name,
                    branchModuleType = user.Branch?.ModuleType ?? "Both POS + KMS"
                }
            });
        }

        private string GenerateJwtToken(User user)
        {
            var key = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT Key is missing.");

            var issuer = _configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException("JWT Issuer is missing.");

            var audience = _configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException("JWT Audience is missing.");

            var minutes = int.TryParse(
                _configuration["Jwt:ExpiryMinutes"],
                out var parsedMinutes) ? parsedMinutes : 60;

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email),
                new(ClaimTypes.Name, user.Name),
                new(ClaimTypes.Role, user.Role?.Name ?? string.Empty),
                new("organizationId", user.OrganizationId.ToString()),
                new("branchId", user.BranchId?.ToString() ?? string.Empty),
                new("branchModuleType", user.Branch?.ModuleType ?? "Both POS + KMS")
            };

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer,
                audience,
                claims,
                expires: DateTime.UtcNow.AddMinutes(minutes),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            return Convert.ToBase64String(
                sha256.ComputeHash(Encoding.UTF8.GetBytes(password)));
        }
    }

    public class RegisterRequest
    {
        public string OrganizationName { get; set; } = string.Empty;
        public string OrganizationType { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string AdminName { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
