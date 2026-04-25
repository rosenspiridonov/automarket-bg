namespace CarMarketplace.Application.Interfaces;

public interface IImageStorageService
{
    Task<ImageUploadResult> UploadAsync(Stream fileStream, string fileName);
    Task DeleteAsync(string publicId);
}

public record ImageUploadResult(string Url, string PublicId);
