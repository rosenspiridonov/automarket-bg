namespace CarMarketplace.Scraper.Configuration;

public class ScraperSettings
{
    public const string SectionName = "Scraper";

    public string CarsBgBaseUrl { get; set; } = "https://www.cars.bg";
    public string MobileBgBaseUrl { get; set; } = "https://www.mobile.bg";
    public string MobileBgSearchUrl { get; set; } = "https://www.mobile.bg/pcgi/mobile.cgi";

    public string UserAgent { get; set; } =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

    public string AcceptLanguage { get; set; } = "bg-BG,bg;q=0.9,en;q=0.8";

    public int HttpTimeoutSeconds { get; set; } = 30;

    public int MaxPagesPerSource { get; set; } = 5;

    public int SaveBatchSize { get; set; } = 50;

    public RateLimit PageDelay { get; set; } = new() { MinMs = 1500, MaxMs = 3000 };

    public RateLimit DetailDelay { get; set; } = new() { MinMs = 800, MaxMs = 1500 };

    public RetrySettings Retry { get; set; } = new();

    public CircuitBreakerSettings CircuitBreaker { get; set; } = new();

    public SystemUserSettings SystemUser { get; set; } = new();
}

public class RateLimit
{
    public int MinMs { get; set; }
    public int MaxMs { get; set; }
}

public class RetrySettings
{
    public int MaxAttempts { get; set; } = 3;
    public int BaseDelayMs { get; set; } = 500;
    public int MaxDelayMs { get; set; } = 5000;
}

public class CircuitBreakerSettings
{
    public double FailureRatio { get; set; } = 0.5;
    public int SamplingDurationSeconds { get; set; } = 90;
    public int MinimumThroughput { get; set; } = 5;
    public int BreakDurationSeconds { get; set; } = 60;
}

public class SystemUserSettings
{
    public string Email { get; set; } = "system@automarket.bg";
    public string UserName { get; set; } = "AutoMarket";
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = "AutoMarket";
    public string LastName { get; set; } = "System";
    public string City { get; set; } = "Sofia";
}
