using CarMarketplace.Domain.Entities;
using CarMarketplace.Domain.Enums;
using CarMarketplace.Infrastructure.Persistence;

namespace CarMarketplace.Application.Tests.Helpers;

public static class SeedHelper
{
    public const string Seller1Id = "seller-1";
    public const string Seller2Id = "seller-2";

    public static void SeedBaseData(AppDbContext context)
    {
        context.Users.AddRange(
            new ApplicationUser
            {
                Id = Seller1Id,
                UserName = "john",
                Email = "john@test.com",
                PhoneNumber = "+359888111111",
                City = "Sofia",
                CreatedAt = DateTime.UtcNow
            },
            new ApplicationUser
            {
                Id = Seller2Id,
                UserName = "maria",
                Email = "maria@test.com",
                PhoneNumber = "+359888222222",
                City = "Plovdiv",
                CreatedAt = DateTime.UtcNow
            }
        );

        context.Makes.AddRange(
            new Make { Id = 1, Name = "BMW" },
            new Make { Id = 2, Name = "Mercedes" }
        );

        context.Models.AddRange(
            new Model { Id = 1, Name = "3 Series", MakeId = 1 },
            new Model { Id = 2, Name = "X5", MakeId = 1 },
            new Model { Id = 3, Name = "C-Class", MakeId = 2 }
        );

        context.SaveChanges();
    }

    public static CarListing CreateListing(
        string sellerId = Seller1Id,
        int makeId = 1,
        int modelId = 1,
        decimal price = 25000m,
        int year = 2022,
        int mileage = 50000,
        FuelType fuelType = FuelType.Diesel,
        TransmissionType transmission = TransmissionType.Automatic,
        BodyType bodyType = BodyType.Sedan,
        ListingStatus status = ListingStatus.Active,
        string? title = null,
        string? city = "Sofia")
    {
        return new CarListing
        {
            Title = title ?? $"Test Car {Random.Shared.Next(10000)}",
            Description = "Test description",
            SellerId = sellerId,
            MakeId = makeId,
            ModelId = modelId,
            Price = price,
            Year = year,
            Mileage = mileage,
            FuelType = fuelType,
            TransmissionType = transmission,
            BodyType = bodyType,
            DriveType = Domain.Enums.DriveType.RWD,
            Color = CarColor.Black,
            Condition = Condition.Used,
            Status = status,
            City = city
        };
    }
}
