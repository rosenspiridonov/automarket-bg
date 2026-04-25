using System.Security.Claims;
using CarMarketplace.Application.DTOs.SavedSearches;
using CarMarketplace.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/saved-searches")]
[Authorize]
public class SavedSearchesController(ISavedSearchService savedSearchService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var searches = await savedSearchService.GetByUserAsync(userId);
        return Ok(searches);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSavedSearchRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var id = await savedSearchService.CreateAsync(userId, request);
        return Ok(new { id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            await savedSearchService.DeleteAsync(id, userId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
