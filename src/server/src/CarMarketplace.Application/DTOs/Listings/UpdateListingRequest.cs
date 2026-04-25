namespace CarMarketplace.Application.DTOs.Listings;

public record UpdateListingRequest
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public decimal? Price { get; init; }
    public int? Mileage { get; init; }
    public string? City { get; init; }
    public string? Region { get; init; }
    public string? Status { get; init; }
    public List<int>? FeatureIds { get; init; }
}
