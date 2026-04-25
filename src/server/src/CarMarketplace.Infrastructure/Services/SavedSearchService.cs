using CarMarketplace.Application.DTOs.SavedSearches;
using CarMarketplace.Application.Interfaces;
using CarMarketplace.Domain.Entities;
using CarMarketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Infrastructure.Services;

public class SavedSearchService(AppDbContext context) : ISavedSearchService
{
    public async Task<List<SavedSearchDto>> GetByUserAsync(string userId)
    {
        return await context.SavedSearches
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SavedSearchDto
            {
                Id = s.Id,
                Name = s.Name,
                FilterJson = s.FilterJson,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<int> CreateAsync(string userId, CreateSavedSearchRequest request)
    {
        var savedSearch = new SavedSearch
        {
            Name = request.Name,
            FilterJson = request.FilterJson,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        context.SavedSearches.Add(savedSearch);
        await context.SaveChangesAsync();
        return savedSearch.Id;
    }

    public async Task DeleteAsync(int id, string userId)
    {
        var savedSearch = await context.SavedSearches.FindAsync(id);

        if (savedSearch == null)
            throw new KeyNotFoundException("Saved search not found.");

        if (savedSearch.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own saved searches.");

        context.SavedSearches.Remove(savedSearch);
        await context.SaveChangesAsync();
    }
}
