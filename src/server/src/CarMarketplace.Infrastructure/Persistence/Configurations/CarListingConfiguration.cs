using CarMarketplace.Domain.Common;
using CarMarketplace.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarMarketplace.Infrastructure.Persistence.Configurations;

public class CarListingConfiguration : IEntityTypeConfiguration<CarListing>
{
    public void Configure(EntityTypeBuilder<CarListing> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(ListingConstants.TitleMaxLength);

        builder.Property(x => x.Description)
            .HasMaxLength(ListingConstants.DescriptionMaxLength);

        builder.Property(x => x.Price)
            .HasPrecision(12, 2);

        builder.Property(x => x.City).HasMaxLength(100);
        builder.Property(x => x.Region).HasMaxLength(100);
        builder.Property(x => x.VinNumber).HasMaxLength(17);
        builder.Property(x => x.ExternalSourceId).HasMaxLength(100);
        builder.Property(x => x.ExternalSourceUrl).HasMaxLength(500);
        builder.Property(x => x.ScrapedSellerName).HasMaxLength(200);
        builder.Property(x => x.ScrapedSellerPhone).HasMaxLength(50);

        builder.Property(x => x.FuelType).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.TransmissionType).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.BodyType).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.DriveType).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Color).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Condition).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasOne(x => x.Seller)
            .WithMany(u => u.Listings)
            .HasForeignKey(x => x.SellerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Make)
            .WithMany()
            .HasForeignKey(x => x.MakeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Model)
            .WithMany()
            .HasForeignKey(x => x.ModelId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Features)
            .WithMany(f => f.Listings)
            .UsingEntity("CarListingFeatures");

        builder.HasIndex(x => new { x.MakeId, x.ModelId, x.Year, x.Price });
        builder.HasIndex(x => x.SellerId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => new { x.ExternalSourceId, x.ExternalSourceUrl });

        builder.HasIndex(x => x.Title)
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops");

        builder.HasIndex(x => x.Description)
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops");
    }
}
