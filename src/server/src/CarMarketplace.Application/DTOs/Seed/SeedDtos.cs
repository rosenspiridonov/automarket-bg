namespace CarMarketplace.Application.DTOs.Seed;

public sealed record MakeSeedDto(string Name, IReadOnlyList<string> Models);

public sealed record FeatureSeedDto(string Name, string Category);

public sealed record CitySeedDto(string Name, string Oblast);
