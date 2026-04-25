using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class PriceHistory : BaseEntity
{
    public decimal Price { get; set; }
    public DateTime RecordedAt { get; set; }

    public int CarListingId { get; set; }
    public CarListing CarListing { get; set; } = null!;
}
