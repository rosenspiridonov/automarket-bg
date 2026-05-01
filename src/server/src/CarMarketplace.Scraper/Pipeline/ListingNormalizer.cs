using CarMarketplace.Domain.Common;
using CarMarketplace.Domain.Entities;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Scraper.Models;
using Microsoft.Extensions.Logging;

namespace CarMarketplace.Scraper.Pipeline;

public class ListingNormalizer
{
    private readonly ILogger<ListingNormalizer> _logger;
    private Dictionary<string, Make> _makesByName = new(StringComparer.OrdinalIgnoreCase);
    private Dictionary<string, Dictionary<string, Model>> _modelsByMake = new(StringComparer.OrdinalIgnoreCase);

    public ListingNormalizer(ILogger<ListingNormalizer> logger)
    {
        _logger = logger;
    }

    public void LoadMakesAndModels(List<Make> makes)
    {
        _makesByName = makes.ToDictionary(m => m.Name, m => m, StringComparer.OrdinalIgnoreCase);

        foreach (var make in makes)
        {
            var modelDict = make.Models.ToDictionary(m => m.Name, m => m, StringComparer.OrdinalIgnoreCase);
            _modelsByMake[make.Name] = modelDict;
        }

        _logger.LogInformation("Loaded {MakeCount} makes with models for normalization", makes.Count);
    }

    public CarListing? Normalize(ScrapedListing scraped, string systemUserId)
    {
        if (string.IsNullOrWhiteSpace(scraped.Title)) return null;
        if (!scraped.Price.HasValue || scraped.Price <= 0) return null;
        if (scraped.Price > ListingConstants.PriceMaxValue)
        {
            _logger.LogDebug("Price overflow for: {Title} (price={Price})", scraped.Title, scraped.Price);
            return null;
        }

        var (make, model) = ResolveMakeModel(scraped.MakeName, scraped.ModelName, scraped.Title);
        if (make == null || model == null)
        {
            _logger.LogDebug("Could not resolve make/model for: {Title}", scraped.Title);
            return null;
        }

        var listing = new CarListing
        {
            Title = Truncate(scraped.Title, ListingConstants.TitleMaxLength),
            Description = scraped.Description != null ? Truncate(scraped.Description, ListingConstants.DescriptionMaxLength) : null,
            MakeId = make.Id,
            ModelId = model.Id,
            Year = scraped.Year ?? DateTime.UtcNow.Year,
            Price = scraped.Price.Value,
            Mileage = scraped.Mileage ?? 0,
            FuelType = ParseFuelType(scraped.FuelType),
            TransmissionType = ParseTransmissionType(scraped.TransmissionType),
            BodyType = BodyType.Sedan,
            DriveType = Domain.Enums.DriveType.FWD,
            EngineDisplacementCc = scraped.EngineDisplacementCc,
            HorsePower = scraped.HorsePower,
            Color = ParseColor(scraped.Color),
            Condition = Condition.Used,
            Status = ListingStatus.Active,
            City = scraped.City,
            Region = scraped.Region,
            ExternalSourceId = scraped.ExternalId,
            ExternalSourceUrl = scraped.SourceUrl,
            ScrapedSellerName = scraped.SellerName,
            ScrapedSellerPhone = scraped.SellerPhone,
            SellerId = systemUserId,
            ExpiresAt = DateTime.UtcNow.AddDays(ListingConstants.ScrapedListingExpirationDays)
        };

        if (!string.IsNullOrEmpty(scraped.BodyType))
            listing.BodyType = ParseBodyType(scraped.BodyType);

        if (!string.IsNullOrEmpty(scraped.DriveType))
            listing.DriveType = ParseDriveType(scraped.DriveType);

        // Map image URLs to CarImage entities
        for (int i = 0; i < scraped.ImageUrls.Count; i++)
        {
            var url = scraped.ImageUrls[i];
            if (url.Length > ListingConstants.ImageUrlMaxLength) continue; // skip URLs that exceed column limit

            listing.Images.Add(new CarImage
            {
                Url = url,
                IsPrimary = i == 0,
                SortOrder = i
            });
        }

        return listing;
    }

    private (Make?, Model?) ResolveMakeModel(string? makeName, string? modelName, string title)
    {
        foreach (var (name, make) in _makesByName)
        {
            var matchesMake = (!string.IsNullOrEmpty(makeName) &&
                               name.Equals(makeName, StringComparison.OrdinalIgnoreCase)) ||
                              title.Contains(name, StringComparison.OrdinalIgnoreCase);

            if (!matchesMake) continue;

            if (_modelsByMake.TryGetValue(name, out var models))
            {
                // 1. Exact match on scraped model name
                if (!string.IsNullOrEmpty(modelName) &&
                    models.TryGetValue(modelName, out var exactModel))
                    return (make, exactModel);

                // 2. Title contains the full DB model name — prefer longer names so "C 200" wins over "200"
                foreach (var (mName, model) in models.OrderByDescending(m => m.Key.Length))
                {
                    if (title.Contains(mName, StringComparison.OrdinalIgnoreCase))
                        return (make, model);
                }

                // 3. Scraped model name starts with the first token of a DB model name
                //    e.g. "320i" starts with "3" → "3 Series"; "X5 xDrive" starts with "X5"
                //    Order by first-token length descending so longer tokens win ("30" before "3")
                if (!string.IsNullOrEmpty(modelName))
                {
                    foreach (var (mName, model) in models.OrderByDescending(m => m.Key.Split(' ')[0].Length))
                    {
                        var firstToken = mName.Split(' ')[0];
                        if (firstToken.Length > 0 &&
                            modelName.StartsWith(firstToken, StringComparison.OrdinalIgnoreCase))
                            return (make, model);
                    }
                }
            }

            break;
        }

        return (null, null);
    }

    private static FuelType ParseFuelType(string? value)
    {
        if (string.IsNullOrEmpty(value)) return FuelType.Petrol;

        return value.ToLower() switch
        {
            "petrol" or "бензин" => FuelType.Petrol,
            "diesel" or "дизел" => FuelType.Diesel,
            "electric" or "електро" => FuelType.Electric,
            "hybrid" or "хибрид" => FuelType.Hybrid,
            "pluginhybrid" or "plug-in" => FuelType.PlugInHybrid,
            "lpg" or "газ" => FuelType.LPG,
            _ => Enum.TryParse<FuelType>(value, true, out var parsed) ? parsed : FuelType.Petrol
        };
    }

    private static TransmissionType ParseTransmissionType(string? value)
    {
        if (string.IsNullOrEmpty(value)) return TransmissionType.Manual;

        return value.ToLower() switch
        {
            "automatic" or "автомат" or "автоматична" => TransmissionType.Automatic,
            _ => TransmissionType.Manual
        };
    }

    private static BodyType ParseBodyType(string? value)
    {
        if (string.IsNullOrEmpty(value)) return BodyType.Sedan;

        return value.ToLower() switch
        {
            "sedan" or "седан" => BodyType.Sedan,
            "hatchback" or "хечбек" or "хетчбек" => BodyType.Hatchback,
            "suv" or "джип" => BodyType.SUV,
            "coupe" or "купе" => BodyType.Coupe,
            "wagon" or "комби" => BodyType.Wagon,
            "van" or "ван" => BodyType.Van,
            "convertible" or "кабрио" => BodyType.Convertible,
            _ => BodyType.Sedan
        };
    }

    private static Domain.Enums.DriveType ParseDriveType(string? value)
    {
        if (string.IsNullOrEmpty(value)) return Domain.Enums.DriveType.FWD;

        return value.ToLower() switch
        {
            "awd" or "4x4" or "4wd" => Domain.Enums.DriveType.AWD,
            "rwd" => Domain.Enums.DriveType.RWD,
            _ => Domain.Enums.DriveType.FWD
        };
    }

    private static CarColor ParseColor(string? value)
    {
        if (string.IsNullOrEmpty(value)) return CarColor.Other;
        return Enum.TryParse<CarColor>(value, true, out var parsed) ? parsed : CarColor.Other;
    }

    private static string Truncate(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
