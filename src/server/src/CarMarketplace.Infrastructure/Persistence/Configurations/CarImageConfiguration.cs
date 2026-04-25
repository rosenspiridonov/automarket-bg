using CarMarketplace.Domain.Common;
using CarMarketplace.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarMarketplace.Infrastructure.Persistence.Configurations;

public class CarImageConfiguration : IEntityTypeConfiguration<CarImage>
{
    public void Configure(EntityTypeBuilder<CarImage> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Url)
            .IsRequired()
            .HasMaxLength(ListingConstants.ImageUrlMaxLength);

        builder.Property(x => x.PublicId)
            .HasMaxLength(200);

        builder.HasOne(x => x.CarListing)
            .WithMany(l => l.Images)
            .HasForeignKey(x => x.CarListingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
