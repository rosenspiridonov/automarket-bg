using CarMarketplace.Application.Common;
using CarMarketplace.Application.DTOs.Listings;

namespace CarMarketplace.Application.Interfaces;

public interface ICarListingService
{
    Task<PagedResult<CarListingDto>> SearchAsync(SearchFilter filter);
    Task<CarListingDetailDto?> GetByIdAsync(int id);
    Task<int> CreateAsync(string sellerId, CreateListingRequest request);
    Task UpdateAsync(int id, string userId, UpdateListingRequest request);
    Task DeleteAsync(int id, string userId);
    Task<List<CarListingDto>> GetFeaturedAsync(int count = 8);
    Task<List<CarListingDto>> GetBySellerAsync(string sellerId);
    Task AddImagesAsync(int listingId, string userId, List<ListingImageUpload> images);
    Task DeleteImageAsync(int listingId, int imageId, string userId);
}

public class ListingImageUpload
{
    public Stream Stream { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
}
