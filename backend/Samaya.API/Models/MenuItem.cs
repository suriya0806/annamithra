namespace Samaya.API.Models
{
    public class MenuItem
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public decimal Price { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Code { get; set; }
        public string Unit { get; set; } = "Portion";
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public Organization? Organization { get; set; }
        public Branch? Branch { get; set; }
        public ICollection<RecipeIngredient> Ingredients { get; set; } = new List<RecipeIngredient>();
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
