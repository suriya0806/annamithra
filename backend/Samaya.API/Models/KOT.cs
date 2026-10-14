namespace Samaya.API.Models
{
    public class KOT
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public int OrderId { get; set; }
        public string KOTNumber { get; set; } = string.Empty;
        public string? TableNumber { get; set; }
        public string? CustomerName { get; set; }
        public int WaiterId { get; set; }
        public string Status { get; set; } = "Pending";
        public string SaleType { get; set; } = "TABLE_SERVICE";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadyAt { get; set; }
        public DateTime? ServedAt { get; set; }

        public Order? Order { get; set; }
        public User? Waiter { get; set; }
        public Branch? Branch { get; set; }
        public Organization? Organization { get; set; }
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
}
