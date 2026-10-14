namespace Samaya.API.Models
{
    public class MaterialIssueItem
    {
        public int Id { get; set; }
        public int MaterialIssueId { get; set; }
        public MaterialIssue? MaterialIssue { get; set; }
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = "KG";
        public decimal StockBefore { get; set; }
        public decimal StockAfter { get; set; }
        public decimal KitchenStockBefore { get; set; }
        public decimal KitchenStockAfter { get; set; }
    }
}
