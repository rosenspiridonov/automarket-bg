using CarMarketplace.Application.DTOs.Analytics;

namespace CarMarketplace.Application.Interfaces;

public interface IMarketAnalyticsService
{
    Task<MarketOverviewDto> GetOverviewAsync();
    Task<List<PriceByMakeDto>> GetAveragePricesByMakeAsync(int limit = 15);
    Task<List<PriceTrendPointDto>> GetPriceTrendAsync(int makeId, int? modelId = null);
    Task<List<ListingCountByBodyTypeDto>> GetListingCountsByBodyTypeAsync();
    Task<FairPriceReferenceDto?> GetFairPriceReferenceAsync(int makeId, int modelId, int year, int? excludeListingId = null);
}
