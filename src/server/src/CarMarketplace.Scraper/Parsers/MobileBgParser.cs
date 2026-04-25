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
        var formContent = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["act"] = "3",
            ["f1"] = page.ToString(),
            ["f2"] = "1",
            ["f3"] = "1",
            ["f5"] = "",
            ["f6"] = "",
            ["f7"] = "",
            ["f8"] = "",
            ["f9"] = "",
            ["f10"] = "",
            ["f11"] = "",
            ["f12"] = "",
            ["f13"] = "",
            ["f14"] = "",
            ["f15"] = "",
            ["f16"] = "",
            ["f17"] = "",
            ["f18"] = "",
            ["f25"] = "",
        });

        var request = new HttpRequestMessage(HttpMethod.Post, _settings.MobileBgSearchUrl)
        {
            Content = formContent
        };

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var bytes = await response.Content.ReadAsByteArrayAsync(ct);
        var html = Encoding.GetEncoding("windows-1251").GetString(bytes);

        return await ParseSearchResultsAsync(html);
    }

    private async Task<List<ScrapedListing>> ParseSearchResultsAsync(string html)
    {
        var config = AngleSharp.Configuration.Default;
        var context = BrowsingContext.New(config);
        var document = await context.OpenAsync(req => req.Content(html));

        var listings = new List<ScrapedListing>();

        var listingTables = document.QuerySelectorAll("form[name='search'] table.tablereset");

        foreach (var table in listingTables)
        {
            try
            {
                var listing = ParseListingFromTable(table);
                if (listing != null)
                    listings.Add(listing);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[mobile.bg] Failed to parse a listing row");
            }
        }

        if (listings.Count == 0)
        {
            var links = document.QuerySelectorAll("a.mmm");
            foreach (var link in links)
            {
                try
                {
                    var listing = ParseListingFromLink(link);
                    if (listing != null)
                        listings.Add(listing);
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "[mobile.bg] Failed to parse a listing link");
                }
            }
        }

        return listings;
    }

    private ScrapedListing? ParseListingFromTable(IElement table)
    {
        var titleLink = table.QuerySelector("a.mmm");
        if (titleLink == null) return null;

        var href = titleLink.GetAttribute("href") ?? "";
        var title = titleLink.TextContent.Trim();

        if (string.IsNullOrEmpty(title) || title.Length < 3) return null;

        var listing = new ScrapedListing
        {
            Title = title,
            SourceUrl = href.StartsWith("http") ? href : $"{_settings.MobileBgBaseUrl}{href}",
            ExternalId = ExtractIdFromUrl(href),
            Source = SourceName
        };

        var priceElement = table.QuerySelector("span.price, [class*='price'], [class*='Price']");
        if (priceElement != null)
            ParsePrice(priceElement.TextContent, listing);

        // Fallback: extract price from full table text
        if (!listing.Price.HasValue || listing.Price <= 0)
            ParsePrice(table.TextContent, listing);

        var allText = table.TextContent;
        ParseDetailsFromText(allText, listing);

        ParseMakeModelFromTitle(title, listing);

        var img = table.QuerySelector("img[src*='photo']") ?? table.QuerySelector("img.photo");
        if (img != null)
        {
            var src = img.GetAttribute("src") ?? "";
            if (!string.IsNullOrEmpty(src))
            {
                listing.ImageUrls.Add(src.StartsWith("http") ? src : $"{_settings.MobileBgBaseUrl}{src}");
            }
        }

        return listing;
    }

    private ScrapedListing? ParseListingFromLink(IElement link)
    {
        var href = link.GetAttribute("href") ?? "";
        var title = link.TextContent.Trim();

        if (string.IsNullOrEmpty(title) || title.Length < 3) return null;

        var listing = new ScrapedListing
        {
            Title = title,
            SourceUrl = href.StartsWith("http") ? href : $"{_settings.MobileBgBaseUrl}{href}",
            ExternalId = ExtractIdFromUrl(href),
            Source = SourceName
        };

        ParseMakeModelFromTitle(title, listing);

        var parent = link.ParentElement;
        if (parent != null)
        {
            var allText = parent.TextContent;
            ParseDetailsFromText(allText, listing);

            var priceEl = parent.QuerySelector("span.price") ?? parent.QuerySelector(".price, [class*='price']");
            if (priceEl != null)
                ParsePrice(priceEl.TextContent, listing);

            // Fallback: extract price from parent text
            if (!listing.Price.HasValue || listing.Price <= 0)
                ParsePrice(parent.TextContent, listing);
        }

        return listing;
    }

    private static void ParsePrice(string priceText, ScrapedListing listing)
    {
        // Extract only the first price number
        var match = Regex.Match(priceText, @"[\d][\d\s,.\u00a0]*\d");
        if (match.Success)
        {
            var cleaned = match.Value.Replace(",", "").Replace(" ", "").Replace("\u00a0", "");
            if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var price) && price > 0 && price < 100_000_000)
                listing.Price = price;
        }
    }

    private static void ParseDetailsFromText(string text, ScrapedListing listing)
    {
        var yearMatch = Regex.Match(text, @"\b(19[89]\d|20[0-2]\d)\s*г\.?");
        if (yearMatch.Success && int.TryParse(yearMatch.Groups[1].Value, out var year))
            listing.Year = year;

        var kmMatch = Regex.Match(text, @"([\d\s]+)\s*(?:км|km)", RegexOptions.IgnoreCase);
        if (kmMatch.Success)
        {
            var kmStr = kmMatch.Groups[1].Value.Replace(" ", "");
            if (int.TryParse(kmStr, out var km) && km > 0)
                listing.Mileage = km;
        }

        var hpMatch = Regex.Match(text, @"(\d+)\s*(?:к\.с\.|к\.с|hp|к\.)", RegexOptions.IgnoreCase);
        if (hpMatch.Success && int.TryParse(hpMatch.Groups[1].Value, out var hp))
            listing.HorsePower = hp;

        var ccMatch = Regex.Match(text, @"(\d{3,4})\s*(?:куб\.?\s*см|cc|cm3)", RegexOptions.IgnoreCase);
        if (ccMatch.Success && int.TryParse(ccMatch.Groups[1].Value, out var cc))
            listing.EngineDisplacementCc = cc;

        var fuelMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["бензин"] = "Petrol", ["бенз"] = "Petrol",
            ["дизел"] = "Diesel",
            ["газ"] = "LPG", ["метан"] = "CNG",
            ["електро"] = "Electric", ["електри"] = "Electric",
            ["хибрид"] = "Hybrid", ["plug-in"] = "PlugInHybrid",
        };

        foreach (var (keyword, fuelType) in fuelMappings)
        {
            if (text.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                listing.FuelType = fuelType;
                break;
            }
        }

        if (text.Contains("автомат", StringComparison.OrdinalIgnoreCase))
            listing.TransmissionType = "Automatic";
        else if (text.Contains("ръчна", StringComparison.OrdinalIgnoreCase) ||
                 text.Contains("механ", StringComparison.OrdinalIgnoreCase))
            listing.TransmissionType = "Manual";
    }

    private static void ParseMakeModelFromTitle(string title, ScrapedListing listing)
    {
        var parts = title.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 1) listing.MakeName = parts[0];
        if (parts.Length >= 2) listing.ModelName = parts[1];
    }

    private static string ExtractIdFromUrl(string url)
    {
        var match = Regex.Match(url, @"adv=(\d+)");
        if (match.Success) return $"mobilebg_{match.Groups[1].Value}";

        match = Regex.Match(url, @"/(\d+)(?:\?|$|#)");
        if (match.Success) return $"mobilebg_{match.Groups[1].Value}";

        return $"mobilebg_{url.GetHashCode():X}";
    }
}
