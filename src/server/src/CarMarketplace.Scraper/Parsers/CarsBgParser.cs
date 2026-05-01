using System.Text.RegularExpressions;
using AngleSharp;
using AngleSharp.Dom;
using CarMarketplace.Scraper.Configuration;
using CarMarketplace.Scraper.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CarMarketplace.Scraper.Parsers;

public class CarsBgParser : IListingParser
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CarsBgParser> _logger;
    private readonly ScraperSettings _settings;

    public string SourceName => "cars.bg";

    public CarsBgParser(HttpClient httpClient, ILogger<CarsBgParser> logger, IOptions<ScraperSettings> settings)
    {
        _httpClient = httpClient;
        _logger = logger;
        _settings = settings.Value;
    }

    public async Task<List<ScrapedListing>> ScrapeListingsAsync(int maxPages = 5, CancellationToken ct = default)
    {
        var allListings = new List<ScrapedListing>();

        for (int page = 1; page <= maxPages; page++)
        {
            ct.ThrowIfCancellationRequested();

            _logger.LogInformation("[cars.bg] Scraping page {Page}/{MaxPages}...", page, maxPages);

            try
            {
                var listings = await ScrapeSearchPageAsync(page, ct);

                if (listings.Count == 0)
                {
                    _logger.LogInformation("[cars.bg] No more listings found at page {Page}. Stopping.", page);
                    break;
                }

                allListings.AddRange(listings);
                _logger.LogInformation("[cars.bg] Page {Page}: found {Count} listings (total: {Total})",
                    page, listings.Count, allListings.Count);

                await Task.Delay(Random.Shared.Next(_settings.PageDelay.MinMs, _settings.PageDelay.MaxMs), ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "[cars.bg] Failed to scrape page {Page}", page);
            }
        }

        _logger.LogInformation("[cars.bg] Enriching {Count} listings with detail page data...", allListings.Count);
        foreach (var listing in allListings)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await EnrichFromDetailPageAsync(listing, ct);
                await Task.Delay(Random.Shared.Next(_settings.DetailDelay.MinMs, _settings.DetailDelay.MaxMs), ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogDebug(ex, "[cars.bg] Failed to enrich listing: {Title}", listing.Title);
            }
        }

        return allListings;
    }

    private async Task<List<ScrapedListing>> ScrapeSearchPageAsync(int page, CancellationToken ct)
    {
        var url = $"{_settings.CarsBgBaseUrl.TrimEnd('/')}/carslist.php?page={page}";

        var response = await _httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var html = await response.Content.ReadAsStringAsync(ct);
        return await ParseSearchResultsAsync(html);
    }

    private async Task<List<ScrapedListing>> ParseSearchResultsAsync(string html)
    {
        var config = AngleSharp.Configuration.Default;
        var context = BrowsingContext.New(config);
        var document = await context.OpenAsync(req => req.Content(html));

        var listings = new List<ScrapedListing>();

        var cards = document.QuerySelectorAll(".mdc-card.offer-item");

        if (cards.Length == 0)
            cards = document.QuerySelectorAll(".offer-item, div[class*='offer'], div[class*='listing']");

        foreach (var card in cards)
        {
            try
            {
                var listing = ParseListingCard(card);
                if (listing != null)
                    listings.Add(listing);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[cars.bg] Failed to parse a listing card");
            }
        }

        if (listings.Count == 0)
        {
            listings = await ParseFallbackAsync(document);
        }

        return listings;
    }

    private ScrapedListing? ParseListingCard(IElement card)
    {
        var linkEl = card.QuerySelector("a[href*='offer']") ?? (card.TagName == "A" ? card : null);
        if (linkEl == null) return null;

        var href = linkEl.GetAttribute("href") ?? "";
        if (string.IsNullOrEmpty(href)) return null;

        // Outer wrapper div carries a clean "title" attribute, e.g. title="VW Golf 1.9 TDI"
        var title = card.ParentElement?.GetAttribute("title")?.Trim()
                    ?? card.GetAttribute("title")?.Trim()
                    ?? "";

        // Fallback to h5 headline (NOT h6, which is the price/date)
        if (string.IsNullOrEmpty(title))
        {
            var titleEl = card.QuerySelector("h5, .mdc-typography--headline5");
            title = titleEl?.TextContent.Trim() ?? "";
        }

        if (string.IsNullOrEmpty(title))
            title = ExtractTitleFromText(card.TextContent);

        if (string.IsNullOrEmpty(title) || title.Length < 3) return null;

        var fullUrl = href.StartsWith("http") ? href : $"{_settings.CarsBgBaseUrl}/{href.TrimStart('/')}";

        var listing = new ScrapedListing
        {
            Title = title,
            SourceUrl = fullUrl,
            ExternalId = ExtractIdFromUrl(fullUrl),
            Source = SourceName
        };

        // <h6 class="card__title ... price"> contains both EUR and BGN, e.g. "4,500\n8,801.24\nEUR\nBGN"
        var priceEl = card.QuerySelector("h6.price, .price");
        if (priceEl != null)
            ParsePrice(priceEl.TextContent, listing);

        ParseMakeModelFromTitle(title, listing);

        var detailsText = card.TextContent;
        ParseDetailsFromText(detailsText, listing);

        // Thumbnail is encoded as background-image on .mdc-card__media
        var mediaEl = card.QuerySelector(".mdc-card__media[style]");
        if (mediaEl != null)
        {
            var style = mediaEl.GetAttribute("style") ?? "";
            var imgMatch = Regex.Match(style, @"url\([""']?(https?://[^""')]+)[""']?\)");
            if (imgMatch.Success)
                listing.ImageUrls.Add(imgMatch.Groups[1].Value);
        }

        var locationEl = card.QuerySelector(".card__footer");
        if (locationEl != null)
        {
            var locText = locationEl.TextContent.Trim();
            // Format: "private seller, City"; city is after the last comma
            var commaIdx = locText.LastIndexOf(',');
            if (commaIdx >= 0)
                listing.City = locText[(commaIdx + 1)..].Trim();
        }

        var descEl = card.QuerySelector(".card__secondary.mdc-typography--body2");
        if (descEl != null)
        {
            var snippet = descEl.TextContent.Trim();
            if (snippet.Length > 10)
                listing.Description = snippet;
        }

        return listing;
    }

    private async Task EnrichFromDetailPageAsync(ScrapedListing listing, CancellationToken ct)
    {
        var response = await _httpClient.GetAsync(listing.SourceUrl, ct);
        if (!response.IsSuccessStatusCode) return;

        var html = await response.Content.ReadAsStringAsync(ct);
        var config = AngleSharp.Configuration.Default;
        var context = BrowsingContext.New(config);
        var document = await context.OpenAsync(req => req.Content(html));

        var notesEl = document.QuerySelector(".offer-notes");
        if (notesEl != null)
        {
            var descHtml = notesEl.InnerHtml;
            var descText = Regex.Replace(descHtml, @"<br\s*/?>", "\n", RegexOptions.IgnoreCase);
            descText = Regex.Replace(descText, @"<[^>]+>", "");
            descText = System.Net.WebUtility.HtmlDecode(descText).Trim();
            if (descText.Length > 10)
                listing.Description = descText;
        }

        var specsEl = document.QuerySelector("div.text-copy");
        if (specsEl != null)
        {
            var specsText = specsEl.TextContent;
            ParseSpecsLine(specsText, listing);
        }

        // Replace thumbnail with full-size gallery images (itemprop="contentUrl")
        listing.ImageUrls.Clear();
        var galleryImages = document.QuerySelectorAll("a[itemprop='contentUrl']");
        foreach (var imgLink in galleryImages)
        {
            var imgUrl = imgLink.GetAttribute("href") ?? "";
            if (!string.IsNullOrEmpty(imgUrl) && imgUrl.StartsWith("http"))
                listing.ImageUrls.Add(imgUrl);
        }

        if (listing.ImageUrls.Count == 0)
        {
            var carouselImages = document.QuerySelectorAll("img[data-src*='cars.bg']");
            foreach (var img in carouselImages)
            {
                var src = img.GetAttribute("data-src") ?? "";
                if (!string.IsNullOrEmpty(src) && src.StartsWith("http") && !listing.ImageUrls.Contains(src))
                    listing.ImageUrls.Add(src);
            }
        }

        var extrasEl = document.QuerySelector(".description.text-copy");
        if (extrasEl != null && listing.Description != null)
        {
            var extras = extrasEl.TextContent.Trim();
            if (extras.Length > 10)
                listing.Description += "\n\n" + extras;
        }

        var sellerNameEl = document.QuerySelector(".content:last-child table tr:first-child td:first-child a b");
        if (sellerNameEl != null)
        {
            var name = sellerNameEl.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(name)) listing.SellerName = name;
        }

        var phoneLink = document.QuerySelector("a[href^='tel:']");
        if (phoneLink != null)
        {
            var href = phoneLink.GetAttribute("href") ?? "";
            var phone = href.StartsWith("tel:") ? href["tel:".Length..] : phoneLink.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(phone)) listing.SellerPhone = phone;
        }

        var sellerLocationEl = document.QuerySelector(".icon-location");
        if (sellerLocationEl != null)
        {
            var loc = sellerLocationEl.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(loc) && string.IsNullOrWhiteSpace(listing.City))
                listing.City = loc;
        }

        _logger.LogDebug("[cars.bg] Enriched: {Title}, {ImgCount} images, desc={HasDesc}",
            listing.Title, listing.ImageUrls.Count, listing.Description != null);
    }

    private static void ParseSpecsLine(string specsText, ScrapedListing listing)
    {
        var ccMatch = Regex.Match(specsText, @"(\d{3,4})\s*(?:см|cm)", RegexOptions.IgnoreCase);
        if (ccMatch.Success && int.TryParse(ccMatch.Groups[1].Value, out var cc) && cc >= 100 && cc <= 9999)
            listing.EngineDisplacementCc = cc;

        var hpMatch = Regex.Match(specsText, @"(\d{2,4})\s*(?:к\.?\s*с\.?|кс|коня|hp)", RegexOptions.IgnoreCase);
        if (hpMatch.Success && int.TryParse(hpMatch.Groups[1].Value, out var hp) && hp >= 10 && hp <= 2000)
            listing.HorsePower = hp;

        var bodyMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Комби"] = "Wagon",
            ["Хечбек"] = "Hatchback",
            ["Хетчбек"] = "Hatchback",
            ["Седан"] = "Sedan",
            ["Джип"] = "SUV",
            ["SUV"] = "SUV",
            ["Купе"] = "Coupe",
            ["Кабрио"] = "Convertible",
            ["Ван"] = "Van",
            ["Миниван"] = "Van",
        };

        foreach (var (keyword, bodyType) in bodyMappings)
        {
            if (specsText.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                listing.BodyType = bodyType;
                break;
            }
        }

        if (specsText.Contains("Автоматични", StringComparison.OrdinalIgnoreCase) ||
            specsText.Contains("Автоматик", StringComparison.OrdinalIgnoreCase))
            listing.TransmissionType = "Automatic";
        else if (specsText.Contains("Ръчни", StringComparison.OrdinalIgnoreCase))
            listing.TransmissionType = "Manual";

        var colorMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Черен"] = "Black", ["Черна"] = "Black",
            ["Бял"] = "White", ["Бяла"] = "White",
            ["Сребрист"] = "Silver", ["Сребърн"] = "Silver", ["Сив"] = "Silver",
            ["Червен"] = "Red", ["Червена"] = "Red",
            ["Син"] = "Blue", ["Синя"] = "Blue",
            ["Зелен"] = "Green", ["Зелена"] = "Green",
            ["Жълт"] = "Yellow", ["Жълта"] = "Yellow",
            ["Оранжев"] = "Orange",
            ["Кафяв"] = "Brown",
            ["Бежов"] = "Beige",
            ["Златист"] = "Gold",
            ["Тъмносив"] = "Gray",
        };

        foreach (var (keyword, color) in colorMappings)
        {
            if (specsText.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                listing.Color = color;
                break;
            }
        }

        if (specsText.Contains("4x4", StringComparison.OrdinalIgnoreCase) ||
            specsText.Contains("4х4", StringComparison.OrdinalIgnoreCase) ||
            specsText.Contains("AWD", StringComparison.OrdinalIgnoreCase))
        {
            listing.DriveType = "AWD";
        }
    }

    private async Task<List<ScrapedListing>> ParseFallbackAsync(IDocument document)
    {
        var listings = new List<ScrapedListing>();

        var allLinks = document.QuerySelectorAll("a[href*='offer']");
        var seen = new HashSet<string>();

        foreach (var link in allLinks)
        {
            var href = link.GetAttribute("href") ?? "";
            if (string.IsNullOrEmpty(href) || seen.Contains(href)) continue;

            var titleEl = link.QuerySelector("h5, .mdc-typography--headline5");
            var title = titleEl != null
                ? titleEl.TextContent.Trim()
                : ExtractTitleFromText(link.TextContent);

            if (title.Length < 5) continue;
            seen.Add(href);

            var fullUrl = href.StartsWith("http") ? href : $"{_settings.CarsBgBaseUrl}/{href.TrimStart('/')}";

            var listing = new ScrapedListing
            {
                Title = title,
                SourceUrl = fullUrl,
                ExternalId = ExtractIdFromUrl(fullUrl),
                Source = SourceName
            };

            ParseMakeModelFromTitle(title, listing);

            var parent = link.ParentElement;
            if (parent != null)
            {
                ParseDetailsFromText(parent.TextContent, listing);
                var priceEl = parent.QuerySelector("[class*='price']");
                if (priceEl != null)
                    ParsePrice(priceEl.TextContent, listing);
            }

            listings.Add(listing);
        }

        await Task.CompletedTask;
        return listings;
    }

    private static void ParsePrice(string priceText, ScrapedListing listing)
    {
        // Price element contains both EUR and BGN separated by newlines, e.g.:
        //   "4,500\n8,801.24\nEUR\nBGN"
        // Grab only the first line that looks like a number.
        var lines = priceText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            var match = Regex.Match(trimmed, @"^[\d][\d ,.\u00a0]*\d$");
            if (match.Success)
            {
                var cleaned = match.Value
                    .Replace(",", "")
                    .Replace(" ", "")
                    .Replace("\u00a0", "");
                if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var price) && price > 0 && price < 100_000_000)
                {
                    listing.Price = price;
                    return;
                }
            }
        }
    }

    private static void ParseDetailsFromText(string text, ScrapedListing listing)
    {
        var yearMatch = Regex.Match(text, @"\b(19[89]\d|20[0-2]\d)\s*г?\.?");
        if (yearMatch.Success && int.TryParse(yearMatch.Groups[1].Value, out var year))
            listing.Year = year;

        var kmMatch = Regex.Match(text, @"([\d\s]+)\s*(?:км|km)", RegexOptions.IgnoreCase);
        if (kmMatch.Success)
        {
            var kmStr = kmMatch.Groups[1].Value.Replace(" ", "");
            if (int.TryParse(kmStr, out var km) && km > 0)
                listing.Mileage = km;
        }

        var hpMatch = Regex.Match(text, @"(\d{2,4})\s*(?:к\.?\s*с\.?|кс|коня|hp)", RegexOptions.IgnoreCase);
        if (hpMatch.Success && int.TryParse(hpMatch.Groups[1].Value, out var hp) && hp >= 10 && hp <= 2000)
            listing.HorsePower = hp;

        var ccMatch = Regex.Match(text, @"(\d{3,4})\s*(?:см|куб\.?\s*см|cc|cm3)", RegexOptions.IgnoreCase);
        if (ccMatch.Success && int.TryParse(ccMatch.Groups[1].Value, out var cc) && cc >= 100 && cc <= 9999)
            listing.EngineDisplacementCc = cc;

        var fuelMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["бензин"] = "Petrol",
            ["дизел"] = "Diesel",
            ["газ"] = "LPG",
            ["електр"] = "Electric",
            ["хибрид"] = "Hybrid",
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
        else if (text.Contains("ръчна", StringComparison.OrdinalIgnoreCase))
            listing.TransmissionType = "Manual";
    }

    private static void ParseMakeModelFromTitle(string title, ScrapedListing listing)
    {
        var parts = title.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 1) listing.MakeName = parts[0];
        if (parts.Length >= 2) listing.ModelName = parts[1];
    }

    private static string ExtractTitleFromText(string text)
    {
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => l.Length >= 3)
            .ToList();

        foreach (var line in lines)
        {
            if (Regex.IsMatch(line, @"^\d[\d\s,.\u00a0]*$")) continue;
            if (Regex.IsMatch(line, @"(?:EUR|BGN|USD|лв|€|\$)", RegexOptions.IgnoreCase)) continue;
            if (Regex.IsMatch(line, @"^\d+\s*(?:км|km|к\.с\.|hp)", RegexOptions.IgnoreCase)) continue;

            if (Regex.IsMatch(line, @"[A-Za-zА-Яа-я]{2,}"))
                return line;
        }

        return string.Empty;
    }

    private static string ExtractIdFromUrl(string url)
    {
        // IDs can be hex like /offer/69caa408e47ffd399f0de5d3
        var match = Regex.Match(url, @"offer[/-]([a-fA-F0-9]+)");
        if (match.Success) return $"carsbg_{match.Groups[1].Value}";

        match = Regex.Match(url, @"[?&]id=([a-fA-F0-9]+)");
        if (match.Success) return $"carsbg_{match.Groups[1].Value}";

        return $"carsbg_{url.GetHashCode():X}";
    }
}
