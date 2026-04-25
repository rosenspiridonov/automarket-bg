using CarMarketplace.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarMarketplace.Infrastructure.Persistence.Configurations;

public class PriceHistoryConfiguration : IEntityTypeConfiguration<PriceHistory>
{
    public void Configure(EntityTypeBuilder<PriceHistory> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Price)
            .HasPrecision(12, 2);

        builder.HasOne(x => x.CarListing)
            .WithMany(l => l.PriceHistories)
            .HasForeignKey(x => x.CarListingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CarListingId, x.RecordedAt });
    }
}
