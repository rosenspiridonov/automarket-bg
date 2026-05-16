using CarMarketplace.Scraper.Models;
using CarMarketplace.Scraper.Parsers;

namespace CarMarketplace.Scraper.Tests.Parsers;

public class TitleAndMappingTests
{
    [Theory]
    [InlineData("BMW 320d M-Sport Обява: 11776965170829928", "BMW 320d M-Sport")]
    [InlineData("Audi A3 1.6 TDI  Обява: 11763805869893791", "Audi A3 1.6 TDI")]
    [InlineData("Mercedes-Benz C 220 Обява:12345", "Mercedes-Benz C 220")]
    [InlineData("Toyota Corolla Обява 99999", "Toyota Corolla")]
    public void ListingIdSuffixRegex_RemovesObiavaSuffix(string input, string expected)
    {
        var cleaned = MobileBgParser.ListingIdSuffixRegex.Replace(input, string.Empty).Trim();

        Assert.Equal(expected, cleaned);
    }

    [Fact]
    public void ListingIdSuffixRegex_PreservesTitleWithoutSuffix()
    {
        const string title = "BMW 320d M-Sport HUD Harman Kardon";

        var cleaned = MobileBgParser.ListingIdSuffixRegex.Replace(title, string.Empty).Trim();

        Assert.Equal(title, cleaned);
    }

    [Fact]
    public void ListingIdSuffixRegex_PreservesObiavaInMiddleOfTitle()
    {
        const string title = "BMW Обява 320 special edition";

        var cleaned = MobileBgParser.ListingIdSuffixRegex.Replace(title, string.Empty).Trim();

        Assert.Equal(title, cleaned);
    }

    [Theory]
    [InlineData("BMW 320d", "BMW", "320d")]
    [InlineData("Mercedes-Benz C 220", "Mercedes-Benz", "C")]
    [InlineData("Audi A3 1.6 TDI", "Audi", "A3")]
    [InlineData("Toyota Corolla", "Toyota", "Corolla")]
    public void ParseMakeModelFromTitle_SetsMakeAndModel(string title, string expectedMake, string expectedModel)
    {
        var listing = new ScrapedListing { Title = title };

        MobileBgParser.ParseMakeModelFromTitle(title, listing);

        Assert.Equal(expectedMake, listing.MakeName);
        Assert.Equal(expectedModel, listing.ModelName);
    }

    [Fact]
    public void ParseMakeModelFromTitle_SingleWordTitle_OnlySetsMake()
    {
        var listing = new ScrapedListing { Title = "BMW" };

        MobileBgParser.ParseMakeModelFromTitle("BMW", listing);

        Assert.Equal("BMW", listing.MakeName);
        Assert.Null(listing.ModelName);
    }

    [Theory]
    [InlineData("Бензинов двигател", "Petrol")]
    [InlineData("Дизелов", "Diesel")]
    [InlineData("Електрически", "Electric")]
    [InlineData("Plug-in хибрид", "Hybrid")]
    [InlineData("Газ/Бензин", "Petrol")]
    [InlineData("Метан Газ", "LPG")]
    public void MapFuelType_KnownValues_MapToCanonical(string input, string expected)
    {
        var result = MobileBgParser.MapFuelType(input);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void MapFuelType_UnknownValue_ReturnsInputUnchanged()
    {
        var result = MobileBgParser.MapFuelType("Quantum drive");

        Assert.Equal("Quantum drive", result);
    }

    [Theory]
    [InlineData("Черен", "Black")]
    [InlineData("Бял металик", "White")]
    [InlineData("Сребрист", "Silver")]
    [InlineData("Сив металик", "Silver")]
    [InlineData("Червен", "Red")]
    [InlineData("Тъмно син", "Blue")]
    [InlineData("Зелен", "Green")]
    [InlineData("Кафяв", "Brown")]
    [InlineData("Бежов", "Beige")]
    public void MapColor_KnownValues_MapToCanonical(string input, string expected)
    {
        var result = MobileBgParser.MapColor(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Джип", "SUV")]
    [InlineData("SUV", "SUV")]
    [InlineData("Хечбек", "Hatchback")]
    [InlineData("Хетчбек", "Hatchback")]
    [InlineData("Комби", "Wagon")]
    [InlineData("Купе", "Coupe")]
    [InlineData("Кабрио", "Convertible")]
    [InlineData("Ван", "Van")]
    [InlineData("Миниван", "Van")]
    [InlineData("Седан", "Sedan")]
    public void MapBodyType_KnownValues_MapToCanonical(string input, string expected)
    {
        var result = MobileBgParser.MapBodyType(input);

        Assert.Equal(expected, result);
    }
}
