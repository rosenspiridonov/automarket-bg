namespace CarMarketplace.Application.DTOs.Analytics;

public record MarketOverviewDto
{
    public int TotalListings { get; init; }
    public int TotalMakes { get; init; }
    public decimal AveragePrice { get; init; }
    public double AverageMileage { get; init; }
    public int AverageYear { get; init; }
    public int NewListingsLast7Days { get; init; }
}

public record PriceByMakeDto
{
    public int MakeId { get; init; }
    public string MakeName { get; init; } = string.Empty;
    public decimal AveragePrice { get; init; }
    public decimal MinPrice { get; init; }
    public decimal MaxPrice { get; init; }
    public int ListingCount { get; init; }
}

public record PriceTrendPointDto
{
    public int Year { get; init; }
    public decimal AveragePrice { get; init; }
    public int ListingCount { get; init; }
}

public record ListingCountByBodyTypeDto
{
    public string BodyType { get; init; } = string.Empty;
    public int Count { get; init; }
}

public record FairPriceReferenceDto
{
    public required decimal AveragePrice { get; init; }
    public required decimal MinPrice { get; init; }
    public required decimal MaxPrice { get; init; }
    public required int SampleSize { get; init; }
}
