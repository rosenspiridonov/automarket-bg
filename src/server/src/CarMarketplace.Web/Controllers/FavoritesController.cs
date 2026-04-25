using System.Security.Claims;
using CarMarketplace.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController(IFavoriteService favoriteService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFavorites()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var favorites = await favoriteService.GetUserFavoritesAsync(userId);
        return Ok(favorites);
    }

    [HttpGet("ids")]
    public async Task<IActionResult> GetFavoriteIds()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ids = await favoriteService.GetFavoriteIdsAsync(userId);
        return Ok(ids);
    }

    [HttpPost("{listingId:int}")]
    public async Task<IActionResult> Toggle(int listingId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isFavorited = await favoriteService.ToggleAsync(userId, listingId);
        return Ok(new { isFavorited });
    }
}
