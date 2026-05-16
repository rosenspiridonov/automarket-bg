using CarMarketplace.Domain.Entities;
using CarMarketplace.Scraper.Models;
using CarMarketplace.Scraper.Pipeline;
using Microsoft.Extensions.Logging.Abstractions;

namespace CarMarketplace.Scraper.Tests.Pipeline;

public class ListingNormalizerTests
{
    private const string SystemUserId = "system-user";

    private static ListingNormalizer CreateNormalizer(
        IEnumerable<Make>? makes = null,
        IEnumerable<CarFeature>? features = null)
    {
        var normalizer = new ListingNormalizer(NullLogger<ListingNormalizer>.Instance);
        normalizer.LoadMakesAndModels(makes?.ToList() ?? DefaultMakes());
        normalizer.LoadFeatures(features?.ToList() ?? new List<CarFeature>());
        return normalizer;
    }

    private static List<Make> DefaultMakes()
    {
        var bmw = new Make { Id = 1, Name = "BMW" };
        bmw.Models = new List<Model>
        {
            new() { Id = 11, Name = "320i", MakeId = 1, Make = bmw },
            new() { Id = 12, Name = "320d", MakeId = 1, Make = bmw },
            new() { Id = 13, Name = "X5", MakeId = 1, Make = bmw },
        };

        var mercedes = new Make { Id = 2, Name = "Mercedes-Benz" };
        mercedes.Models = new List<Model>
        {
            new() { Id = 21, Name = "C 200", MakeId = 2, Make = mercedes },
            new() { Id = 22, Name = "C 220", MakeId = 2, Make = mercedes },
            new() { Id = 23, Name = "E 320", MakeId = 2, Make = mercedes },
        };

        return new List<Make> { bmw, mercedes };
    }

    private static ScrapedListing ValidListing(string title = "BMW 320d 2018") => new()
    {
        Title = title,
        ExternalId = "test_1",
        SourceUrl = "https://example.com/test",
        Source = "test",
        Price = 15_000m,
    };

    [Fact]
    public void Normalize_MissingTitle_ReturnsNull()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();
        scraped.Title = string.Empty;

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.Null(result);
    }

    [Fact]
    public void Normalize_MissingPrice_ReturnsNull()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();
        scraped.Price = null;

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.Null(result);
    }

    [Fact]
    public void Normalize_NonNegativePriceRequired()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();
        scraped.Price = 0;

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.Null(result);
    }

    [Fact]
    public void Normalize_UnknownMake_ReturnsNull()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing(title: "Lada Niva 1990");
        scraped.MakeName = "Lada";

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.Null(result);
    }

    [Fact]
    public void Normalize_ExactMakeAndModel_ResolvesCorrectly()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();
        scraped.MakeName = "BMW";
        scraped.ModelName = "320d";

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal(1, result!.MakeId);
        Assert.Equal(12, result.ModelId);
    }

    [Fact]
    public void Normalize_TitleContainsModelName_ResolvesViaTitle()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing(title: "Mercedes-Benz C 220 d AMG");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal(2, result!.MakeId);
        Assert.Equal(22, result.ModelId);
    }

    [Fact]
    public void Normalize_TitleContainsLongerModel_PrefersLongerMatch()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing(title: "Mercedes-Benz C 220 d AMG");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal(22, result!.ModelId);
    }

    [Fact]
    public void Normalize_ModelStartsWithFirstToken_ResolvesViaPrefix()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing(title: "BMW some unusual variant");
        scraped.MakeName = "BMW";
        scraped.ModelName = "320iA xDrive";

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal(11, result!.ModelId);
    }

    [Fact]
    public void Normalize_DefaultsYearToCurrentWhenMissing()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal(DateTime.UtcNow.Year, result!.Year);
    }

    [Fact]
    public void Normalize_DefaultsMileageToZeroWhenMissing()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal(0, result!.Mileage);
    }

    [Fact]
    public void Normalize_PreservesExternalSourceMetadata()
    {
        var normalizer = CreateNormalizer();
        var scraped = ValidListing();
        scraped.ExternalId = "mobilebg_123";
        scraped.SourceUrl = "https://www.mobile.bg/obiava-123";
        scraped.SellerName = "Dealer";
        scraped.SellerPhone = "0888123456";

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Equal("mobilebg_123", result!.ExternalSourceId);
        Assert.Equal("https://www.mobile.bg/obiava-123", result.ExternalSourceUrl);
        Assert.Equal("Dealer", result.ScrapedSellerName);
        Assert.Equal("0888123456", result.ScrapedSellerPhone);
    }

    [Fact]
    public void MapFeatures_ExactNameMatch_LinksFeature()
    {
        var feature = new CarFeature { Id = 1, Name = "Климатроник", Category = "Комфорт" };
        var normalizer = CreateNormalizer(features: new[] { feature });
        var scraped = ValidListing();
        scraped.ExtractedFeatures.Add("Климатроник");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Contains(feature, result!.Features);
    }

    [Fact]
    public void MapFeatures_AliasedAbbreviation_ResolvesToCanonical()
    {
        var canonical = new CarFeature { Id = 1, Name = "Електрически стъкла", Category = "Комфорт" };
        var normalizer = CreateNormalizer(features: new[] { canonical });
        var scraped = ValidListing();
        scraped.ExtractedFeatures.Add("Ел.стъкла");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Contains(canonical, result!.Features);
    }

    [Fact]
    public void MapFeatures_LongPhrase_ResolvesToAbbreviation()
    {
        var canonical = new CarFeature { Id = 1, Name = "ABS", Category = "Безопасност" };
        var normalizer = CreateNormalizer(features: new[] { canonical });
        var scraped = ValidListing();
        scraped.ExtractedFeatures.Add("Антиблокираща система");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Contains(canonical, result!.Features);
    }

    [Fact]
    public void MapFeatures_PrefixMatch_LinksBothFrontAndRear()
    {
        var parkFront = new CarFeature { Id = 1, Name = "Парктроник предна", Category = "Технологии" };
        var parkRear = new CarFeature { Id = 2, Name = "Парктроник задна", Category = "Технологии" };
        var normalizer = CreateNormalizer(features: new[] { parkFront, parkRear });
        var scraped = ValidListing();
        scraped.ExtractedFeatures.Add("Парктроник");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Contains(parkFront, result!.Features);
        Assert.Contains(parkRear, result.Features);
    }

    [Fact]
    public void MapFeatures_SlashSplit_LinksEachPart()
    {
        var carPlay = new CarFeature { Id = 1, Name = "Apple CarPlay", Category = "Технологии" };
        var androidAuto = new CarFeature { Id = 2, Name = "Android Auto", Category = "Технологии" };
        var normalizer = CreateNormalizer(features: new[] { carPlay, androidAuto });
        var scraped = ValidListing();
        scraped.ExtractedFeatures.Add("Apple CarPlay / Android Auto");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Contains(carPlay, result!.Features);
        Assert.Contains(androidAuto, result.Features);
    }

    [Fact]
    public void MapFeatures_UnknownString_DoesNotCrash()
    {
        var feature = new CarFeature { Id = 1, Name = "Климатроник", Category = "Комфорт" };
        var normalizer = CreateNormalizer(features: new[] { feature });
        var scraped = ValidListing();
        scraped.ExtractedFeatures.Add("Some completely unknown feature");

        var result = normalizer.Normalize(scraped, SystemUserId);

        Assert.NotNull(result);
        Assert.Empty(result!.Features);
    }
}
