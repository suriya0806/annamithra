namespace Samaya.API.Models
{
    public class ProductionPlan
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }
        public string? PlanNumber { get; set; }
        public DateTime PlanDate { get; set; }
        public string MealType { get; set; } = "General";
        public string Shift { get; set; } = "Morning"; // Morning, Evening, Night, All Day
        public string? KitchenName { get; set; } = "Main Kitchen";
        public int? MenuItemId { get; set; }
        public MenuItem? MenuItem { get; set; }
        public decimal PlannedQuantity { get; set; }
        public string Unit { get; set; } = "Portion";
        public string? Remarks { get; set; }
        public string Status { get; set; } = "PLANNED"; // DRAFT, PLANNED, ISSUED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<ProductionPlanItem> Items { get; set; } = new List<ProductionPlanItem>();
        public ICollection<ProductionPlanMaterial> Materials { get; set; } = new List<ProductionPlanMaterial>();
    }
}
