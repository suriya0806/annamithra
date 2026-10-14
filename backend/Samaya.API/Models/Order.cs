namespace Samaya.API.Models
{
    public class Order
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string? TableNumber { get; set; }
        public string? CustomerName { get; set; }
        public int WaiterId { get; set; }
        public string Status { get; set; } = "Open";
        public string SaleType { get; set; } = "TABLE_SERVICE";
        public decimal Subtotal { get; set; }
        public decimal Tax { get; set; }
        public decimal Discount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool InventoryApplied { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadyAt { get; set; }
        public DateTime? ServedAt { get; set; }
        public DateTime? ClosedAt { get; set; }

        public Organization? Organization { get; set; }
        public Branch? Branch { get; set; }
        public User? Waiter { get; set; }
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
        public ICollection<KOT> KOTs { get; set; } = new List<KOT>();
    }
}
