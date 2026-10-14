namespace Samaya.API.Models
{
    public class InventoryItem
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Unit { get; set; } = "KG";
        public decimal MinimumStock { get; set; }
        public decimal CurrentStock { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? ItemCode { get; set; }
        public int? CategoryId { get; set; }
        public ItemCategory? CategoryItem { get; set; }
        public decimal ReorderLevel { get; set; }
        public decimal MaximumStock { get; set; }
        public decimal LastPurchasePrice { get; set; }
        public string? Description { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public Organization? Organization { get; set; }
        public Branch? Branch { get; set; }
        public ICollection<StockTransaction> Transactions { get; set; } = new List<StockTransaction>();
    }
}
