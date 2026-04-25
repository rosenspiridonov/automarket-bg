using CarMarketplace.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController(IMarketAnalyticsService analyticsService) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var overview = await analyticsService.GetOverviewAsync();
        return Ok(overview);
    }

    [HttpGet("prices-by-make")]
    public async Task<IActionResult> GetPricesByMake([FromQuery] int limit = 15)
    {
        var prices = await analyticsService.GetAveragePricesByMakeAsync(limit);
        return Ok(prices);
    }

    [HttpGet("price-trend")]
    public async Task<IActionResult> GetPriceTrend([FromQuery] int makeId, [FromQuery] int? modelId = null)
    {
        var trend = await analyticsService.GetPriceTrendAsync(makeId, modelId);
        return Ok(trend);
    }

    [HttpGet("body-types")]
    public async Task<IActionResult> GetBodyTypes()
    {
        var counts = await analyticsService.GetListingCountsByBodyTypeAsync();
        return Ok(counts);
    }
}
