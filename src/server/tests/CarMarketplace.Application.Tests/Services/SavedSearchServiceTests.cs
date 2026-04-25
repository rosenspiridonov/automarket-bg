using CarMarketplace.Application.DTOs.SavedSearches;
using CarMarketplace.Application.Tests.Helpers;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Infrastructure.Services;

namespace CarMarketplace.Application.Tests.Services;

public class SavedSearchServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly SavedSearchService _service;

    public SavedSearchServiceTests()
    {
        _context = TestDbContextFactory.Create();
        _service = new SavedSearchService(_context);
        SeedHelper.SeedBaseData(_context);
    }

    [Fact]
    public async Task CreateAsync_ReturnsNewId()
    {
        var request = new CreateSavedSearchRequest
        {
            Name = "Diesel BMWs",
            FilterJson = "{\"makeId\":1,\"fuelType\":\"Diesel\"}"
        };

        var id = await _service.CreateAsync(SeedHelper.Seller1Id, request);

        Assert.True(id > 0);
        var saved = _context.SavedSearches.Find(id);
        Assert.NotNull(saved);
        Assert.Equal("Diesel BMWs", saved.Name);
        Assert.Equal(SeedHelper.Seller1Id, saved.UserId);
    }

    [Fact]
    public async Task GetByUserAsync_ReturnsUserSearchesOrderedByDate()
    {
        await _service.CreateAsync(SeedHelper.Seller1Id, new CreateSavedSearchRequest
        {
            Name = "First",
            FilterJson = "{}"
        });
        await _service.CreateAsync(SeedHelper.Seller1Id, new CreateSavedSearchRequest
        {
            Name = "Second",
            FilterJson = "{}"
        });
        await _service.CreateAsync(SeedHelper.Seller2Id, new CreateSavedSearchRequest
        {
            Name = "Other User",
            FilterJson = "{}"
        });

        var searches = await _service.GetByUserAsync(SeedHelper.Seller1Id);

        Assert.Equal(2, searches.Count);
        Assert.True(searches[0].CreatedAt >= searches[1].CreatedAt);
    }

    [Fact]
    public async Task DeleteAsync_OwnSearch_RemovesIt()
    {
        var id = await _service.CreateAsync(SeedHelper.Seller1Id, new CreateSavedSearchRequest
        {
            Name = "To Delete",
            FilterJson = "{}"
        });

        await _service.DeleteAsync(id, SeedHelper.Seller1Id);

        Assert.Null(_context.SavedSearches.Find(id));
    }

    [Fact]
    public async Task DeleteAsync_OtherUsersSearch_ThrowsUnauthorized()
    {
        var id = await _service.CreateAsync(SeedHelper.Seller1Id, new CreateSavedSearchRequest
        {
            Name = "Protected",
            FilterJson = "{}"
        });

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteAsync(id, SeedHelper.Seller2Id));
    }

    [Fact]
    public async Task DeleteAsync_NonexistentSearch_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.DeleteAsync(99999, SeedHelper.Seller1Id));
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
