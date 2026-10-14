namespace Samaya.API.Models
{
    public class ProductionPlanMaterial
    {
        public int Id { get; set; }
        public int ProductionPlanId { get; set; }
        public ProductionPlan? ProductionPlan { get; set; }
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }

        public decimal PlannedQuantity { get; set; }
        public decimal ActualSentQuantity { get; set; }
        public decimal ActualUsedQuantity { get; set; }
        public decimal RemainingQuantity { get; set; }
        public decimal ReturnedQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string Unit { get; set; } = "KG";
        public string Status { get; set; } = "PLANNED"; // PLANNED, ISSUED, RETURNED, CLOSED
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
