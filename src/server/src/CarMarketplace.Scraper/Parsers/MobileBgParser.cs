using System.Globalization;
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
    private const string ExternalIdPrefix = "mobilebg_";
    private const int MetaCharsetPreviewBytes = 1024;
    private const int MaxReplacementCharRatioInverse = 100;
    private const int MinDescriptionLength = 10;
    private const int MinFeatureLength = 2;
    private const int MinPlaceholderTitleLength = 3;
    private const int MinHorsePower = 10;
    private const int MaxHorsePower = 2000;
    private const decimal MinPrice = 100;
    private const decimal MaxPrice = 100_000_000;
    private const int MaxMileage = 2_000_000;

    private const string ListingLinkSelector = "a[href*='obiava-']";
    private const string TitleSelector = ".obTitle h1";
    private const string TechDataItemSelector = ".techData .item";
    private const string DescriptionSelector = ".moreInfo";
    private const string FeatureGroupsSelector = ".carExtri .items";
    private const string LazyImageSelector = "img[data-src*='mobistatic'], img[data-src*='focus.bg']";
    private const string ImageSelector = "img[src*='mobistatic'], img[src*='focus.bg']";
    private const string PhoneLinkSelector = "a[href^='tel:']";
    private const string PhoneFallbackSelector = ".phone";
    private const string SellerNameSelector = ".dealer .name, .sellerName, .infoBox .name";
    private const string LocationFallbackSelector = ".carLocation, [class*='location']";
    private const string PriceSelector = ".contactsBox .Price";

    private const string FuelLabel = "Двигател";
    private const string PowerLabel = "Мощност";
    private const string TransmissionLabel = "Скоростна";
    private const string MileageLabel = "Пробег";
    private const string YearLabelManufacture = "производство";
    private const string YearLabelDate = "Дата";
    private const string ColorLabel = "Цвят";
    private const string BodyTypeLabel = "Категория";
    private const string CityLabelLocation = "Местонахождение";
    private const string CityLabelTown = "Населено място";

    private static readonly Regex ObiavaIdRegex = new(@"obiava-(\d+)-", RegexOptions.Compiled);
    private static readonly Regex MetaCharsetRegex = new(@"<meta[^>]*charset\s*=\s*[""']?([\w-]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MetaCharsetTagRegex = new(@"<meta\b[^>]*\bcharset\b[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PriceEurRegex = new(@"([\d][\d\s ]*\d)\s*€", RegexOptions.Compiled);
    private static readonly Regex PriceBgnRegex = new(@"([\d][\d\s.,]*\d)\s*(?:лв|лева)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MileageRegex = new(@"([\d][\d\s ]*)\s*(?:км|km)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex YearRegex = new(@"(19[89]\d|20[0-2]\d)", RegexOptions.Compiled);
    private static readonly Regex DigitsRegex = new(@"\d+", RegexOptions.Compiled);
    private static readonly Regex PhoneNumberRegex = new(@"0\d{8,9}", RegexOptions.Compiled);
    private static readonly Regex CityPrefixRegex = new(@"^(гр\.?|с\.?)\s*", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LocationPrefixRegex = new(@"^(Намира се в|гр\.?)\s*", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex NumberWhitespaceRegex = new(@"[\s ()]", RegexOptions.Compiled);

    internal static readonly Regex ListingIdSuffixRegex = new(@"\s*Обява[:\s]+\d+\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly string[] FeatureSeparators = [@" \ ", @"\", ","];

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

        for (var page = 1; page <= maxPages; page++)
        {
            ct.ThrowIfCancellationRequested();
            _logger.LogInformation("[mobile.bg] Scraping page {Page}/{MaxPages}...", page, maxPages);

            try
            {
                var pageListings = await ScrapeSearchPageAsync(page, ct);
                if (pageListings.Count == 0)
                {
                    _logger.LogInformation("[mobile.bg] No more listings found at page {Page}. Stopping.", page);
                    break;
                }

                allListings.AddRange(pageListings);
                _logger.LogInformation("[mobile.bg] Page {Page}: found {Count} listings (total: {Total})",
                    page, pageListings.Count, allListings.Count);

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

    private async Task<List<ScrapedListing>> ScrapeSearchPageAsync(int page, CancellationToken ct)
    {
        var url = page == 1
            ? _settings.MobileBgSearchUrl
            : $"{_settings.MobileBgSearchUrl}/p-{page}";

        var response = await _httpClient.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("[mobile.bg] Search page {Page} returned {Status}", page, (int)response.StatusCode);
            return [];
        }

        var html = await ReadDecodedHtmlAsync(response, ct);
        return await ParseSearchResultsAsync(html);
    }

    private async Task<List<ScrapedListing>> ParseSearchResultsAsync(string html)
    {
        var document = await ParseHtmlAsync(html);
        var listings = new List<ScrapedListing>();
        var seenIds = new HashSet<string>();
        var listingLinks = document.QuerySelectorAll(ListingLinkSelector);

        foreach (var link in listingLinks)
        {
            try
            {
                var listing = ParseListingFromLink(link, seenIds);
                if (listing is not null)
                {
                    listings.Add(listing);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[mobile.bg] Failed to parse listing link");
            }
        }

        return listings;
    }

    private ScrapedListing? ParseListingFromLink(IElement link, HashSet<string> seenIds)
    {
        var href = link.GetAttribute("href") ?? string.Empty;
        var idMatch = ObiavaIdRegex.Match(href);
        if (!idMatch.Success)
        {
            return null;
        }

        var rawId = idMatch.Groups[1].Value;
        var externalId = $"{ExternalIdPrefix}{rawId}";
        if (!seenIds.Add(externalId))
        {
            return null;
        }

        var linkText = link.TextContent.Trim();
        var hasUsableLinkText = !string.IsNullOrWhiteSpace(linkText) && linkText.Length >= MinPlaceholderTitleLength;
        var placeholderTitle = hasUsableLinkText ? linkText : $"mobile.bg #{rawId}";

        return new ScrapedListing
        {
            Title = placeholderTitle,
            SourceUrl = NormalizeUrl(href),
            ExternalId = externalId,
            Source = SourceName
        };
    }

    private async Task EnrichFromDetailPageAsync(ScrapedListing listing, CancellationToken ct)
    {
        var response = await _httpClient.GetAsync(listing.SourceUrl, ct);
        if (!response.IsSuccessStatusCode)
        {
            return;
        }

        var html = await ReadDecodedHtmlAsync(response, ct);
        var document = await ParseHtmlAsync(html);

        ApplyTitle(document, listing);
        ApplyImages(document, listing);
        ApplyTechData(document, listing);
        ApplyDescription(document, listing);
        ApplyFeatures(document, listing);
        ApplyPhone(document, listing);
        ApplySellerName(document, listing);
        ApplyCityFallback(document, listing);
        ApplyPrice(document, listing);

        _logger.LogDebug("[mobile.bg] Enriched: {Title}, {ImgCount} images, phone={Phone}",
            listing.Title, listing.ImageUrls.Count, listing.SellerPhone ?? "(none)");
    }

    private static async Task<IDocument> ParseHtmlAsync(string html)
    {
        var sanitizedHtml = MetaCharsetTagRegex.Replace(html, string.Empty);
        var browsingContext = BrowsingContext.New(AngleSharp.Configuration.Default);
        return await browsingContext.OpenAsync(request => request.Content(sanitizedHtml));
    }

    private static async Task<string> ReadDecodedHtmlAsync(HttpResponseMessage response, CancellationToken ct)
    {
        var bytes = await response.Content.ReadAsByteArrayAsync(ct);
        return DecodeContent(response, bytes);
    }

    private static string DecodeContent(HttpResponseMessage response, byte[] bytes)
    {
        var asUtf8 = Encoding.UTF8.GetString(bytes);
        if (LooksClean(asUtf8))
        {
            return asUtf8;
        }

        var declaredEncoding = GetDeclaredEncoding(response, bytes);
        return declaredEncoding.GetString(bytes);
    }

    internal static bool LooksClean(string text)
    {
        if (text.Length == 0)
        {
            return true;
        }

        const char Utf8ReplacementChar = (char)0xFFFD;
        var replacementChars = 0;
        foreach (var character in text)
        {
            if (character == Utf8ReplacementChar)
            {
                replacementChars++;
            }
        }

        return replacementChars * MaxReplacementCharRatioInverse < text.Length;
    }

    private static Encoding GetDeclaredEncoding(HttpResponseMessage response, byte[] bytes)
    {
        var headerCharset = response.Content.Headers.ContentType?.CharSet?.Trim('"', '\'');
        if (TryGetEncoding(headerCharset) is { } headerEncoding)
        {
            return headerEncoding;
        }

        var previewLength = Math.Min(bytes.Length, MetaCharsetPreviewBytes);
        var preview = Encoding.ASCII.GetString(bytes, 0, previewLength);
        var metaMatch = MetaCharsetRegex.Match(preview);
        if (metaMatch.Success && TryGetEncoding(metaMatch.Groups[1].Value) is { } metaEncoding)
        {
            return metaEncoding;
        }

        return Encoding.GetEncoding("windows-1251");
    }

    private static Encoding? TryGetEncoding(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        try
        {
            return Encoding.GetEncoding(name);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static void ApplyTitle(IDocument document, ScrapedListing listing)
    {
        var rawTitleText = document.QuerySelector(TitleSelector)?.TextContent.Trim();
        if (string.IsNullOrWhiteSpace(rawTitleText))
        {
            return;
        }

        var cleanedTitle = ListingIdSuffixRegex.Replace(rawTitleText, string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(cleanedTitle))
        {
            return;
        }

        listing.Title = cleanedTitle;
        ParseMakeModelFromTitle(cleanedTitle, listing);
    }

    private static void ApplyImages(IDocument document, ScrapedListing listing)
    {
        listing.ImageUrls.Clear();
        AddImagesFromAttribute(document, LazyImageSelector, "data-src", listing);
        if (listing.ImageUrls.Count == 0)
        {
            AddImagesFromAttribute(document, ImageSelector, "src", listing);
        }
    }

    private static void AddImagesFromAttribute(IDocument document, string selector, string attribute, ScrapedListing listing)
    {
        var imageElements = document.QuerySelectorAll(selector);
        foreach (var image in imageElements)
        {
            var source = image.GetAttribute(attribute) ?? string.Empty;
            if (source.StartsWith("http", StringComparison.Ordinal) && !listing.ImageUrls.Contains(source))
            {
                listing.ImageUrls.Add(source);
            }
        }
    }

    private static void ApplyTechData(IDocument document, ScrapedListing listing)
    {
        var techDataItems = document.QuerySelectorAll(TechDataItemSelector);
        foreach (var item in techDataItems)
        {
            var children = item.Children.OfType<IElement>().ToList();
            if (children.Count >= 2)
            {
                ApplySpecItem(children[0].TextContent.Trim(), children[1].TextContent.Trim(), listing);
                continue;
            }

            var itemText = item.TextContent.Trim();
            var colonIndex = itemText.IndexOf(':');
            if (colonIndex > 0)
            {
                var label = itemText[..colonIndex].Trim();
                var value = itemText[(colonIndex + 1)..].Trim();
                ApplySpecItem(label, value, listing);
            }
        }
    }

    private static void ApplyDescription(IDocument document, ScrapedListing listing)
    {
        var descriptionText = document.QuerySelector(DescriptionSelector)?.TextContent.Trim();
        if (!string.IsNullOrWhiteSpace(descriptionText) && descriptionText.Length > MinDescriptionLength)
        {
            listing.Description = descriptionText;
        }
    }

    private static void ApplyFeatures(IDocument document, ScrapedListing listing)
    {
        var featureGroups = document.QuerySelectorAll(FeatureGroupsSelector);
        foreach (var group in featureGroups)
        {
            foreach (var child in group.Children.OfType<IElement>())
            {
                var rawFeature = child.TextContent.Trim();
                if (string.IsNullOrWhiteSpace(rawFeature) || rawFeature.Length < MinFeatureLength)
                {
                    continue;
                }

                var parts = rawFeature.Split(FeatureSeparators, StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var trimmedPart = part.Trim();
                    if (trimmedPart.Length >= MinFeatureLength)
                    {
                        listing.ExtractedFeatures.Add(trimmedPart);
                    }
                }
            }
        }
    }

    private static void ApplyPhone(IDocument document, ScrapedListing listing)
    {
        listing.SellerPhone ??= ExtractPhoneFromTelLink(document) ?? ExtractPhoneFromFallback(document);
    }

    private static string? ExtractPhoneFromTelLink(IDocument document)
    {
        var telLink = document.QuerySelector(PhoneLinkSelector);
        if (telLink is null)
        {
            return null;
        }

        var href = telLink.GetAttribute("href") ?? string.Empty;
        if (!href.StartsWith("tel:", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var phone = href["tel:".Length..].Trim();
        return string.IsNullOrWhiteSpace(phone) ? null : phone;
    }

    private static string? ExtractPhoneFromFallback(IDocument document)
    {
        var phoneElements = document.QuerySelectorAll(PhoneFallbackSelector);
        foreach (var phoneElement in phoneElements)
        {
            var match = PhoneNumberRegex.Match(phoneElement.TextContent);
            if (match.Success)
            {
                return match.Value;
            }
        }

        return null;
    }

    private static void ApplySellerName(IDocument document, ScrapedListing listing)
    {
        var sellerName = document.QuerySelector(SellerNameSelector)?.TextContent.Trim();
        if (!string.IsNullOrWhiteSpace(sellerName))
        {
            listing.SellerName = sellerName;
        }
    }

    private static void ApplyCityFallback(IDocument document, ScrapedListing listing)
    {
        if (!string.IsNullOrEmpty(listing.City))
        {
            return;
        }

        var locationElement = document.QuerySelector(LocationFallbackSelector);
        if (locationElement is null)
        {
            return;
        }

        var locationText = LocationPrefixRegex.Replace(locationElement.TextContent.Trim(), string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(locationText))
        {
            listing.City = locationText;
        }
    }

    private static void ApplyPrice(IDocument document, ScrapedListing listing)
    {
        if (listing.Price.HasValue)
        {
            return;
        }

        var priceElementText = document.QuerySelector(PriceSelector)?.TextContent;
        if (!string.IsNullOrEmpty(priceElementText))
        {
            listing.Price = TryParsePrice(priceElementText);
        }

        if (!listing.Price.HasValue && document.Body is not null)
        {
            listing.Price = TryParsePrice(document.Body.TextContent);
        }
    }

    private static void ApplySpecItem(string label, string value, ScrapedListing listing)
    {
        if (string.IsNullOrEmpty(label) || string.IsNullOrEmpty(value))
        {
            return;
        }

        if (label.Contains(FuelLabel) && string.IsNullOrEmpty(listing.FuelType))
        {
            listing.FuelType = MapFuelType(value);
        }
        else if (label.Contains(PowerLabel))
        {
            listing.HorsePower ??= TryParseHorsePower(value);
        }
        else if (label.Contains(TransmissionLabel) && string.IsNullOrEmpty(listing.TransmissionType))
        {
            listing.TransmissionType = value.Contains("Автом", StringComparison.OrdinalIgnoreCase) ? "Automatic" : "Manual";
        }
        else if (label.Contains(MileageLabel))
        {
            listing.Mileage ??= TryParseMileage(value);
        }
        else if (label.Contains(YearLabelManufacture) || label.Contains(YearLabelDate))
        {
            listing.Year ??= TryParseYear(value);
        }
        else if (label.Contains(ColorLabel) && string.IsNullOrEmpty(listing.Color))
        {
            listing.Color = MapColor(value);
        }
        else if (label.Contains(BodyTypeLabel) && string.IsNullOrEmpty(listing.BodyType))
        {
            listing.BodyType = MapBodyType(value);
        }
        else if ((label.Contains(CityLabelLocation) || label.Contains(CityLabelTown)) && string.IsNullOrEmpty(listing.City))
        {
            listing.City = CityPrefixRegex.Replace(value, string.Empty).Trim();
        }
    }

    internal static int? TryParseHorsePower(string value)
    {
        var match = DigitsRegex.Match(value);
        if (!match.Success || !int.TryParse(match.Value, out var horsePower))
        {
            return null;
        }

        return horsePower is >= MinHorsePower and <= MaxHorsePower ? horsePower : null;
    }

    internal static int? TryParseYear(string value)
    {
        var match = YearRegex.Match(value);
        return match.Success && int.TryParse(match.Groups[1].Value, out var year) ? year : null;
    }

    internal static decimal? TryParsePrice(string text)
    {
        var match = PriceEurRegex.Match(text);
        if (!match.Success)
        {
            match = PriceBgnRegex.Match(text);
        }

        if (!match.Success)
        {
            return null;
        }

        var cleaned = NumberWhitespaceRegex.Replace(match.Groups[1].Value, string.Empty);
        if (!decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var price))
        {
            return null;
        }

        return price > MinPrice && price < MaxPrice ? price : null;
    }

    internal static int? TryParseMileage(string text)
    {
        var match = MileageRegex.Match(text);
        if (!match.Success)
        {
            return null;
        }

        var kilometersText = NumberWhitespaceRegex.Replace(match.Groups[1].Value, string.Empty);
        if (!int.TryParse(kilometersText, out var kilometers))
        {
            return null;
        }

        return kilometers > 0 && kilometers < MaxMileage ? kilometers : null;
    }

    internal static void ParseMakeModelFromTitle(string title, ScrapedListing listing)
    {
        var parts = title.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 1)
        {
            listing.MakeName = parts[0];
        }

        if (parts.Length >= 2)
        {
            listing.ModelName = parts[1];
        }
    }

    internal static string MapFuelType(string value) => value.ToLowerInvariant() switch
    {
        var lowered when lowered.Contains("бенз") => "Petrol",
        var lowered when lowered.Contains("диз") => "Diesel",
        var lowered when lowered.Contains("електр") => "Electric",
        var lowered when lowered.Contains("хибрид") => "Hybrid",
        var lowered when lowered.Contains("газ") => "LPG",
        _ => value
    };

    internal static string MapColor(string value) => value.ToLowerInvariant() switch
    {
        var lowered when lowered.Contains("черн") || lowered.Contains("черен") => "Black",
        var lowered when lowered.Contains("бял") || lowered.Contains("бяла") => "White",
        var lowered when lowered.Contains("сребр") || lowered.Contains("сив") => "Silver",
        var lowered when lowered.Contains("червен") => "Red",
        var lowered when lowered.Contains("син") => "Blue",
        var lowered when lowered.Contains("зелен") => "Green",
        var lowered when lowered.Contains("жълт") => "Yellow",
        var lowered when lowered.Contains("кафяв") => "Brown",
        var lowered when lowered.Contains("бежов") => "Beige",
        _ => value
    };

    internal static string MapBodyType(string value) => value.ToLowerInvariant() switch
    {
        var lowered when lowered.Contains("джип") || lowered.Contains("suv") => "SUV",
        var lowered when lowered.Contains("хечбек") || lowered.Contains("хетчбек") => "Hatchback",
        var lowered when lowered.Contains("комби") => "Wagon",
        var lowered when lowered.Contains("купе") => "Coupe",
        var lowered when lowered.Contains("кабрио") => "Convertible",
        var lowered when lowered.Contains("ван") || lowered.Contains("миниван") => "Van",
        var lowered when lowered.Contains("седан") => "Sedan",
        _ => value
    };

    private string NormalizeUrl(string url)
    {
        if (url.StartsWith("//", StringComparison.Ordinal))
        {
            return $"https:{url}";
        }

        if (url.StartsWith("http", StringComparison.Ordinal))
        {
            return url;
        }

        return $"{_settings.MobileBgBaseUrl}{url}";
    }
}
