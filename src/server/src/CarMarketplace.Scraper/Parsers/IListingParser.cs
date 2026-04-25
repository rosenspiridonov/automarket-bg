using CarMarketplace.Scraper.Models;

namespace CarMarketplace.Scraper.Parsers;

public interface IListingParser
{
    string SourceName { get; }
    Task<List<ScrapedListing>> ScrapeListingsAsync(int maxPages = 5, CancellationToken ct = default);
}
