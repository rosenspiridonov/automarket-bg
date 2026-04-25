namespace CarMarketplace.Application.DTOs.SavedSearches;

public record SavedSearchDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string FilterJson { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}
