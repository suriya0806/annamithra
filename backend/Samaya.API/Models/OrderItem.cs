namespace Samaya.API.Models
{
    public class OrderItem
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int MenuItemId { get; set; }
        public string MenuItemName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public int? KOTId { get; set; }
        public string? KOTNumber { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Order? Order { get; set; }
        public MenuItem? MenuItem { get; set; }
        public KOT? KOT { get; set; }
    }
}
