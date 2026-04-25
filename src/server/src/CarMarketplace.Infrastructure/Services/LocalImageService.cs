using CarMarketplace.Application.Interfaces;

namespace CarMarketplace.Infrastructure.Services;

public class LocalImageService(string uploadPath = "wwwroot/uploads") : IImageStorageService
{
    private readonly string resolvedPath = EnsureDirectory(uploadPath);

    private static string EnsureDirectory(string path)
    {
        Directory.CreateDirectory(path);
        return path;
    }

    public async Task<ImageUploadResult> UploadAsync(Stream fileStream, string fileName)
    {
        var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var filePath = Path.Combine(resolvedPath, uniqueName);

        using var fileStreamOut = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(fileStreamOut);

        var url = $"/uploads/{uniqueName}";
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
