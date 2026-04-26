using System.Security.Claims;
using CarMarketplace.Application.DTOs.Listings;
using CarMarketplace.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMarketplace.Web.Controllers;

[ApiController]
[Route("api/listings")]
public class CarListingsController(ICarListingService listingService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] SearchFilter filter)
    {
        var result = await listingService.SearchAsync(filter);
        return Ok(result);
    }

    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 8)
    {
        var listings = await listingService.GetFeaturedAsync(count);
        return Ok(listings);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var listing = await listingService.GetByIdAsync(id);
        if (listing == null)
            return NotFound();
        return Ok(listing);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateListingRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var id = await listingService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateListingRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            await listingService.UpdateAsync(id, userId, request);
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

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            await listingService.DeleteAsync(id, userId);
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

    private const int MaxImagesPerRequest = 20;
    private const long MaxImageBytes = 10 * 1024 * 1024;
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif"
    };
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    [HttpPost("{id:int}/images")]
    [Authorize]
    [RequestSizeLimit(MaxImagesPerRequest * MaxImageBytes)]
    public async Task<IActionResult> UploadImages(int id, [FromForm] List<IFormFile> files)
    {
        if (files.Count == 0)
            return BadRequest(new { error = "No files provided." });

        if (files.Count > MaxImagesPerRequest)
            return BadRequest(new { error = $"At most {MaxImagesPerRequest} files per request." });

        foreach (var file in files)
        {
            if (file.Length == 0)
                return BadRequest(new { error = $"File '{file.FileName}' is empty." });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { error = $"File '{file.FileName}' exceeds 10 MB limit." });

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedImageContentTypes.Contains(file.ContentType) ||
                !AllowedImageExtensions.Contains(extension))
            {
                return BadRequest(new { error = $"File '{file.FileName}' has an unsupported type." });
            }
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var openedStreams = new List<Stream>(files.Count);

        try
        {
            var uploads = files.Select(f =>
            {
                var stream = f.OpenReadStream();
                openedStreams.Add(stream);
                return new ListingImageUpload
                {
                    Stream = stream,
                    FileName = f.FileName
                };
            }).ToList();

            await listingService.AddImagesAsync(id, userId, uploads);
            return Ok(new { message = "Images uploaded successfully." });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        finally
        {
            foreach (var stream in openedStreams)
                await stream.DisposeAsync();
        }
    }

    [HttpDelete("{id:int}/images/{imageId:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteImage(int id, int imageId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            await listingService.DeleteImageAsync(id, imageId, userId);
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

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMyListings()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var listings = await listingService.GetBySellerAsync(userId);
        return Ok(listings);
    }
}
