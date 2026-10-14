namespace Samaya.API.Models
{
    public class ActualProductionItem
    {
        public int Id { get; set; }
        public int ActualProductionId { get; set; }
        public ActualProduction? ActualProduction { get; set; }
        public int MenuItemId { get; set; }
        public MenuItem? MenuItem { get; set; }
        public decimal ActualQuantity { get; set; }
    }
}
