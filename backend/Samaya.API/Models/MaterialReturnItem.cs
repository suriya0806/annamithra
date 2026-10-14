namespace Samaya.API.Models
{
    public class MaterialReturnItem
    {
        public int Id { get; set; }
        public int MaterialReturnId { get; set; }
        public MaterialReturn? MaterialReturn { get; set; }
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public decimal Quantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal ConsumedQuantity { get; set; }
        public decimal ReturnedQuantity { get; set; }
        public string Unit { get; set; } = "KG";
        public decimal StockBefore { get; set; }
        public decimal StockAfter { get; set; }
        public decimal KitchenStockBefore { get; set; }
        public decimal KitchenStockAfter { get; set; }
        public string? Notes { get; set; }
    }
}
