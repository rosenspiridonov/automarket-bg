using CarMarketplace.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocationsController(ISeedDataProvider seedData) : ControllerBase
{
    [HttpGet("cities")]
    public IActionResult GetCities()
    {
        var cities = seedData.GetCities()
            .Select(c => new { name = c.Name, oblast = c.Oblast });

        return Ok(cities);
    }

    [HttpGet("oblasts")]
    public IActionResult GetOblasts()
    {
        var oblasts = seedData.GetCities()
            .Select(c => c.Oblast)
            .Distinct()
            .OrderBy(o => o);

        return Ok(oblasts);
    }
}
