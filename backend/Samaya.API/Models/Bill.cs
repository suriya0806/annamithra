namespace Samaya.API.Models
{
    public class Bill
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public int OrderId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? TableNumber { get; set; }
        public int WaiterId { get; set; }
        public string SaleType { get; set; } = "TABLE_SERVICE";
        public decimal Subtotal { get; set; }
        public decimal Tax { get; set; }
        public decimal Discount { get; set; }
        public decimal GrandTotal { get; set; }
        public string PaymentStatus { get; set; } = "Pending";
        public string? PaymentMethod { get; set; }
        public decimal AmountTendered { get; set; }
        public decimal ChangeGiven { get; set; }
        public string? VoidReason { get; set; }
        public DateTime? VoidedAt { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }

        public Order? Order { get; set; }
        public User? Waiter { get; set; }
        public Branch? Branch { get; set; }
        public Organization? Organization { get; set; }
    }
}
