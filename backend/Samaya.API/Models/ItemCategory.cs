namespace Samaya.API.Models
{
    public class ItemCategory
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "Active";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
