using CarMarketplace.Application.Interfaces;
using Microsoft.Extensions.Hosting;

namespace CarMarketplace.Infrastructure.Services;

public class LocalImageService : IImageStorageService
{
    private const string UploadsFolder = "uploads";
    private readonly string resolvedPath;

    public LocalImageService(IHostEnvironment environment)
    {
        // Anchor uploads to ContentRoot/wwwroot/uploads so the path is the same
        // regardless of which directory dotnet was launched from.
        resolvedPath = Path.Combine(environment.ContentRootPath, "wwwroot", UploadsFolder);
        Directory.CreateDirectory(resolvedPath);
    }

    public async Task<ImageUploadResult> UploadAsync(Stream fileStream, string fileName)
    {
        var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var filePath = Path.Combine(resolvedPath, uniqueName);

        await using var fileStreamOut = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(fileStreamOut);

        var url = $"/{UploadsFolder}/{uniqueName}";
        return new ImageUploadResult(url, uniqueName);
    }

    public Task DeleteAsync(string publicId)
    {
        var filePath = Path.Combine(resolvedPath, publicId);
        if (File.Exists(filePath))
            File.Delete(filePath);
        return Task.CompletedTask;
    }
}
