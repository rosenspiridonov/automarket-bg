using CarMarketplace.Application.Common;
using CarMarketplace.Application.DTOs.Listings;
using CarMarketplace.Application.Interfaces;
using CarMarketplace.Application.Tests.Helpers;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace CarMarketplace.Application.Tests.Services;

public class CarListingServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly CarListingService _service;

    public CarListingServiceTests()
    {
        _context = TestDbContextFactory.Create();
        var imageStorageMock = new Mock<IImageStorageService>();
        var analyticsService = new MarketAnalyticsService(_context);
        _service = new CarListingService(_context, imageStorageMock.Object, NullLogger<CarListingService>.Instance, analyticsService);
        SeedTestData();
    }

    private void SeedTestData()
    {
        SeedHelper.SeedBaseData(_context);

        _context.CarListings.AddRange(
            SeedHelper.CreateListing(
                title: "BMW 320d", makeId: 1, modelId: 1,
                price: 30000, year: 2022, fuelType: FuelType.Diesel,
                bodyType: BodyType.Sedan, sellerId: SeedHelper.Seller1Id),
            SeedHelper.CreateListing(
                title: "BMW X5 M50d", makeId: 1, modelId: 2,
                price: 55000, year: 2023, fuelType: FuelType.Petrol,
                bodyType: BodyType.SUV, sellerId: SeedHelper.Seller1Id),
            SeedHelper.CreateListing(
                title: "Mercedes C220d", makeId: 2, modelId: 3,
                price: 40000, year: 2021, fuelType: FuelType.Diesel,
                bodyType: BodyType.Sedan, sellerId: SeedHelper.Seller2Id),
            SeedHelper.CreateListing(
                title: "Sold Mercedes", makeId: 2, modelId: 3,
                price: 35000, year: 2020, fuelType: FuelType.Hybrid,
                bodyType: BodyType.Sedan, sellerId: SeedHelper.Seller2Id,
                status: ListingStatus.Sold)
        );
        _context.SaveChanges();
    }

    [Fact]
    public async Task SearchAsync_NoFilters_ReturnsOnlyActiveListings()
    {
        var filter = new SearchFilter { Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(3, result.Items.Count);
    }

    [Fact]
    public async Task SearchAsync_FilterByMake_ReturnsMatching()
    {
        var filter = new SearchFilter { MakeId = 1, Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal(1, item.MakeId));
    }

    [Fact]
    public async Task SearchAsync_FilterByModel_ReturnsMatching()
    {
        var filter = new SearchFilter { MakeId = 2, ModelId = 3, Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        Assert.Single(result.Items);
        Assert.Equal("C-Class", result.Items[0].ModelName);
    }

    [Fact]
    public async Task SearchAsync_FilterByPriceRange_ReturnsWithinRange()
    {
        var filter = new SearchFilter { PriceFrom = 35000, PriceTo = 50000, Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        Assert.All(result.Items, item =>
        {
            Assert.True(item.Price >= 35000);
            Assert.True(item.Price <= 50000);
        });
    }

    [Fact]
    public async Task SearchAsync_FilterByYearRange_ReturnsWithinRange()
    {
        var filter = new SearchFilter { YearFrom = 2022, YearTo = 2023, Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        Assert.All(result.Items, item =>
        {
            Assert.True(item.Year >= 2022);
            Assert.True(item.Year <= 2023);
        });
    }

    [Fact]
    public async Task SearchAsync_FilterByFuelType_ReturnsMatching()
    {
        var filter = new SearchFilter { FuelType = "Diesel", Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal("Diesel", item.FuelType));
    }

    [Fact]
    public async Task SearchAsync_SortByPriceAscending_ReturnsSorted()
    {
        var filter = new SearchFilter { SortBy = ListingSortOrder.PriceAsc, Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        var prices = result.Items.Select(i => i.Price).ToList();
        Assert.Equal(prices.OrderBy(p => p), prices);
    }

    [Fact]
    public async Task SearchAsync_SortByPriceDescending_ReturnsSorted()
    {
        var filter = new SearchFilter { SortBy = ListingSortOrder.PriceDesc, Page = 1, PageSize = 20 };

        var result = await _service.SearchAsync(filter);

        var prices = result.Items.Select(i => i.Price).ToList();
        Assert.Equal(prices.OrderByDescending(p => p), prices);
    }

    [Fact]
    public async Task SearchAsync_Pagination_ReturnsCorrectPage()
    {
        var filter = new SearchFilter { Page = 1, PageSize = 2, SortBy = ListingSortOrder.PriceAsc };

        var result = await _service.SearchAsync(filter);

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(2, result.PageSize);
    }

    [Fact]
    public async Task SearchAsync_SecondPage_ReturnsRemaining()
    {
        var filter = new SearchFilter { Page = 2, PageSize = 2, SortBy = ListingSortOrder.PriceAsc };

        var result = await _service.SearchAsync(filter);

        Assert.Equal(3, result.TotalCount);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task GetByIdAsync_ExistingListing_ReturnsFullDetails()
    {
        var allListings = _context.CarListings.ToList();
        var targetId = allListings.First(l => l.Status == ListingStatus.Active).Id;

        var detail = await _service.GetByIdAsync(targetId);

        Assert.NotNull(detail);
        Assert.Equal(targetId, detail.Id);
        Assert.NotEmpty(detail.MakeName);
        Assert.NotEmpty(detail.ModelName);
        Assert.NotEmpty(detail.SellerName);
    }

    [Fact]
    public async Task GetByIdAsync_NonexistentId_ReturnsNull()
    {
        var result = await _service.GetByIdAsync(99999);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_CreatesListingAndPriceHistory()
    {
        var request = new CreateListingRequest
        {
            Title = "New BMW 530d",
            Description = "Brand new",
            MakeId = 1,
            ModelId = 1,
            Year = 2024,
            Price = 65000m,
            Mileage = 0,
            FuelType = "Diesel",
            TransmissionType = "Automatic",
            BodyType = "Sedan",
            DriveType = "RWD",
            Color = "Black",
            Condition = "New",
            City = "Sofia"
        };

        var id = await _service.CreateAsync(SeedHelper.Seller1Id, request);

        var listing = _context.CarListings.Find(id);
        Assert.NotNull(listing);
        Assert.Equal("New BMW 530d", listing.Title);
        Assert.Equal(65000m, listing.Price);
        Assert.Equal(ListingStatus.Active, listing.Status);

        var priceHistory = _context.PriceHistories.Where(p => p.CarListingId == id).ToList();
        Assert.Single(priceHistory);
        Assert.Equal(65000m, priceHistory[0].Price);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesProperties()
    {
        var listingId = _context.CarListings
            .First(l => l.SellerId == SeedHelper.Seller1Id && l.Status == ListingStatus.Active).Id;

        var request = new UpdateListingRequest
        {
            Title = "Updated Title",
            City = "Plovdiv",
            Mileage = 60000
        };

        await _service.UpdateAsync(listingId, SeedHelper.Seller1Id, request);

        var updated = _context.CarListings.Find(listingId)!;
        Assert.Equal("Updated Title", updated.Title);
        Assert.Equal("Plovdiv", updated.City);
        Assert.Equal(60000, updated.Mileage);
    }

    [Fact]
    public async Task UpdateAsync_PriceChange_TracksPriceHistory()
    {
        var listingId = _context.CarListings
            .First(l => l.SellerId == SeedHelper.Seller1Id && l.Status == ListingStatus.Active).Id;

        var request = new UpdateListingRequest { Price = 28000m };

        await _service.UpdateAsync(listingId, SeedHelper.Seller1Id, request);

        var history = _context.PriceHistories
            .Where(p => p.CarListingId == listingId)
            .OrderByDescending(p => p.RecordedAt)
            .First();
        Assert.Equal(28000m, history.Price);
    }

    [Fact]
    public async Task UpdateAsync_WrongOwner_ThrowsUnauthorized()
    {
        var listingId = _context.CarListings
            .First(l => l.SellerId == SeedHelper.Seller1Id).Id;

        var request = new UpdateListingRequest { Title = "Hijacked" };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateAsync(listingId, SeedHelper.Seller2Id, request));
    }

    [Fact]
    public async Task UpdateAsync_NonexistentListing_ThrowsNotFound()
    {
        var request = new UpdateListingRequest { Title = "Ghost" };

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.UpdateAsync(99999, SeedHelper.Seller1Id, request));
    }

    [Fact]
    public async Task DeleteAsync_OwnListing_RemovesIt()
    {
        var listingId = _context.CarListings
            .First(l => l.SellerId == SeedHelper.Seller1Id).Id;

        await _service.DeleteAsync(listingId, SeedHelper.Seller1Id);

        Assert.Null(_context.CarListings.Find(listingId));
    }

    [Fact]
    public async Task DeleteAsync_WrongOwner_ThrowsUnauthorized()
    {
        var listingId = _context.CarListings
            .First(l => l.SellerId == SeedHelper.Seller1Id).Id;

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteAsync(listingId, SeedHelper.Seller2Id));
    }

    [Fact]
    public async Task DeleteAsync_NonexistentListing_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.DeleteAsync(99999, SeedHelper.Seller1Id));
    }

    [Fact]
    public async Task GetFeaturedAsync_ReturnsRequestedCount()
    {
        var featured = await _service.GetFeaturedAsync(2);

        Assert.Equal(2, featured.Count);
    }

    [Fact]
    public async Task GetBySellerAsync_ReturnsOnlySellerListings()
    {
        var listings = await _service.GetBySellerAsync(SeedHelper.Seller1Id);

        Assert.Equal(2, listings.Count);
        Assert.All(listings, l => Assert.Equal(SeedHelper.Seller1Id, l.SellerId));
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
