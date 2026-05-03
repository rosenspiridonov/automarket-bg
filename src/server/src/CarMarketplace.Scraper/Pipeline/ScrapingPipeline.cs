using CarMarketplace.Domain.Entities;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Scraper.Configuration;
using CarMarketplace.Scraper.Models;
using CarMarketplace.Scraper.Parsers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CarMarketplace.Scraper.Pipeline;

public class ScrapingPipeline
{
    private readonly AppDbContext _context;
    private readonly ListingNormalizer _normalizer;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEnumerable<IListingParser> _parsers;
    private readonly ILogger<ScrapingPipeline> _logger;
    private readonly ScraperSettings _settings;

    public ScrapingPipeline(
        AppDbContext context,
        ListingNormalizer normalizer,
        UserManager<ApplicationUser> userManager,
        IEnumerable<IListingParser> parsers,
        ILogger<ScrapingPipeline> logger,
        IOptions<ScraperSettings> settings)
    {
        _context = context;
        _normalizer = normalizer;
        _userManager = userManager;
        _parsers = parsers;
        _logger = logger;
        _settings = settings.Value;
    }

    public async Task RunAsync(int maxPagesPerSource = 5, CancellationToken ct = default)
    {
        _logger.LogInformation("=== Starting scraping pipeline ===");

        var systemUser = await EnsureSystemUserAsync();
        var makes = await _context.Makes.Include(m => m.Models).ToListAsync(ct);
        var features = await _context.CarFeatures.ToListAsync(ct);
        _normalizer.LoadMakesAndModels(makes);
        _normalizer.LoadFeatures(features);

        var existingExternalIds = await _context.CarListings
            .Where(l => l.ExternalSourceId != null)
            .Select(l => l.ExternalSourceId!)
            .ToHashSetAsync(ct);

        _logger.LogInformation("Found {Count} existing scraped listings in database", existingExternalIds.Count);

        int totalScraped = 0;
        int totalSaved = 0;
        int totalDuplicates = 0;
        int totalSkipped = 0;

        foreach (var parser in _parsers)
        {
            _logger.LogInformation("--- Running parser: {Source} ---", parser.SourceName);

            try
            {
                var scraped = await parser.ScrapeListingsAsync(maxPagesPerSource, ct);
                totalScraped += scraped.Count;

                _logger.LogInformation("[{Source}] Scraped {Count} raw listings", parser.SourceName, scraped.Count);

                var batch = new List<CarListing>();

                foreach (var item in scraped)
                {
                    if (existingExternalIds.Contains(item.ExternalId))
                    {
                        totalDuplicates++;
                        continue;
                    }

                    var normalized = _normalizer.Normalize(item, systemUser.Id);
                    if (normalized == null)
                    {
                        totalSkipped++;
                        continue;
                    }

                    batch.Add(normalized);
                    existingExternalIds.Add(item.ExternalId);

                    if (batch.Count >= _settings.SaveBatchSize)
                    {
                        await SaveBatchAsync(batch, ct);
                        totalSaved += batch.Count;
                        batch.Clear();
                    }
                }

                if (batch.Count > 0)
                {
                    await SaveBatchAsync(batch, ct);
                    totalSaved += batch.Count;
                }

                _logger.LogInformation("[{Source}] Saved {Count} new listings", parser.SourceName, totalSaved);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Parser {Source} failed", parser.SourceName);
            }
        }

        _logger.LogInformation(
            "=== Pipeline complete: scraped={Scraped}, saved={Saved}, duplicates={Dupes}, skipped={Skipped} ===",
            totalScraped, totalSaved, totalDuplicates, totalSkipped);
    }

    private async Task SaveBatchAsync(List<CarListing> listings, CancellationToken ct)
    {
        _context.CarListings.AddRange(listings);
        await _context.SaveChangesAsync(ct);
        _logger.LogDebug("Saved batch of {Count} listings", listings.Count);
    }

    private async Task<ApplicationUser> EnsureSystemUserAsync()
    {
        var user = await _userManager.FindByEmailAsync(_settings.SystemUser.Email);
        if (user != null) return user;

        if (string.IsNullOrEmpty(_settings.SystemUser.Password))
            throw new InvalidOperationException(
                "Scraper:SystemUser:Password is not configured. Set it via user-secrets or environment variable.");

        user = new ApplicationUser
        {
            Email = _settings.SystemUser.Email,
            UserName = _settings.SystemUser.UserName,
            EmailConfirmed = true,
            FirstName = _settings.SystemUser.FirstName,
            LastName = _settings.SystemUser.LastName,
            City = _settings.SystemUser.City,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, _settings.SystemUser.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to create system user: {errors}");
        }

        _logger.LogInformation("Created system user: {Email}", _settings.SystemUser.Email);
        return user;
    }
}
