namespace CarMarketplace.Application.DTOs.Listings;

public record CarListingDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }

    public int MakeId { get; init; }
    public string MakeName { get; init; } = string.Empty;
    public int ModelId { get; init; }
    public string ModelName { get; init; } = string.Empty;

    public int Year { get; init; }
    public decimal Price { get; init; }
    public int Mileage { get; init; }

    public string FuelType { get; init; } = string.Empty;
    public string TransmissionType { get; init; } = string.Empty;
    public string BodyType { get; init; } = string.Empty;
    public string DriveType { get; init; } = string.Empty;

    public int? EngineDisplacementCc { get; init; }
    public int? HorsePower { get; init; }
    public string Color { get; init; } = string.Empty;
    public string Condition { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;

    public string? City { get; init; }
    public string? Region { get; init; }

    public string? PrimaryImageUrl { get; init; }
    public int ImageCount { get; init; }

    public string SellerId { get; init; } = string.Empty;
    public string SellerName { get; init; } = string.Empty;
    public string? SellerPhone { get; init; }

    public DateTime CreatedAt { get; init; }
}
