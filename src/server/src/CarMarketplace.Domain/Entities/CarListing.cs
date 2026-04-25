using CarMarketplace.Domain.Common;
using CarMarketplace.Domain.Enums;

namespace CarMarketplace.Domain.Entities;

public class CarListing : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int MakeId { get; set; }
    public int ModelId { get; set; }
    public int Year { get; set; }

    public decimal Price { get; set; }

    public int Mileage { get; set; }

    public FuelType FuelType { get; set; }
    public TransmissionType TransmissionType { get; set; }
    public BodyType BodyType { get; set; }
    public Enums.DriveType DriveType { get; set; }

    public int? EngineDisplacementCc { get; set; }
    public int? HorsePower { get; set; }

    public CarColor Color { get; set; }
    public Condition Condition { get; set; }
    public ListingStatus Status { get; set; }

    public string? City { get; set; }
    public string? Region { get; set; }
    public string? VinNumber { get; set; }

    public string? ExternalSourceId { get; set; }
    public string? ExternalSourceUrl { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public string SellerId { get; set; } = string.Empty;

    public ApplicationUser Seller { get; set; } = null!;
    public Make Make { get; set; } = null!;
    public Model Model { get; set; } = null!;
    public ICollection<CarImage> Images { get; set; } = [];
    public ICollection<CarFeature> Features { get; set; } = [];
    public ICollection<PriceHistory> PriceHistories { get; set; } = [];
}
