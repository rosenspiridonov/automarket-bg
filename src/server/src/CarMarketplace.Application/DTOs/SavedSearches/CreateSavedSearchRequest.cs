namespace CarMarketplace.Application.DTOs.SavedSearches;

public record CreateSavedSearchRequest
{
    public required string Name { get; init; }
    public required string FilterJson { get; init; }
}
