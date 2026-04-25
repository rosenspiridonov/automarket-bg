using CarMarketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MakesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var makes = await context.Makes
            .OrderBy(m => m.Name)
            .Select(m => new { m.Id, m.Name, m.LogoUrl })
            .ToListAsync();

        return Ok(makes);
    }

    [HttpGet("{id:int}/models")]
    public async Task<IActionResult> GetModels(int id)
    {
        var models = await context.Models
            .Where(m => m.MakeId == id)
            .OrderBy(m => m.Name)
            .Select(m => new { m.Id, m.Name })
            .ToListAsync();

        return Ok(models);
    }
}
