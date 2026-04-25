using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class Favorite : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public int CarListingId { get; set; }
    public DateTime CreatedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public CarListing CarListing { get; set; } = null!;
}
