using CarMarketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeaturesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var features = await context.CarFeatures
            .OrderBy(f => f.Category)
            .ThenBy(f => f.Name)
            .Select(f => new { f.Id, f.Name, f.Category })
            .ToListAsync();

        return Ok(features);
    }
}
