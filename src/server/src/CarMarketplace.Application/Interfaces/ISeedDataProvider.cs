using CarMarketplace.Application.DTOs.Seed;

namespace CarMarketplace.Application.Interfaces;

public interface ISeedDataProvider
{
    IReadOnlyList<MakeSeedDto> GetMakes();
    IReadOnlyList<FeatureSeedDto> GetFeatures();
    IReadOnlyList<CitySeedDto> GetCities();
}
