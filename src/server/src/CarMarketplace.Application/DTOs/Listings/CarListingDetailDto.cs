namespace CarMarketplace.Application.DTOs.Listings;

public record CarListingDetailDto : CarListingDto
{
    public string? VinNumber { get; init; }
    public List<CarImageDto> Images { get; init; } = [];
    public List<CarFeatureDto> Features { get; init; } = [];
    public List<PriceHistoryPointDto> PriceHistory { get; init; } = [];
    public string? SellerEmail { get; init; }
    public string? SellerCity { get; init; }
    public DateTime? SellerMemberSince { get; init; }
    public string? ExternalSourceUrl { get; init; }
    public string? ExternalSource { get; init; }
    public FairPriceAnalysisDto? FairPriceAnalysis { get; init; }
}

public record PriceHistoryPointDto
{
    public decimal Price { get; init; }
    public DateTime RecordedAt { get; init; }
}

public record CarImageDto
{
    public int Id { get; init; }
    public string Url { get; init; } = string.Empty;
    public bool IsPrimary { get; init; }
    public int SortOrder { get; init; }
}

public record CarFeatureDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
}

public record FairPriceAnalysisDto
{
    public required decimal MarketAveragePrice { get; init; }
    public required decimal PercentDifference { get; init; }
    public required string Position { get; init; }
    public required int SampleSize { get; init; }
}
