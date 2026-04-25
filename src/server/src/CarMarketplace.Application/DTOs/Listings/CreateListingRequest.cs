namespace CarMarketplace.Application.DTOs.Listings;

public record CreateListingRequest
{
    public required string Title { get; init; }
    public string? Description { get; init; }

    public required int MakeId { get; init; }
    public required int ModelId { get; init; }
    public required int Year { get; init; }

    public required decimal Price { get; init; }
    public required int Mileage { get; init; }

    public required string FuelType { get; init; }
    public required string TransmissionType { get; init; }
    public required string BodyType { get; init; }
    public required string DriveType { get; init; }

    public int? EngineDisplacementCc { get; init; }
    public int? HorsePower { get; init; }
    public required string Color { get; init; }
    public required string Condition { get; init; }

    public string? City { get; init; }
    public string? Region { get; init; }
    public string? VinNumber { get; init; }

    public List<int> FeatureIds { get; init; } = [];
}
