namespace Samaya.API.Models
{
    public class ActualProduction
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }
        public int? ProductionPlanId { get; set; }
        public ProductionPlan? ProductionPlan { get; set; }
        public string? ProductionNumber { get; set; }
        public DateTime ProductionDate { get; set; }
        public string MealType { get; set; } = "General";
        public int? MenuItemId { get; set; }
        public MenuItem? MenuItem { get; set; }
        public decimal PlannedQuantity { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal WastageQuantity { get; set; }
        public string Status { get; set; } = "COMPLETED";
        public string? Remarks { get; set; }
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<ActualProductionItem> Items { get; set; } = new List<ActualProductionItem>();
        public ICollection<ActualProductionIngredient> Ingredients { get; set; } = new List<ActualProductionIngredient>();
    }
}
