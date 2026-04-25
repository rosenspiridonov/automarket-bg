using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class CarImage : BaseEntity
{
    public string Url { get; set; } = string.Empty;
    public string? PublicId { get; set; }
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }

    public int CarListingId { get; set; }
    public CarListing CarListing { get; set; } = null!;
}
