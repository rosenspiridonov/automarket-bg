using CarMarketplace.Application.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Configuration;

namespace CarMarketplace.Infrastructure.Services;

public class CloudinaryImageService(IConfiguration configuration) : IImageStorageService
{
    private readonly Cloudinary cloudinary = BuildCloudinary(configuration);

    private static Cloudinary BuildCloudinary(IConfiguration configuration)
    {
        var cloudName = configuration["Cloudinary:CloudName"];
        var apiKey = configuration["Cloudinary:ApiKey"];
        var apiSecret = configuration["Cloudinary:ApiSecret"];

        var account = new Account(cloudName, apiKey, apiSecret);
        return new Cloudinary(account);
    }

    public async Task<Application.Interfaces.ImageUploadResult> UploadAsync(Stream fileStream, string fileName)
    {
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            Folder = "car-marketplace",
            Transformation = new Transformation()
                .Width(1200).Height(800).Crop("limit")
                .Quality("auto")
                .FetchFormat("auto")
        };

        var result = await cloudinary.UploadAsync(uploadParams);

        if (result.Error != null)
            throw new InvalidOperationException($"Image upload failed: {result.Error.Message}");

        return new Application.Interfaces.ImageUploadResult(result.SecureUrl.ToString(), result.PublicId);
    }

    public async Task DeleteAsync(string publicId)
    {
        await cloudinary.DestroyAsync(new DeletionParams(publicId));
    }
}
