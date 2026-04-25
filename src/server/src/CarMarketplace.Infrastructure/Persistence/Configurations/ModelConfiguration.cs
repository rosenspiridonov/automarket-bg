using CarMarketplace.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarMarketplace.Infrastructure.Persistence.Configurations;

public class ModelConfiguration : IEntityTypeConfiguration<Model>
{
    public void Configure(EntityTypeBuilder<Model> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasOne(x => x.Make)
            .WithMany(m => m.Models)
            .HasForeignKey(x => x.MakeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.MakeId, x.Name }).IsUnique();
    }
}
