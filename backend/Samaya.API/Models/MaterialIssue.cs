using System.ComponentModel.DataAnnotations.Schema;

namespace Samaya.API.Models
{
    public class MaterialIssue
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }
        public string? IssueNumber { get; set; }
        public DateTime? Date { get; set; }
        public string IssueType { get; set; } = "Kitchen"; // Kitchen, Production, etc.
        public string? Department { get; set; }
        public string Reference { get; set; } = string.Empty;
        public int? ProductionPlanId { get; set; }
        public ProductionPlan? ProductionPlan { get; set; }
        public decimal Quantity { get; set; }
        public string? Notes { get; set; }
        [NotMapped]
        public string? Remarks { get => Notes; set => Notes = value; }
        public string Status { get; set; } = "Confirmed";
        public string? ReceivedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<MaterialIssueItem> Items { get; set; } = new List<MaterialIssueItem>();
    }
}
