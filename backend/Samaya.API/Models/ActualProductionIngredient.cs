namespace Samaya.API.Models
{
    public class ActualProductionIngredient
    {
        public int Id { get; set; }
        public int ActualProductionId { get; set; }
        public ActualProduction? ActualProduction { get; set; }
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public decimal PlannedQuantity { get; set; }
        public decimal Quantity { get; set; } // Actual used
        public string? Unit { get; set; }
    }
}
