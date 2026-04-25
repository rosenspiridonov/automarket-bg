using System.Collections.Concurrent;
using CarMarketplace.Scraper.Pipeline;
using Microsoft.Extensions.DependencyInjection;

namespace CarMarketplace.Web.Services;

public class ScraperJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int MaxPages { get; set; }
    public string Status { get; set; } = "Running";
    public string? Error { get; set; }
}

public class ScraperBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScraperBackgroundService> _logger;
    private readonly ConcurrentDictionary<string, ScraperJob> _jobs = new();
    private CancellationTokenSource? _activeCts;
    private readonly object _lock = new();

    public ScraperBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<ScraperBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public bool IsRunning => _activeCts is { IsCancellationRequested: false };

    public ScraperJob? ActiveJob => _jobs.Values
        .FirstOrDefault(j => j.Status == "Running");

    public IReadOnlyList<ScraperJob> GetRecentJobs(int count = 10) =>
        _jobs.Values
            .OrderByDescending(j => j.StartedAt)
            .Take(count)
            .ToList();

    public ScraperJob StartScraping(int maxPages)
    {
        lock (_lock)
        {
            if (IsRunning)
                throw new InvalidOperationException("A scraping job is already running.");

            var job = new ScraperJob { MaxPages = maxPages };
            _jobs[job.Id] = job;
            _activeCts = new CancellationTokenSource();

            var ct = _activeCts.Token;
            _ = Task.Run(() => RunScrapingAsync(job, ct));

            return job;
        }
    }

    public bool CancelScraping()
    {
        lock (_lock)
        {
            if (_activeCts == null || _activeCts.IsCancellationRequested)
                return false;

            _activeCts.Cancel();
            return true;
        }
    }

    private async Task RunScrapingAsync(ScraperJob job, CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var pipeline = scope.ServiceProvider.GetRequiredService<ScrapingPipeline>();

            _logger.LogInformation("Scraper job {JobId} started (maxPages={MaxPages})", job.Id, job.MaxPages);
            await pipeline.RunAsync(job.MaxPages, ct);

            job.Status = "Completed";
            job.CompletedAt = DateTime.UtcNow;
            _logger.LogInformation("Scraper job {JobId} completed", job.Id);
        }
        catch (OperationCanceledException)
        {
            job.Status = "Cancelled";
            job.CompletedAt = DateTime.UtcNow;
            _logger.LogWarning("Scraper job {JobId} was cancelled", job.Id);
        }
        catch (Exception ex)
        {
            job.Status = "Failed";
            job.Error = ex.Message;
            job.CompletedAt = DateTime.UtcNow;
            _logger.LogError(ex, "Scraper job {JobId} failed", job.Id);
        }
    }
}
