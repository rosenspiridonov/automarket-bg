using CarMarketplace.Application.DTOs.Listings;

namespace CarMarketplace.Application.Interfaces;

public interface IFavoriteService
{
    Task<List<CarListingDto>> GetUserFavoritesAsync(string userId);
    Task<bool> ToggleAsync(string userId, int listingId);
    Task<HashSet<int>> GetFavoriteIdsAsync(string userId);
}
