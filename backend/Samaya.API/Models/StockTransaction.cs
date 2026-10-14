namespace Samaya.API.Models
{
    public class StockTransaction
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public int InventoryItemId { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal StockBefore { get; set; }
        public decimal StockAfter { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? SourceLocation { get; set; }
        public string? DestinationLocation { get; set; }
        public string? ReferenceType { get; set; }
        public string? ReferenceId { get; set; }

        public Organization? Organization { get; set; }
        public Branch? Branch { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public User? CreatedByUser { get; set; }
    }
}
