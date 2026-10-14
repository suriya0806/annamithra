using System.ComponentModel.DataAnnotations.Schema;

namespace Samaya.API.Models
{
    public class MaterialReturn
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }
        public string? ReturnNumber { get; set; }
        public DateTime? Date { get; set; }
        public string ReturnType { get; set; } = "Kitchen Unused"; // Kitchen Unused, Excess Production, Shift End Return
        public string? Department { get; set; } = "Main Kitchen";
        public string Reference { get; set; } = string.Empty;
        public int? MaterialIssueId { get; set; }
        public MaterialIssue? MaterialIssue { get; set; }
        public int? ProductionPlanId { get; set; }
        public ProductionPlan? ProductionPlan { get; set; }
        public decimal Quantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal ConsumedQuantity { get; set; }
        public decimal ReturnedQuantity { get; set; }
        public string? Reason { get; set; } = "Unused Product / Excess";
        public string? Notes { get; set; }
        [NotMapped]
        public string? Remarks { get => Notes; set => Notes = value; }
        public string Status { get; set; } = "Confirmed";
        public string? ReturnedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ReceivedBy { get; set; }
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<MaterialReturnItem> Items { get; set; } = new List<MaterialReturnItem>();
    }
}
