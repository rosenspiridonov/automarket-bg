using CarMarketplace.Application.Tests.Helpers;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Infrastructure.Services;

namespace CarMarketplace.Application.Tests.Services;

public class MarketAnalyticsServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly MarketAnalyticsService _service;

    public MarketAnalyticsServiceTests()
    {
        _context = TestDbContextFactory.Create();
        _service = new MarketAnalyticsService(_context);
        SeedHelper.SeedBaseData(_context);
    }

    [Fact]
    public async Task GetOverviewAsync_EmptyDatabase_ReturnsZeroListings()
    {
        var overview = await _service.GetOverviewAsync();

        Assert.Equal(0, overview.TotalListings);
        Assert.Equal(2, overview.TotalMakes);
    }

    [Fact]
    public async Task GetOverviewAsync_WithListings_ReturnsCorrectStats()
    {
        SeedListings();

        var overview = await _service.GetOverviewAsync();

        Assert.Equal(3, overview.TotalListings);
        Assert.Equal(2, overview.TotalMakes);
        Assert.True(overview.AveragePrice > 0);
        Assert.True(overview.AverageMileage > 0);
        Assert.True(overview.AverageYear >= 2020);
    }

    [Fact]
    public async Task GetAveragePricesByMakeAsync_GroupsByMake()
    {
        SeedListings();

        var pricesByMake = await _service.GetAveragePricesByMakeAsync();

        Assert.Equal(2, pricesByMake.Count);

        var bmw = pricesByMake.First(p => p.MakeName == "BMW");
        Assert.Equal(2, bmw.ListingCount);
        Assert.Equal(42500, bmw.AveragePrice);
        Assert.Equal(30000, bmw.MinPrice);
        Assert.Equal(55000, bmw.MaxPrice);
    }

    [Fact]
    public async Task GetPriceTrendAsync_GroupsByYear()
    {
        SeedListings();

        var trend = await _service.GetPriceTrendAsync(makeId: 1);

        Assert.Equal(2, trend.Count);
        Assert.Equal(trend.OrderBy(t => t.Year), trend);
    }

    [Fact]
    public async Task GetPriceTrendAsync_WithModel_FiltersCorrectly()
    {
        SeedListings();

        var trend = await _service.GetPriceTrendAsync(makeId: 1, modelId: 1);

        Assert.Single(trend);
        Assert.Equal(2022, trend[0].Year);
    }

    [Fact]
    public async Task GetListingCountsByBodyTypeAsync_GroupsByBodyType()
    {
        SeedListings();

        var counts = await _service.GetListingCountsByBodyTypeAsync();

        Assert.Equal(2, counts.Count);

        var sedanCount = counts.First(c => c.BodyType == "Sedan");
        Assert.Equal(2, sedanCount.Count);

        var suvCount = counts.First(c => c.BodyType == "SUV");
        Assert.Equal(1, suvCount.Count);
    }

    [Fact]
    public async Task GetAveragePricesByMakeAsync_RespectsLimit()
    {
        SeedListings();

        var result = await _service.GetAveragePricesByMakeAsync(limit: 1);

        Assert.Single(result);
    }

    [Fact]
    public async Task GetListingCountsByBodyTypeAsync_ExcludesSoldListings()
    {
        SeedListings();

        var soldListing = SeedHelper.CreateListing(
            title: "Sold Wagon", makeId: 1, modelId: 1,
            bodyType: BodyType.Wagon, status: ListingStatus.Sold);
        _context.CarListings.Add(soldListing);
        _context.SaveChanges();

        var counts = await _service.GetListingCountsByBodyTypeAsync();

        Assert.DoesNotContain(counts, c => c.BodyType == "Wagon");
    }

    private void SeedListings()
    {
        _context.CarListings.AddRange(
            SeedHelper.CreateListing(
                title: "BMW 320d", makeId: 1, modelId: 1,
                price: 30000, year: 2022, fuelType: FuelType.Diesel,
                bodyType: BodyType.Sedan),
            SeedHelper.CreateListing(
                title: "BMW X5", makeId: 1, modelId: 2,
                price: 55000, year: 2023, fuelType: FuelType.Petrol,
                bodyType: BodyType.SUV),
            SeedHelper.CreateListing(
                title: "Mercedes C220d", makeId: 2, modelId: 3,
                price: 40000, year: 2021, fuelType: FuelType.Diesel,
                bodyType: BodyType.Sedan)
        );
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
