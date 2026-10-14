namespace Samaya.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int? BranchId { get; set; }
        public int RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Organization? Organization { get; set; }
        public Branch? Branch { get; set; }
        public Role? Role { get; set; }
    }
}
