using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class CarFeature : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;

    public ICollection<CarListing> Listings { get; set; } = [];
}
