using CarMarketplace.Application.Tests.Helpers;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Infrastructure.Services;

namespace CarMarketplace.Application.Tests.Services;

public class FavoriteServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FavoriteService _service;
    private readonly int _listing1Id;
    private readonly int _listing2Id;

    public FavoriteServiceTests()
    {
        _context = TestDbContextFactory.Create();
        _service = new FavoriteService(_context);
        SeedHelper.SeedBaseData(_context);

        var listing1 = SeedHelper.CreateListing(
            title: "BMW 320d", sellerId: SeedHelper.Seller1Id, makeId: 1, modelId: 1);
        var listing2 = SeedHelper.CreateListing(
            title: "Mercedes C220d", sellerId: SeedHelper.Seller2Id, makeId: 2, modelId: 3);

        _context.CarListings.AddRange(listing1, listing2);
        _context.SaveChanges();

        _listing1Id = listing1.Id;
        _listing2Id = listing2.Id;
    }

    [Fact]
    public async Task ToggleAsync_NewFavorite_ReturnsTrue()
    {
        var result = await _service.ToggleAsync(SeedHelper.Seller1Id, _listing2Id);

        Assert.True(result);
        Assert.Single(_context.Favorites);
    }

    [Fact]
    public async Task ToggleAsync_ExistingFavorite_RemovesAndReturnsFalse()
    {
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing1Id);

        var result = await _service.ToggleAsync(SeedHelper.Seller1Id, _listing1Id);

        Assert.False(result);
        Assert.Empty(_context.Favorites);
    }

    [Fact]
    public async Task GetFavoriteIdsAsync_ReturnsCorrectIds()
    {
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing1Id);
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing2Id);

        var ids = await _service.GetFavoriteIdsAsync(SeedHelper.Seller1Id);

        Assert.Equal(2, ids.Count);
        Assert.Contains(_listing1Id, ids);
        Assert.Contains(_listing2Id, ids);
    }

    [Fact]
    public async Task GetFavoriteIdsAsync_DifferentUser_ReturnsEmpty()
    {
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing1Id);

        var ids = await _service.GetFavoriteIdsAsync(SeedHelper.Seller2Id);

        Assert.Empty(ids);
    }

    [Fact]
    public async Task GetUserFavoritesAsync_ReturnsOnlyActiveFavoritedListings()
    {
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing1Id);
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing2Id);

        var favorites = await _service.GetUserFavoritesAsync(SeedHelper.Seller1Id);

        Assert.Equal(2, favorites.Count);
        Assert.All(favorites, f => Assert.Equal("Active", f.Status));
    }

    [Fact]
    public async Task GetUserFavoritesAsync_ExcludesSoldListings()
    {
        var soldListing = SeedHelper.CreateListing(
            title: "Sold Car", status: ListingStatus.Sold, makeId: 1, modelId: 1);
        _context.CarListings.Add(soldListing);
        _context.SaveChanges();

        await _service.ToggleAsync(SeedHelper.Seller1Id, soldListing.Id);
        await _service.ToggleAsync(SeedHelper.Seller1Id, _listing1Id);

        var favorites = await _service.GetUserFavoritesAsync(SeedHelper.Seller1Id);

        Assert.Single(favorites);
        Assert.Equal(_listing1Id, favorites[0].Id);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
