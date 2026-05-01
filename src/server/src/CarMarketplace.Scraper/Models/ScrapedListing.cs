namespace CarMarketplace.Scraper.Models;

public class ScrapedListing
{
    public string ExternalId { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public string? MakeName { get; set; }
    public string? ModelName { get; set; }

    public decimal? Price { get; set; }

    public int? Year { get; set; }
    public int? Mileage { get; set; }

    public string? FuelType { get; set; }
    public string? TransmissionType { get; set; }
    public string? BodyType { get; set; }

    public int? EngineDisplacementCc { get; set; }
    public int? HorsePower { get; set; }

    public string? Color { get; set; }
    public string? DriveType { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }

    public List<string> ImageUrls { get; set; } = [];

    public string? SellerName { get; set; }
    public string? SellerPhone { get; set; }
}
