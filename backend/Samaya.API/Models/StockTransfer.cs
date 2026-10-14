using System.ComponentModel.DataAnnotations.Schema;

namespace Samaya.API.Models
{
    public class StockTransfer
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public string? TransferNumber { get; set; }
        public int? FromStoreId { get; set; }
        public int? ToStoreId { get; set; }
        public int? FromBranchId { get; set; }
        public Branch? FromBranch { get; set; }
        public int? ToBranchId { get; set; }
        public Branch? ToBranch { get; set; }
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public decimal Quantity { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Received, Cancelled
        public string? Notes { get; set; }
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public int? ApprovedByUserId { get; set; }
        public User? ApprovedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? TransferDate { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public decimal? DispatchedQuantity { get; set; }
        public decimal? ReceivedQuantity { get; set; }

        [NotMapped]
        public DateTime? TransferredAt
        {
            get => TransferDate ?? CreatedAt;
            set => TransferDate = value;
        }

        [NotMapped]
        public string? Remarks
        {
            get => Notes;
            set => Notes = value;
        }
    }
}
