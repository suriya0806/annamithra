namespace Samaya.API.Models
{
    public class ProductionPlanItem
    {
        public int Id { get; set; }
        public int ProductionPlanId { get; set; }
        public ProductionPlan? ProductionPlan { get; set; }
        public int MenuItemId { get; set; }
        public MenuItem? MenuItem { get; set; }
        public decimal PlannedQuantity { get; set; }
        public decimal ExpectedSales { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal ActualSales { get; set; }
        public decimal OrderedQuantity { get; set; }
        public decimal RemainingQuantity { get; set; }
        public decimal UnsoldQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string? LossReason { get; set; } // Unsold, Wastage, Spoilage, Damaged, Staff Consumption, Other Loss
        public string? Remarks { get; set; }
        public string? Unit { get; set; } = "Portion";
        public string Status { get; set; } = "Planned";
    }
}
