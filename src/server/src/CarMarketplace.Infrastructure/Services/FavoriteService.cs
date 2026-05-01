using CarMarketplace.Application.DTOs.Listings;
using CarMarketplace.Application.Interfaces;
using CarMarketplace.Domain.Entities;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Infrastructure.Services;

public class FavoriteService(AppDbContext context) : IFavoriteService
{
    public async Task<List<CarListingDto>> GetUserFavoritesAsync(string userId)
    {
        return await context.Favorites
            .Where(f => f.UserId == userId)
            .Include(f => f.CarListing)
                .ThenInclude(l => l.Make)
            .Include(f => f.CarListing)
                .ThenInclude(l => l.Model)
            .Include(f => f.CarListing)
                .ThenInclude(l => l.Images)
            .Include(f => f.CarListing)
                .ThenInclude(l => l.Seller)
            .Where(f => f.CarListing.Status == ListingStatus.Active)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new CarListingDto
            {
                Id = f.CarListing.Id,
                Title = f.CarListing.Title,
                Description = f.CarListing.Description,
                MakeId = f.CarListing.MakeId,
                MakeName = f.CarListing.Make.Name,
                ModelId = f.CarListing.ModelId,
                ModelName = f.CarListing.Model.Name,
                Year = f.CarListing.Year,
                Price = f.CarListing.Price,
                Mileage = f.CarListing.Mileage,
                FuelType = f.CarListing.FuelType.ToString(),
                TransmissionType = f.CarListing.TransmissionType.ToString(),
                BodyType = f.CarListing.BodyType.ToString(),
                DriveType = f.CarListing.DriveType.ToString(),
                EngineDisplacementCc = f.CarListing.EngineDisplacementCc,
                HorsePower = f.CarListing.HorsePower,
                Color = f.CarListing.Color.ToString(),
                Condition = f.CarListing.Condition.ToString(),
                Status = f.CarListing.Status.ToString(),
                City = f.CarListing.City,
                Region = f.CarListing.Region,
                PrimaryImageUrl = f.CarListing.Images
                    .Where(i => i.IsPrimary).Select(i => i.Url).FirstOrDefault()
                    ?? f.CarListing.Images.Select(i => i.Url).FirstOrDefault(),
                ImageCount = f.CarListing.Images.Count,
                SellerId = f.CarListing.SellerId,
                SellerName = f.CarListing.ExternalSourceUrl != null
                    ? f.CarListing.ScrapedSellerName ?? string.Empty
                    : f.CarListing.Seller.UserName ?? string.Empty,
                SellerPhone = f.CarListing.ExternalSourceUrl != null
                    ? f.CarListing.ScrapedSellerPhone
                    : f.CarListing.Seller.PhoneNumber,
                CreatedAt = f.CarListing.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<bool> ToggleAsync(string userId, int listingId)
    {
        var existing = await context.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.CarListingId == listingId);

        if (existing != null)
        {
            context.Favorites.Remove(existing);
            await context.SaveChangesAsync();
            return false;
        }

        context.Favorites.Add(new Favorite
        {
            UserId = userId,
            CarListingId = listingId,
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<HashSet<int>> GetFavoriteIdsAsync(string userId)
    {
        var ids = await context.Favorites
            .Where(f => f.UserId == userId)
            .Select(f => f.CarListingId)
            .ToListAsync();

        return ids.ToHashSet();
    }
}
