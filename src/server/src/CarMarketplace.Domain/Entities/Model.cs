using CarMarketplace.Domain.Common;

namespace CarMarketplace.Domain.Entities;

public class Model : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int MakeId { get; set; }

    public Make Make { get; set; } = null!;
}
