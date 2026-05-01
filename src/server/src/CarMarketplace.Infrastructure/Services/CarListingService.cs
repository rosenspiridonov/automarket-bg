using CarMarketplace.Application.Common;
using CarMarketplace.Application.DTOs.Listings;
using CarMarketplace.Application.Interfaces;
using CarMarketplace.Domain.Common;
using CarMarketplace.Domain.Entities;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CarMarketplace.Infrastructure.Services;

public class CarListingService(
    AppDbContext context,
    IImageStorageService imageStorage,
    ILogger<CarListingService> logger,
    IMarketAnalyticsService analytics) : ICarListingService
{
    private static bool TryParseEnum<T>(string? value, out T result) where T : struct, Enum
    {
        if (!string.IsNullOrWhiteSpace(value) && Enum.TryParse<T>(value, ignoreCase: true, out var parsed))
        {
            result = parsed;
            return true;
        }
        result = default;
        return false;
    }

    public async Task<PagedResult<CarListingDto>> SearchAsync(SearchFilter filter)
    {
        var query = context.CarListings
            .Where(l => l.Status == ListingStatus.Active);

        if (filter.MakeId.HasValue)
            query = query.Where(l => l.MakeId == filter.MakeId);

        if (filter.ModelId.HasValue)
            query = query.Where(l => l.ModelId == filter.ModelId);

        if (filter.YearFrom.HasValue)
            query = query.Where(l => l.Year >= filter.YearFrom);

        if (filter.YearTo.HasValue)
            query = query.Where(l => l.Year <= filter.YearTo);

        if (filter.PriceFrom.HasValue)
            query = query.Where(l => l.Price >= filter.PriceFrom);

        if (filter.PriceTo.HasValue)
            query = query.Where(l => l.Price <= filter.PriceTo);

        if (TryParseEnum<FuelType>(filter.FuelType, out var fuel))
            query = query.Where(l => l.FuelType == fuel);

        if (TryParseEnum<TransmissionType>(filter.TransmissionType, out var transmission))
            query = query.Where(l => l.TransmissionType == transmission);

        if (TryParseEnum<BodyType>(filter.BodyType, out var body))
            query = query.Where(l => l.BodyType == body);

        if (TryParseEnum<Domain.Enums.DriveType>(filter.DriveType, out var drive))
            query = query.Where(l => l.DriveType == drive);

        if (TryParseEnum<CarColor>(filter.Color, out var color))
            query = query.Where(l => l.Color == color);

        if (TryParseEnum<Condition>(filter.Condition, out var condition))
            query = query.Where(l => l.Condition == condition);

        if (!string.IsNullOrEmpty(filter.City))
            query = query.Where(l => l.City != null && l.City.Contains(filter.City));

        if (!string.IsNullOrEmpty(filter.Query))
        {
            var pattern = $"%{filter.Query}%";
            query = query.Where(l =>
                EF.Functions.ILike(l.Title, pattern) ||
                (l.Description != null && EF.Functions.ILike(l.Description, pattern)) ||
                EF.Functions.ILike(l.Make.Name, pattern) ||
                EF.Functions.ILike(l.Model.Name, pattern));
        }

        query = filter.SortBy switch
        {
            ListingSortOrder.PriceAsc => query.OrderBy(l => l.Price),
            ListingSortOrder.PriceDesc => query.OrderByDescending(l => l.Price),
            ListingSortOrder.YearDesc => query.OrderByDescending(l => l.Year),
            ListingSortOrder.YearAsc => query.OrderBy(l => l.Year),
            ListingSortOrder.MileageAsc => query.OrderBy(l => l.Mileage),
            _ => query.OrderByDescending(l => l.CreatedAt)
        };

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(ListingProjections.ToListDto)
            .ToListAsync();

        return new PagedResult<CarListingDto>
        {
            Items = items,
            Page = filter.Page,
            PageSize = filter.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<CarListingDetailDto?> GetByIdAsync(int id)
    {
        var listing = await context.CarListings
            .Include(l => l.Make)
            .Include(l => l.Model)
            .Include(l => l.Images.OrderBy(i => i.SortOrder))
            .Include(l => l.Features)
            .Include(l => l.Seller)
            .Include(l => l.PriceHistories.OrderBy(p => p.RecordedAt))
            .FirstOrDefaultAsync(l => l.Id == id);

        if (listing == null)
            return null;

        var fairPriceRef = await analytics.GetFairPriceReferenceAsync(listing.MakeId, listing.ModelId, listing.Year, listing.Id);
        FairPriceAnalysisDto? fairPriceAnalysis = null;
        if (fairPriceRef is not null)
        {
            var pct = (listing.Price - fairPriceRef.AveragePrice) / fairPriceRef.AveragePrice * 100m;
            var position = pct < -7m ? "below" : pct > 7m ? "above" : "average";
            fairPriceAnalysis = new FairPriceAnalysisDto
            {
                MarketAveragePrice = fairPriceRef.AveragePrice,
                PercentDifference = Math.Round(pct, 1),
                Position = position,
                SampleSize = fairPriceRef.SampleSize
            };
        }

        return new CarListingDetailDto
        {
            Id = listing.Id,
            Title = listing.Title,
            Description = listing.Description,
            MakeId = listing.MakeId,
            MakeName = listing.Make.Name,
            ModelId = listing.ModelId,
            ModelName = listing.Model.Name,
            Year = listing.Year,
            Price = listing.Price,
            Mileage = listing.Mileage,
            FuelType = listing.FuelType.ToString(),
            TransmissionType = listing.TransmissionType.ToString(),
            BodyType = listing.BodyType.ToString(),
            DriveType = listing.DriveType.ToString(),
            EngineDisplacementCc = listing.EngineDisplacementCc,
            HorsePower = listing.HorsePower,
            Color = listing.Color.ToString(),
            Condition = listing.Condition.ToString(),
            Status = listing.Status.ToString(),
            City = listing.City,
            Region = listing.Region,
            VinNumber = listing.VinNumber,
            PrimaryImageUrl = (listing.Images.FirstOrDefault(i => i.IsPrimary) ?? listing.Images.FirstOrDefault())?.Url,
            ImageCount = listing.Images.Count,
            SellerId = listing.SellerId,
            SellerName = listing.ExternalSourceUrl != null
                ? listing.ScrapedSellerName ?? string.Empty
                : listing.Seller.UserName ?? string.Empty,
            SellerPhone = listing.ExternalSourceUrl != null
                ? listing.ScrapedSellerPhone
                : listing.Seller.PhoneNumber,
            SellerEmail = listing.ExternalSourceUrl != null ? null : listing.Seller.Email,
            SellerCity = listing.ExternalSourceUrl != null ? null : listing.Seller.City,
            SellerMemberSince = listing.ExternalSourceUrl != null ? null : listing.Seller.CreatedAt,
            ExternalSourceUrl = listing.ExternalSourceUrl,
            ExternalSource = listing.ExternalSourceUrl != null
                ? new Uri(listing.ExternalSourceUrl).Host.Replace("www.", string.Empty)
                : null,
            CreatedAt = listing.CreatedAt,
            Images = listing.Images.Select(i => new CarImageDto
            {
                Id = i.Id,
                Url = i.Url,
                IsPrimary = i.IsPrimary,
                SortOrder = i.SortOrder
            }).ToList(),
            Features = listing.Features.Select(f => new CarFeatureDto
            {
                Id = f.Id,
                Name = f.Name,
                Category = f.Category
            }).ToList(),
            PriceHistory = listing.PriceHistories.Select(p => new PriceHistoryPointDto
            {
                Price = p.Price,
                RecordedAt = p.RecordedAt
            }).ToList(),
            FairPriceAnalysis = fairPriceAnalysis
        };
    }

    public async Task<int> CreateAsync(string sellerId, CreateListingRequest request)
    {
        if (!TryParseEnum<FuelType>(request.FuelType, out var fuelType))
            throw new ArgumentException($"Invalid fuel type: {request.FuelType}", nameof(request.FuelType));
        if (!TryParseEnum<TransmissionType>(request.TransmissionType, out var transmissionType))
            throw new ArgumentException($"Invalid transmission type: {request.TransmissionType}", nameof(request.TransmissionType));
        if (!TryParseEnum<BodyType>(request.BodyType, out var bodyType))
            throw new ArgumentException($"Invalid body type: {request.BodyType}", nameof(request.BodyType));
        if (!TryParseEnum<Domain.Enums.DriveType>(request.DriveType, out var driveType))
            throw new ArgumentException($"Invalid drive type: {request.DriveType}", nameof(request.DriveType));
        if (!TryParseEnum<CarColor>(request.Color, out var color))
            throw new ArgumentException($"Invalid color: {request.Color}", nameof(request.Color));
        if (!TryParseEnum<Condition>(request.Condition, out var condition))
            throw new ArgumentException($"Invalid condition: {request.Condition}", nameof(request.Condition));

        var listing = new CarListing
        {
            Title = request.Title,
            Description = request.Description,
            MakeId = request.MakeId,
            ModelId = request.ModelId,
            Year = request.Year,
            Price = request.Price,
            Mileage = request.Mileage,
            FuelType = fuelType,
            TransmissionType = transmissionType,
            BodyType = bodyType,
            DriveType = driveType,
            EngineDisplacementCc = request.EngineDisplacementCc,
            HorsePower = request.HorsePower,
            Color = color,
            Condition = condition,
            Status = ListingStatus.Active,
            City = request.City,
            Region = request.Region,
            VinNumber = request.VinNumber,
            SellerId = sellerId,
            ExpiresAt = DateTime.UtcNow.AddDays(ListingConstants.UserListingExpirationDays)
        };

        if (request.FeatureIds.Count > 0)
        {
            var features = await context.CarFeatures
                .Where(f => request.FeatureIds.Contains(f.Id))
                .ToListAsync();
            listing.Features = features;
        }

        listing.PriceHistories.Add(new PriceHistory
        {
            Price = listing.Price,
            RecordedAt = DateTime.UtcNow
        });

        context.CarListings.Add(listing);
        await context.SaveChangesAsync();

        return listing.Id;
    }

    public async Task UpdateAsync(int id, string userId, UpdateListingRequest request)
    {
        var listing = await context.CarListings
            .Include(l => l.Features)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (listing == null)
            throw new KeyNotFoundException("Listing not found.");

        if (listing.SellerId != userId)
            throw new UnauthorizedAccessException("You can only edit your own listings.");

        if (request.Title != null) listing.Title = request.Title;
        if (request.Description != null) listing.Description = request.Description;
        if (request.City != null) listing.City = request.City;
        if (request.Region != null) listing.Region = request.Region;
        if (request.Mileage.HasValue) listing.Mileage = request.Mileage.Value;

        if (request.Status != null)
        {
            if (!TryParseEnum<ListingStatus>(request.Status, out var status))
                throw new ArgumentException($"Invalid status: {request.Status}", nameof(request.Status));
            listing.Status = status;
        }

        if (request.Price.HasValue && request.Price.Value != listing.Price)
        {
            context.PriceHistories.Add(new PriceHistory
            {
                CarListingId = listing.Id,
                Price = request.Price.Value,
                RecordedAt = DateTime.UtcNow
            });
            listing.Price = request.Price.Value;
        }


        if (request.FeatureIds != null)
        {
            listing.Features.Clear();
            var features = await context.CarFeatures
                .Where(f => request.FeatureIds.Contains(f.Id))
                .ToListAsync();
            listing.Features = features;
        }

        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id, string userId)
    {
        var listing = await context.CarListings.FindAsync(id);

        if (listing == null)
            throw new KeyNotFoundException("Listing not found.");

        if (listing.SellerId != userId)
            throw new UnauthorizedAccessException("You can only delete your own listings.");

        context.CarListings.Remove(listing);
        await context.SaveChangesAsync();
    }

    public async Task<List<CarListingDto>> GetFeaturedAsync(int count = 8)
    {
        return await context.CarListings
            .Where(l => l.Status == ListingStatus.Active)
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .Select(ListingProjections.ToListDto)
            .ToListAsync();
    }

    public async Task<List<CarListingDto>> GetBySellerAsync(string sellerId)
    {
        return await context.CarListings
            .Where(l => l.SellerId == sellerId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(ListingProjections.ToListDto)
            .ToListAsync();
    }

    public async Task AddImagesAsync(int listingId, string userId, List<ListingImageUpload> images)
    {
        var listing = await context.CarListings
            .Include(l => l.Images)
            .FirstOrDefaultAsync(l => l.Id == listingId);

        if (listing == null)
            throw new KeyNotFoundException("Listing not found.");

        if (listing.SellerId != userId)
            throw new UnauthorizedAccessException("You can only add images to your own listings.");

        var currentCount = listing.Images.Count;
        List<string> uploadedPublicIds = [];

        try
        {
            foreach (var image in images)
            {
                var result = await imageStorage.UploadAsync(image.Stream, image.FileName);
                if (!string.IsNullOrEmpty(result.PublicId))
                    uploadedPublicIds.Add(result.PublicId);

                listing.Images.Add(new CarImage
                {
                    Url = result.Url,
                    PublicId = result.PublicId,
                    IsPrimary = currentCount == 0,
                    SortOrder = currentCount,
                    CarListingId = listingId
                });
                currentCount++;
            }

            await context.SaveChangesAsync();
        }
        catch
        {
            foreach (var publicId in uploadedPublicIds)
            {
                try { await imageStorage.DeleteAsync(publicId); }
                catch (Exception ex)
                {
                    logger.LogWarning(ex,
                        "Failed to delete orphaned image {PublicId} during compensation for listing {ListingId}",
                        publicId, listingId);
                }
            }
            throw;
        }
    }

    public async Task DeleteImageAsync(int listingId, int imageId, string userId)
    {
        var listing = await context.CarListings
            .Include(l => l.Images)
            .FirstOrDefaultAsync(l => l.Id == listingId);

        if (listing == null)
            throw new KeyNotFoundException("Listing not found.");

        if (listing.SellerId != userId)
            throw new UnauthorizedAccessException("You can only delete images from your own listings.");

        var image = listing.Images.FirstOrDefault(i => i.Id == imageId);
        if (image == null)
            throw new KeyNotFoundException("Image not found.");

        context.CarImages.Remove(image);
        await context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(image.PublicId))
        {
            try
            {
                await imageStorage.DeleteAsync(image.PublicId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Failed to delete image {PublicId} from storage after DB removal (listing {ListingId}, image {ImageId}). Possible orphan.",
                    image.PublicId, listingId, imageId);
            }
        }
    }

}

internal static class ListingProjections
{
    public static readonly System.Linq.Expressions.Expression<Func<CarListing, CarListingDto>> ToListDto = l => new CarListingDto
    {
        Id = l.Id,
        Title = l.Title,
        Description = l.Description,
        MakeId = l.MakeId,
        MakeName = l.Make.Name,
        ModelId = l.ModelId,
        ModelName = l.Model.Name,
        Year = l.Year,
        Price = l.Price,
        Mileage = l.Mileage,
        FuelType = l.FuelType.ToString(),
        TransmissionType = l.TransmissionType.ToString(),
        BodyType = l.BodyType.ToString(),
        DriveType = l.DriveType.ToString(),
        EngineDisplacementCc = l.EngineDisplacementCc,
        HorsePower = l.HorsePower,
        Color = l.Color.ToString(),
        Condition = l.Condition.ToString(),
        Status = l.Status.ToString(),
        City = l.City,
        Region = l.Region,
        PrimaryImageUrl = l.Images
            .OrderByDescending(i => i.IsPrimary)
            .ThenBy(i => i.SortOrder)
            .Select(i => i.Url)
            .FirstOrDefault(),
        ImageCount = l.Images.Count,
        SellerId = l.SellerId,
        SellerName = l.ExternalSourceUrl != null
            ? l.ScrapedSellerName ?? string.Empty
            : l.Seller.UserName ?? string.Empty,
        SellerPhone = l.ExternalSourceUrl != null ? l.ScrapedSellerPhone : l.Seller.PhoneNumber,
        CreatedAt = l.CreatedAt
    };
}
