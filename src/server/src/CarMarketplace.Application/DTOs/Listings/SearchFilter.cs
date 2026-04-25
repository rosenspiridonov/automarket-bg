using CarMarketplace.Application.Common;

namespace CarMarketplace.Application.DTOs.Listings;

public class SearchFilter
{
    public int? MakeId { get; set; }
    public int? ModelId { get; set; }
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
    public decimal? PriceFrom { get; set; }
    public decimal? PriceTo { get; set; }
    public string? FuelType { get; set; }
    public string? TransmissionType { get; set; }
    public string? BodyType { get; set; }
    public string? DriveType { get; set; }
    public string? Color { get; set; }
    public string? Condition { get; set; }
    public string? City { get; set; }
    public string? Query { get; set; }
    public ListingSortOrder SortBy { get; set; } = ListingSortOrder.Newest;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
