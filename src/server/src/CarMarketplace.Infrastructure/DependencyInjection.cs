using CarMarketplace.Application.Interfaces;
using CarMarketplace.Domain.Entities;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CarMarketplace.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICarListingService, CarListingService>();
        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<ISavedSearchService, SavedSearchService>();
        services.AddScoped<IMarketAnalyticsService, MarketAnalyticsService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddHttpContextAccessor();

        var cloudinaryCloudName = configuration["Cloudinary:CloudName"];
        if (!string.IsNullOrEmpty(cloudinaryCloudName))
            services.AddScoped<IImageStorageService, CloudinaryImageService>();
        else
            services.AddScoped<IImageStorageService>(_ => new LocalImageService());

        return services;
    }
}
