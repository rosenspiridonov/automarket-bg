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

        _logger.LogInformation("[mobile.bg] Enriching {Count} listings with detail page data...", allListings.Count);
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
                _logger.LogDebug(ex, "[mobile.bg] Failed to enrich listing: {Title}", listing.Title);
            }
        }

        return allListings;
    }

    // ── Search results ──────────────────────────────────────────────────────

    private async Task<List<ScrapedListing>> ScrapeSearchPageAsync(int page, CancellationToken ct)
    {
        // Page 1: /obiavi/avtomobili-dzhipove
        // Page N: /obiavi/avtomobili-dzhipove/p-{N}
        var url = page == 1
            ? _settings.MobileBgSearchUrl
            : $"{_settings.MobileBgSearchUrl}/p-{page}";

        var response = await _httpClient.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("[mobile.bg] Search page {Page} returned {Status}", page, (int)response.StatusCode);
            return [];
        }

        var bytes = await response.Content.ReadAsByteArrayAsync(ct);
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

        // Collect every unique obiava link — detail page will fill all real data.
        // Filter to links whose href contains obiava-{digits}- so we skip nav/banner links.
        foreach (var link in document.QuerySelectorAll("a[href*='obiava-']"))
        {
            try
            {
                var listing = ParseListingFromLink(link, seen);
                if (listing != null) listings.Add(listing);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[mobile.bg] Failed to parse listing link");
            }
        }

        return listings;
    }

    private ScrapedListing? ParseListingFromLink(IElement link, HashSet<string> seen)
    {
        var href = link.GetAttribute("href") ?? "";
        var idMatch = Regex.Match(href, @"obiava-(\d+)-");
        if (!idMatch.Success) return null;

        var externalId = $"mobilebg_{idMatch.Groups[1].Value}";
        if (seen.Contains(externalId)) return null;
        seen.Add(externalId);

        // Use link text as a placeholder title — detail page overwrites with h1 .obTitle
        var title = link.TextContent.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length < 3)
            title = $"mobile.bg #{idMatch.Groups[1].Value}";

        var sourceUrl = NormalizeUrl(href);

        var listing = new ScrapedListing
        {
            Title = title,
            SourceUrl = sourceUrl,
            ExternalId = externalId,
            Source = SourceName
        };

        ParseMakeModelFromTitle(title, listing);

        // Grab thumbnail from a nearby img in the same card container
        var card = link.Closest("article, li, div[class]") ?? link.ParentElement;
        if (card != null)
        {
            var img = card.QuerySelector("img[src*='mobistatic'], img[src*='focus.bg']");
            if (img != null)
            {
                var src = img.GetAttribute("src") ?? img.GetAttribute("data-src") ?? "";
                if (!string.IsNullOrEmpty(src))
                    listing.ImageUrls.Add(NormalizeUrl(src));
            }

            // Opportunistic price/mileage/city from card text — detail page overwrites
            var cardText = card.TextContent;
            ParsePrice(cardText, listing);
            ParseMileage(cardText, listing);

            var cityEl = card.QuerySelector(".grad span, .location span, [class*='city'] span");
            listing.City = cityEl?.TextContent.Trim();
        }

        return listing;
    }

    // ── Detail page enrichment ──────────────────────────────────────────────

    private async Task EnrichFromDetailPageAsync(ScrapedListing listing, CancellationToken ct)
    {
        var response = await _httpClient.GetAsync(listing.SourceUrl, ct);
        if (!response.IsSuccessStatusCode) return;

        var bytes = await response.Content.ReadAsByteArrayAsync(ct);
        var charSet = response.Content.Headers.ContentType?.CharSet;
        var encoding = string.Equals(charSet, "utf-8", StringComparison.OrdinalIgnoreCase)
            ? Encoding.UTF8
            : Encoding.GetEncoding("windows-1251");

        var html = encoding.GetString(bytes);
        var config = AngleSharp.Configuration.Default;
        var context = BrowsingContext.New(config);
        var document = await context.OpenAsync(req => req.Content(html));

        // Title: h1 .obTitle
        var titleEl = document.QuerySelector("h1 .obTitle");
        if (titleEl != null)
        {
            var t = titleEl.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(t))
                listing.Title = t;
        }

        // Gallery: prefer data-src (lazy-load), fall back to src
        listing.ImageUrls.Clear();
        foreach (var img in document.QuerySelectorAll("img[data-src*='mobistatic'], img[data-src*='focus.bg']"))
        {
            var src = img.GetAttribute("data-src") ?? "";
            if (src.StartsWith("http") && !listing.ImageUrls.Contains(src))
                listing.ImageUrls.Add(src);
        }
        if (listing.ImageUrls.Count == 0)
        {
            foreach (var img in document.QuerySelectorAll("img[src*='mobistatic'], img[src*='focus.bg']"))
            {
                var src = img.GetAttribute("src") ?? "";
                if (src.StartsWith("http") && !listing.ImageUrls.Contains(src))
                    listing.ImageUrls.Add(src);
            }
        }

        // Tech data: .techData .item — each item has two child elements (label + value)
        foreach (var item in document.QuerySelectorAll(".techData .item"))
        {
            var children = item.Children.OfType<IElement>().ToList();
            if (children.Count >= 2)
            {
                ApplySpecItem(children[0].TextContent.Trim(), children[1].TextContent.Trim(), listing);
            }
            else
            {
                var text = item.TextContent.Trim();
                var colon = text.IndexOf(':');
                if (colon > 0)
                    ApplySpecItem(text[..colon].Trim(), text[(colon + 1)..].Trim(), listing);
            }
        }

        // Description: .moreInfo
        var descEl = document.QuerySelector(".moreInfo");
        if (descEl != null)
        {
            var descText = descEl.TextContent.Trim();
            if (descText.Length > 10)
                listing.Description = descText;
        }

        // Features: .carExtri .items — each .items is a category group, children are features.
        // mobile.bg sometimes packs two features in one cell with " \ " separator.
        foreach (var group in document.QuerySelectorAll(".carExtri .items"))
        {
            foreach (var child in group.Children.OfType<IElement>())
            {
                var feat = child.TextContent.Trim();
                if (string.IsNullOrWhiteSpace(feat) || feat.Length < 2) continue;

                foreach (var part in feat.Split(new[] { @" \ ", @"\" }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var p = part.Trim();
                    if (p.Length >= 2)
                        listing.ExtractedFeatures.Add(p);
                }
            }
        }

        // Phone: prefer tel: link, fall back to regex on any .phone element
        var telLink = document.QuerySelector("a[href^='tel:']");
        if (telLink != null)
        {
            var phone = (telLink.GetAttribute("href") ?? "")["tel:".Length..].Trim();
            if (!string.IsNullOrWhiteSpace(phone))
                listing.SellerPhone = phone;
        }
        if (string.IsNullOrEmpty(listing.SellerPhone))
        {
            var phoneEl = document.QuerySelector(".phone");
            if (phoneEl != null)
            {
                var m = Regex.Match(phoneEl.TextContent, @"0\d{8,9}");
                if (m.Success) listing.SellerPhone = m.Value;
            }
        }

        // Seller name: try a few common containers
        var nameEl = document.QuerySelector(".dealer .name, .sellerName, .infoBox .name");
        if (nameEl != null)
        {
            var name = nameEl.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(name))
                listing.SellerName = name;
        }

        // City: ApplySpecItem handles "Местонахождение" from techData;
        // fall back to a location element if still empty
        if (string.IsNullOrEmpty(listing.City))
        {
            var locEl = document.QuerySelector(".carLocation, [class*='location']");
            if (locEl != null)
            {
                var loc = Regex.Replace(locEl.TextContent.Trim(),
                    @"^(Намира се в|гр\.?)\s*", "", RegexOptions.IgnoreCase).Trim();
                if (!string.IsNullOrWhiteSpace(loc))
                    listing.City = loc;
            }
        }

        _logger.LogDebug("[mobile.bg] Enriched: {Title}, {ImgCount} images, phone={Phone}",
            listing.Title, listing.ImageUrls.Count, listing.SellerPhone ?? "—");
    }

    // ── Spec parsing ────────────────────────────────────────────────────────

    private static void ApplySpecItem(string label, string value, ScrapedListing listing)
    {
        if (string.IsNullOrEmpty(label) || string.IsNullOrEmpty(value)) return;

        if (label.Contains("Двигател") && string.IsNullOrEmpty(listing.FuelType))
            listing.FuelType = MapFuelType(value);

        else if (label.Contains("Мощност") && !listing.HorsePower.HasValue)
        {
            var m = Regex.Match(value, @"(\d+)");
            if (m.Success && int.TryParse(m.Groups[1].Value, out var hp) && hp is >= 10 and <= 2000)
                listing.HorsePower = hp;
        }
        else if (label.Contains("Скоростна") && string.IsNullOrEmpty(listing.TransmissionType))
            listing.TransmissionType = value.Contains("Автом", StringComparison.OrdinalIgnoreCase)
                ? "Automatic" : "Manual";

        else if (label.Contains("Пробег") && !listing.Mileage.HasValue)
            ParseMileage(value, listing);

        else if ((label.Contains("производство") || label.Contains("Дата")) && !listing.Year.HasValue)
        {
            var m = Regex.Match(value, @"(19[89]\d|20[0-2]\d)");
            if (m.Success && int.TryParse(m.Groups[1].Value, out var yr))
                listing.Year = yr;
        }
        else if (label.Contains("Цвят") && string.IsNullOrEmpty(listing.Color))
            listing.Color = MapColor(value);

        else if (label.Contains("Категория") && string.IsNullOrEmpty(listing.BodyType))
            listing.BodyType = MapBodyType(value);

        else if ((label.Contains("Местонахождение") || label.Contains("Населено място")) && string.IsNullOrEmpty(listing.City))
            listing.City = Regex.Replace(value, @"^(гр\.?|с\.?)\s*", "", RegexOptions.IgnoreCase).Trim();
    }

    private static string MapFuelType(string value)
    {
        var v = value.ToLowerInvariant();
        if (v.Contains("бенз")) return "Petrol";
        if (v.Contains("диз")) return "Diesel";
        if (v.Contains("електр")) return "Electric";
        if (v.Contains("хибрид")) return "Hybrid";
        if (v.Contains("газ")) return "LPG";
        return value;
    }

    private static string MapColor(string value)
    {
        var v = value.ToLowerInvariant();
        if (v.Contains("черн")) return "Black";
        if (v.Contains("бял")) return "White";
        if (v.Contains("сребр") || v.Contains("сив")) return "Silver";
        if (v.Contains("червен")) return "Red";
        if (v.Contains("синь") || v.StartsWith("син")) return "Blue";
        if (v.Contains("зелен")) return "Green";
        if (v.Contains("жълт")) return "Yellow";
        if (v.Contains("кафяв")) return "Brown";
        if (v.Contains("бежов")) return "Beige";
        return value;
    }

    private static string MapBodyType(string value)
    {
        var v = value.ToLowerInvariant();
        if (v.Contains("джип") || v.Contains("suv")) return "SUV";
        if (v.Contains("хечбек") || v.Contains("хетчбек")) return "Hatchback";
        if (v.Contains("комби")) return "Wagon";
        if (v.Contains("купе")) return "Coupe";
        if (v.Contains("кабрио")) return "Convertible";
        if (v.Contains("ван") || v.Contains("миниван")) return "Van";
        if (v.Contains("седан")) return "Sedan";
        return value;
    }

    // ── Common helpers ──────────────────────────────────────────────────────

    private static void ParsePrice(string text, ScrapedListing listing)
    {
        if (listing.Price.HasValue) return;

        // Prefer EUR price: "72 699 €"
        var match = Regex.Match(text, @"([\d][\d\s\u00a0]*\d)\s*€");
        if (!match.Success)
            // Fall back to лв
            match = Regex.Match(text, @"([\d][\d\s\u00a0]*\d)\s*(?:лв|лева)", RegexOptions.IgnoreCase);
        if (!match.Success) return;

        var cleaned = Regex.Replace(match.Groups[1].Value, @"[\s\u00a0]", "");
        if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var price)
            && price > 100 && price < 100_000_000)
            listing.Price = price;
    }

    private static void ParseMileage(string text, ScrapedListing listing)
    {
        if (listing.Mileage.HasValue) return;
        var match = Regex.Match(text, @"([\d][\d\s\u00a0]*)\s*(?:км|km)", RegexOptions.IgnoreCase);
        if (!match.Success) return;
        var kmStr = Regex.Replace(match.Groups[1].Value, @"[\s\u00a0()]", "");
        if (int.TryParse(kmStr, out var km) && km > 0 && km < 2_000_000)
            listing.Mileage = km;
    }

    private static void ParseDetailsFromText(string text, ScrapedListing listing)
    {
        if (!listing.Year.HasValue)
        {
            var m = Regex.Match(text, @"\b(19[89]\d|20[0-2]\d)\b");
            if (m.Success && int.TryParse(m.Groups[1].Value, out var yr))
                listing.Year = yr;
        }

        ParseMileage(text, listing);
        ParsePrice(text, listing);

        if (string.IsNullOrEmpty(listing.FuelType))
        {
            if (text.Contains("бензин", StringComparison.OrdinalIgnoreCase)) listing.FuelType = "Petrol";
            else if (text.Contains("дизел", StringComparison.OrdinalIgnoreCase)) listing.FuelType = "Diesel";
            else if (text.Contains("електр", StringComparison.OrdinalIgnoreCase)) listing.FuelType = "Electric";
            else if (text.Contains("хибрид", StringComparison.OrdinalIgnoreCase)) listing.FuelType = "Hybrid";
            else if (text.Contains("газ", StringComparison.OrdinalIgnoreCase)) listing.FuelType = "LPG";
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

    private string NormalizeUrl(string url)
    {
        if (url.StartsWith("//")) return $"https:{url}";
        if (url.StartsWith("http")) return url;
        return $"{_settings.MobileBgBaseUrl}{url}";
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
