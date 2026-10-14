namespace Samaya.API.Models
{
    public class Purchase
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }
        public int SupplierId { get; set; }
        public Supplier? Supplier { get; set; }
        public string? PurchaseNumber { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime? PurchaseDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft"; // Draft, Ordered, Received, Cancelled
        public string? Notes { get; set; }
        public int? StoreId { get; set; }
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<PurchaseItem> Items { get; set; } = new List<PurchaseItem>();
    }
}
