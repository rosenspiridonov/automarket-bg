using System.Reflection;
using System.Text.Json;
using CarMarketplace.Application.DTOs.Seed;
using CarMarketplace.Application.Interfaces;

namespace CarMarketplace.Infrastructure.Persistence.Seed;

public sealed class JsonSeedDataProvider : ISeedDataProvider
{
    private const string ResourceNamespace = "CarMarketplace.Infrastructure.Persistence.Seed.Data";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly Lazy<IReadOnlyList<MakeSeedDto>> _makes =
        new(() => Load<MakeSeedDto>("makes.json"));

    private readonly Lazy<IReadOnlyList<FeatureSeedDto>> _features =
        new(() => Load<FeatureSeedDto>("features.json"));

    private readonly Lazy<IReadOnlyList<CitySeedDto>> _cities =
        new(() => Load<CitySeedDto>("cities-bg.json"));

    public IReadOnlyList<MakeSeedDto> GetMakes() => _makes.Value;

    public IReadOnlyList<FeatureSeedDto> GetFeatures() => _features.Value;

    public IReadOnlyList<CitySeedDto> GetCities() => _cities.Value;

    private static List<T> Load<T>(string fileName)
    {
        var resourceName = $"{ResourceNamespace}.{fileName}";
        var assembly = typeof(JsonSeedDataProvider).Assembly;

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Embedded seed resource '{resourceName}' not found. Check that the file is marked as <EmbeddedResource> in the .csproj.");

        var items = JsonSerializer.Deserialize<List<T>>(stream, JsonOptions);
        return items ?? throw new InvalidOperationException(
            $"Failed to deserialize seed data from '{fileName}'.");
    }
}
