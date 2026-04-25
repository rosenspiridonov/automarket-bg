using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class SavedSearch : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string FilterJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
}
