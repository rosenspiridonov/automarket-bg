using CarMarketplace.Application.DTOs.Analytics;
using CarMarketplace.Application.Interfaces;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Infrastructure.Services;

public class MarketAnalyticsService(AppDbContext context) : IMarketAnalyticsService
{
    public async Task<MarketOverviewDto> GetOverviewAsync()
    {
        var activeListings = context.CarListings
            .Where(l => l.Status == ListingStatus.Active);

        var totalListings = await activeListings.CountAsync();

        if (totalListings == 0)
        {
            var makesCount = await context.Makes.CountAsync();
            return new MarketOverviewDto { TotalMakes = makesCount };
        }

        var totalMakes = await activeListings
            .Select(l => l.MakeId)
            .Distinct()
            .CountAsync();

        var avgPrice = await activeListings.AverageAsync(l => l.Price);
        var avgMileage = await activeListings.AverageAsync(l => (double)l.Mileage);
        var avgYear = (int)await activeListings.AverageAsync(l => (double)l.Year);

        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var newLast7 = await activeListings
            .CountAsync(l => l.CreatedAt >= weekAgo);

        return new MarketOverviewDto
        {
            TotalListings = totalListings,
            TotalMakes = totalMakes,
            AveragePrice = Math.Round(avgPrice, 0),
            AverageMileage = Math.Round(avgMileage, 0),
            AverageYear = avgYear,
            NewListingsLast7Days = newLast7
        };
    }

    public async Task<List<PriceByMakeDto>> GetAveragePricesByMakeAsync(int limit = 15)
    {
        return await context.CarListings
            .Where(l => l.Status == ListingStatus.Active)
            .GroupBy(l => new { l.MakeId, l.Make.Name })
            .Select(g => new PriceByMakeDto
            {
                MakeId = g.Key.MakeId,
                MakeName = g.Key.Name,
                AveragePrice = Math.Round(g.Average(l => l.Price), 0),
                MinPrice = g.Min(l => l.Price),
                MaxPrice = g.Max(l => l.Price),
                ListingCount = g.Count()
            })
            .OrderByDescending(x => x.ListingCount)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<PriceTrendPointDto>> GetPriceTrendAsync(int makeId, int? modelId = null)
    {
        var query = context.CarListings
            .Where(l => l.Status == ListingStatus.Active && l.MakeId == makeId);

        if (modelId.HasValue)
            query = query.Where(l => l.ModelId == modelId.Value);

        return await query
            .GroupBy(l => l.Year)
            .Select(g => new PriceTrendPointDto
            {
                Year = g.Key,
                AveragePrice = Math.Round(g.Average(l => l.Price), 0),
                ListingCount = g.Count()
            })
            .OrderBy(x => x.Year)
            .ToListAsync();
    }

    public async Task<List<ListingCountByBodyTypeDto>> GetListingCountsByBodyTypeAsync()
    {
        return await context.CarListings
            .Where(l => l.Status == ListingStatus.Active)
            .GroupBy(l => l.BodyType)
            .Select(g => new ListingCountByBodyTypeDto
            {
                BodyType = g.Key.ToString(),
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();
    }

    public async Task<FairPriceReferenceDto?> GetFairPriceReferenceAsync(int makeId, int modelId, int year, int? excludeListingId = null)
    {
        var yearLow = year - 2;
        var yearHigh = year + 2;

        var query = context.CarListings
            .Where(l => l.Status == ListingStatus.Active
                        && l.MakeId == makeId
                        && l.ModelId == modelId
                        && l.Year >= yearLow
                        && l.Year <= yearHigh);

        if (excludeListingId.HasValue)
            query = query.Where(l => l.Id != excludeListingId.Value);

        var aggregate = await query
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Average = g.Average(l => l.Price),
                Min = g.Min(l => l.Price),
                Max = g.Max(l => l.Price),
                Count = g.Count()
            })
            .FirstOrDefaultAsync();

        if (aggregate == null || aggregate.Count < 3)
            return null;

        return new FairPriceReferenceDto
        {
            AveragePrice = Math.Round(aggregate.Average, 0),
            MinPrice = aggregate.Min,
            MaxPrice = aggregate.Max,
            SampleSize = aggregate.Count
        };
    }
}
