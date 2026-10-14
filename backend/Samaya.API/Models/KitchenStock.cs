namespace Samaya.API.Models
{
    public class KitchenStock
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public Organization? Organization { get; set; }
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }
        public string KitchenName { get; set; } = "Main Kitchen";
        public int InventoryItemId { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public decimal CurrentStock { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
