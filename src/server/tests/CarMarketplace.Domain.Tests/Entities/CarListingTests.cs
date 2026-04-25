using CarMarketplace.Domain.Entities;
using CarMarketplace.Domain.Enums;

namespace CarMarketplace.Domain.Tests.Entities;

public class CarListingTests
{
    [Fact]
    public void NewCarListing_HasExpectedDefaults()
    {
        var listing = new CarListing();

        Assert.Equal(string.Empty, listing.Title);
        Assert.Null(listing.Description);
        Assert.Equal(string.Empty, listing.SellerId);
        Assert.Empty(listing.Images);
        Assert.Empty(listing.Features);
        Assert.Empty(listing.PriceHistories);
    }

    [Fact]
    public void CarListing_PropertiesCanBeSet()
    {
        var listing = new CarListing
        {
            Title = "BMW 320d Sport",
            Description = "Well maintained",
            Year = 2022,
            Price = 35000m,
            Mileage = 45000,
            MakeId = 1,
            ModelId = 2,
            FuelType = FuelType.Diesel,
            TransmissionType = TransmissionType.Automatic,
            BodyType = BodyType.Sedan,
            DriveType = Enums.DriveType.RWD,
            EngineDisplacementCc = 1995,
            HorsePower = 190,
            Color = CarColor.Black,
            Condition = Condition.Used,
            Status = ListingStatus.Active,
            City = "Sofia",
            Region = "Sofia-City",
            VinNumber = "WBA12345678901234",
            SellerId = "user-1"
        };

        Assert.Equal("BMW 320d Sport", listing.Title);
        Assert.Equal(2022, listing.Year);
        Assert.Equal(35000m, listing.Price);
        Assert.Equal(FuelType.Diesel, listing.FuelType);
        Assert.Equal(TransmissionType.Automatic, listing.TransmissionType);
        Assert.Equal(BodyType.Sedan, listing.BodyType);
        Assert.Equal(1995, listing.EngineDisplacementCc);
        Assert.Equal(190, listing.HorsePower);
        Assert.Equal(ListingStatus.Active, listing.Status);
    }

    [Fact]
    public void CarListing_NavigationCollections_CanAddItems()
    {
        var listing = new CarListing();

        listing.Images.Add(new CarImage { Url = "https://example.com/img.jpg", IsPrimary = true });
        listing.Features.Add(new CarFeature { Name = "Leather", Category = "Interior" });
        listing.PriceHistories.Add(new PriceHistory { Price = 30000m, RecordedAt = DateTime.UtcNow });

        Assert.Single(listing.Images);
        Assert.Single(listing.Features);
        Assert.Single(listing.PriceHistories);
    }

    [Fact]
    public void PriceHistory_TracksListingAssociation()
    {
        var history = new PriceHistory
        {
            Price = 28000m,
            RecordedAt = new DateTime(2024, 6, 15, 0, 0, 0, DateTimeKind.Utc),
            CarListingId = 42
        };

        Assert.Equal(28000m, history.Price);
        Assert.Equal(42, history.CarListingId);
    }

    [Fact]
    public void Favorite_LinksBetweenUserAndListing()
    {
        var favorite = new Favorite
        {
            UserId = "user-1",
            CarListingId = 10,
            CreatedAt = DateTime.UtcNow
        };

        Assert.Equal("user-1", favorite.UserId);
        Assert.Equal(10, favorite.CarListingId);
    }

    [Fact]
    public void SavedSearch_StoresFilterAsJson()
    {
        var search = new SavedSearch
        {
            Name = "Diesel SUVs",
            FilterJson = "{\"fuelType\":\"Diesel\",\"bodyType\":\"SUV\"}",
            UserId = "user-1",
            CreatedAt = DateTime.UtcNow
        };

        Assert.Equal("Diesel SUVs", search.Name);
        Assert.Contains("Diesel", search.FilterJson);
    }
}
