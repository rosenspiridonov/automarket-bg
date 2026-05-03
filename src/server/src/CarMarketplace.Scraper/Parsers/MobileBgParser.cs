using System.Text;
using System.Text.RegularExpressions;
using AngleSharp;
using AngleSharp.Dom;
using CarMarketplace.Scraper.Configuration;
using CarMarketplace.Scraper.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CarMarketplace.Scraper.Parsers;

public class MobileBgParser : IListingParser
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MobileBgParser> _logger;
    private readonly ScraperSettings _settings;

    public string SourceName => "mobile.bg";

    public MobileBgParser(HttpClient httpClient, ILogger<MobileBgParser> logger, IOptions<ScraperSettings> settings)
    {
        _httpClient = httpClient;
        _logger = logger;
        _settings = settings.Value;
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public async Task<List<ScrapedListing>> ScrapeListingsAsync(int maxPages = 5, CancellationToken ct = default)
    {
        var allListings = new List<ScrapedListing>();

        for (int page = 1; page <= maxPages; page++)
        {
            ct.ThrowIfCancellationRequested();

            _logger.LogInformation("[mobile.bg] Scraping page {Page}/{MaxPages}...", page, maxPages);

            try
            {
                var listings = await ScrapeSearchPageAsync(page, ct);

                if (listings.Count == 0)
                {
                    _logger.LogInformation("[mobile.bg] No more listings found at page {Page}. Stopping.", page);
                    break;
                }

                allListings.AddRange(listings);
                _logger.LogInformation("[mobile.bg] Page {Page}: found {Count} listings (total: {Total})",
                    page, listings.Count, allListings.Count);

                await Task.Delay(Random.Shared.Next(_settings.PageDelay.MinMs, _settings.PageDelay.MaxMs), ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "[mobile.bg] Failed to scrape page {Page}", page);
            }
        }

        return allListings;
    }

    private async Task<List<ScrapedListing>> ScrapeSearchPageAsync(int page, CancellationToken ct)
    {
        // mobile.bg redesigned — CGI GET with query params still works
        var url = $"{_settings.MobileBgSearchUrl}?act=3&f1={page}&f2=1&f3=1";

        var response = await _httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var bytes = await response.Content.ReadAsByteArrayAsync(ct);

        // Detect encoding from Content-Type; fall back to windows-1251 (legacy mobile.bg default)
        var charSet = response.Content.Headers.ContentType?.CharSet;
        var encoding = string.Equals(charSet, "utf-8", StringComparison.OrdinalIgnoreCase)
            ? Encoding.UTF8
            : Encoding.GetEncoding("windows-1251");

        var html = encoding.GetString(bytes);
        return await ParseSearchResultsAsync(html);
    }

    private async Task<List<ScrapedListing>> ParseSearchResultsAsync(string html)
    {
        var config = AngleSharp.Configuration.Default;
        var context = BrowsingContext.New(config);
        var document = await context.OpenAsync(req => req.Content(html));

        var listings = new List<ScrapedListing>();
        var seen = new HashSet<string>();

        // New mobile.bg structure: listing links follow /obiava-{ID}-{slug}
        var links = document.QuerySelectorAll("a[href*='obiava-']");

        foreach (var link in links)
        {
            try
            {
                var listing = ParseListingFromLink(link, seen);
                if (listing != null)
                    listings.Add(listing);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[mobile.bg] Failed to parse listing link");
            }
        }

        if (listings.Count == 0)
        {
            // Fallback: extract all /obiava- URLs directly from raw HTML via regex
            listings = ParseListingsFromRawHtml(html, seen);
        }

        return listings;
    }

    private ScrapedListing? ParseListingFromLink(IElement link, HashSet<string> seen)
    {
        var href = link.GetAttribute("href") ?? "";
        var idMatch = Regex.Match(href, @"obiava-(\d+)-");
        if (!idMatch.Success) return null;

        var externalId = $"mobilebg_{idMatch.Groups[1].Value}";
        if (!seen.Add(externalId)) return null;

        var title = link.TextContent.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length < 3) return null;

        // Skip navigation/pager links that contain only numbers
        if (Regex.IsMatch(title, @"^\d+$")) return null;

        var fullUrl = NormalizeUrl(href);

        var listing = new ScrapedListing
        {
            Title = title,
            SourceUrl = fullUrl,
            ExternalId = externalId,
            Source = SourceName
        };

        ParseMakeModelFromTitle(title, listing);

        // Walk up the DOM to find price and spec details in the card container
        var container = FindContainer(link);
        if (container != null)
        {
            var text = container.TextContent;
            ParsePrice(text, listing);
            ParseDetailsFromText(text, listing);

            // Thumbnail image
            var img = container.QuerySelector("img[src*='photo'], img[data-src*='photo'], img[src*='mobistatic']");
            if (img != null)
            {
                var src = img.GetAttribute("src") ?? img.GetAttribute("data-src") ?? "";
                if (!string.IsNullOrEmpty(src))
                    listing.ImageUrls.Add(NormalizeUrl(src));
            }
        }

        return listing;
    }

    private static IElement? FindContainer(IElement link)
    {
        // Walk up max 5 levels to find a container with meaningful content
        var el = link.ParentElement;
        for (int i = 0; i < 5 && el != null; i++)
        {
            var text = el.TextContent;
            // Container likely has price (digit sequences) and year
            if (Regex.IsMatch(text, @"\d{4}") && Regex.IsMatch(text, @"\d[\d\s,.\u00a0]+(?:лв|EUR|€|\$)"))
                return el;
            el = el.ParentElement;
        }
        return link.ParentElement;
    }

    private List<ScrapedListing> ParseListingsFromRawHtml(string html, HashSet<string> seen)
    {
        var listings = new List<ScrapedListing>();

        // Extract all obiava URLs from raw HTML as regex fallback
        var matches = Regex.Matches(html, @"href=""(//www\.mobile\.bg/obiava-(\d+)-([^""]+))""");
        foreach (Match m in matches)
        {
            var externalId = $"mobilebg_{m.Groups[2].Value}";
            if (!seen.Add(externalId)) continue;

            var href = m.Groups[1].Value;
            var slug = m.Groups[3].Value;
            var title = SlugToTitle(slug);

            if (string.IsNullOrWhiteSpace(title) || title.Length < 3) continue;

            var listing = new ScrapedListing
            {
                Title = title,
                SourceUrl = NormalizeUrl(href),
                ExternalId = externalId,
                Source = SourceName
            };

            ParseMakeModelFromTitle(title, listing);
            listings.Add(listing);
        }

        return listings;
    }

    private static string SlugToTitle(string slug)
    {
        // "bmw-730-d-4x4-face-executive" → "BMW 730 d 4x4 face executive"
        // Capitalize only the first word (make)
        var parts = slug.Split('-', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return string.Empty;
        parts[0] = parts[0].ToUpper();
        return string.Join(" ", parts);
    }

    private string NormalizeUrl(string url)
    {
        if (url.StartsWith("//")) return $"https:{url}";
        if (url.StartsWith("http")) return url;
        return $"{_settings.MobileBgBaseUrl}{url}";
    }

    private static void ParsePrice(string priceText, ScrapedListing listing)
    {
        if (listing.Price.HasValue) return;

        // Match price patterns: "22 900 лв", "22900 €", "22 900 EUR"
        var match = Regex.Match(priceText,
            @"([\d][\d\s\u00a0,]*\d)\s*(?:лв|EUR|€|\$)",
            RegexOptions.IgnoreCase);
        if (!match.Success)
            match = Regex.Match(priceText, @"([\d][\d\s\u00a0]{2,}[\d])");

        if (match.Success)
        {
            var cleaned = Regex.Replace(match.Groups[1].Value, @"[\s\u00a0,]", "");
            if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var price)
                && price > 100 && price < 100_000_000)
                listing.Price = price;
        }
    }

    private static void ParseDetailsFromText(string text, ScrapedListing listing)
    {
        if (!listing.Year.HasValue)
        {
            var yearMatch = Regex.Match(text, @"\b(19[89]\d|20[0-2]\d)\s*г?\.?");
            if (yearMatch.Success && int.TryParse(yearMatch.Groups[1].Value, out var year))
                listing.Year = year;
        }

        if (!listing.Mileage.HasValue)
        {
            var kmMatch = Regex.Match(text, @"([\d][\d\s\u00a0]*)\s*(?:км|km)", RegexOptions.IgnoreCase);
            if (kmMatch.Success)
            {
                var kmStr = Regex.Replace(kmMatch.Groups[1].Value, @"[\s\u00a0]", "");
                if (int.TryParse(kmStr, out var km) && km > 0 && km < 2_000_000)
                    listing.Mileage = km;
            }
        }

        if (!listing.HorsePower.HasValue)
        {
            var hpMatch = Regex.Match(text, @"(\d{2,4})\s*(?:к\.?\s*с\.?|кс|hp)", RegexOptions.IgnoreCase);
            if (hpMatch.Success && int.TryParse(hpMatch.Groups[1].Value, out var hp) && hp is >= 10 and <= 2000)
                listing.HorsePower = hp;
        }

        if (string.IsNullOrEmpty(listing.FuelType))
        {
            var fuelMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["бензин"] = "Petrol", ["бенз"] = "Petrol",
                ["дизел"] = "Diesel",
                ["газ"] = "LPG",
                ["електро"] = "Electric", ["електри"] = "Electric",
                ["хибрид"] = "Hybrid",
                ["plug-in"] = "PlugInHybrid",
            };

            foreach (var (keyword, fuelType) in fuelMappings)
            {
                if (text.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    listing.FuelType = fuelType;
                    break;
                }
            }
        }

        if (string.IsNullOrEmpty(listing.TransmissionType))
        {
            if (text.Contains("автомат", StringComparison.OrdinalIgnoreCase))
                listing.TransmissionType = "Automatic";
            else if (text.Contains("ръчна", StringComparison.OrdinalIgnoreCase) ||
                     text.Contains("механ", StringComparison.OrdinalIgnoreCase))
                listing.TransmissionType = "Manual";
        }
    }

    private static void ParseMakeModelFromTitle(string title, ScrapedListing listing)
    {
        var parts = title.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 1) listing.MakeName = parts[0];
        if (parts.Length >= 2) listing.ModelName = parts[1];
    }

    private static string ExtractIdFromUrl(string url)
    {
        var match = Regex.Match(url, @"obiava-(\d+)-");
        if (match.Success) return $"mobilebg_{match.Groups[1].Value}";

        match = Regex.Match(url, @"adv=(\d+)");
        if (match.Success) return $"mobilebg_{match.Groups[1].Value}";

        return $"mobilebg_{url.GetHashCode():X}";
    }
}
