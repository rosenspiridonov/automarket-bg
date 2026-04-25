using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class Make : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }

    public ICollection<Model> Models { get; set; } = [];
}
