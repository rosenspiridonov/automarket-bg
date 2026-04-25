using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(ScraperBackgroundService scraper, AppDbContext context) : ControllerBase
{
    [HttpPost("scraper/start")]
    public IActionResult StartScraper([FromBody] StartScraperRequest request)
    {
        try
        {
            var job = scraper.StartScraping(request.MaxPages);
            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPost("scraper/cancel")]
    public IActionResult CancelScraper()
    {
        var cancelled = scraper.CancelScraping();
        return Ok(new { cancelled });
    }

    [HttpGet("scraper/status")]
    public IActionResult GetScraperStatus()
    {
        return Ok(new
        {
            isRunning = scraper.IsRunning,
            activeJob = scraper.ActiveJob,
            recentJobs = scraper.GetRecentJobs()
        });
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalListings = await context.CarListings.CountAsync();
        var activeListings = await context.CarListings
            .Where(l => l.Status == Domain.Enums.ListingStatus.Active)
            .CountAsync();
        var scrapedListings = await context.CarListings
            .Where(l => l.ExternalSourceId != null)
            .CountAsync();
        var userListings = totalListings - scrapedListings;
        var totalUsers = await context.Users.CountAsync();

        var externalIds = await context.CarListings
            .Where(l => l.ExternalSourceId != null)
            .Select(l => l.ExternalSourceId!)
            .ToListAsync();

        var listingsBySource = externalIds
            .GroupBy(id =>
            {
                var idx = id.IndexOf('_');
                return idx > 0 ? id[..idx] : "unknown";
            })
            .Select(g => new { Source = g.Key, Count = g.Count() })
            .ToList();

        return Ok(new
        {
            totalListings,
            activeListings,
            scrapedListings,
            userListings,
            totalUsers,
            listingsBySource
        });
    }

    [HttpDelete("listings/{id:int}")]
    public async Task<IActionResult> DeleteListing(int id)
    {
        var listing = await context.CarListings.FindAsync(id);
        if (listing == null)
            return NotFound();

        context.CarListings.Remove(listing);
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("listings/scraped")]
    public async Task<IActionResult> DeleteAllScrapedListings()
    {
        var count = await context.CarListings
            .Where(l => l.ExternalSourceId != null)
            .ExecuteDeleteAsync();

        return Ok(new { deleted = count });
    }
}

public record StartScraperRequest
{
    public int MaxPages { get; init; } = 5;
}
