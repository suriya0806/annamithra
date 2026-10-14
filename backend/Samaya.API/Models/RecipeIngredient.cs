namespace Samaya.API.Models
{
    public class RecipeIngredient
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public int BranchId { get; set; }
        public int MenuItemId { get; set; }
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public string? Notes { get; set; }

        public MenuItem? MenuItem { get; set; }
        public InventoryItem? InventoryItem { get; set; }
        public Branch? Branch { get; set; }
    }
}
