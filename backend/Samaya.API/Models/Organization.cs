namespace Samaya.API.Models
{
    public class Organization
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Branch> Branches { get; set; } = new List<Branch>();
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
