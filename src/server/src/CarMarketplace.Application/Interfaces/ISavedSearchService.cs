using CarMarketplace.Application.DTOs.SavedSearches;

namespace CarMarketplace.Application.Interfaces;

public interface ISavedSearchService
{
    Task<List<SavedSearchDto>> GetByUserAsync(string userId);
    Task<int> CreateAsync(string userId, CreateSavedSearchRequest request);
    Task DeleteAsync(int id, string userId);
}
