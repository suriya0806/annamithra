namespace Samaya.API.Models
{
    public class Branch
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public string ModuleType { get; set; } = "Both POS + KMS";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Organization? Organization { get; set; }
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
