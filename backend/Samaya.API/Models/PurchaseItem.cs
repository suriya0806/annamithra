namespace Samaya.API.Models
{
    public class PurchaseItem
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public Purchase? Purchase { get; set; }
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public string? Unit { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public decimal ReturnedQuantity { get; set; } = 0;
        public string? ReturnReason { get; set; }
    }
}
