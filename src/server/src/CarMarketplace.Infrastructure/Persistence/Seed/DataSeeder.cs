using CarMarketplace.Application.Interfaces;
using CarMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Infrastructure.Persistence.Seed;

public static class DataSeeder
{
    public const string AdminRole = "Admin";
    public const string AdminEmail = "admin@automarket.bg";
    private const string AdminPassword = "Admin!Pass123";

    public static async Task SeedAsync(AppDbContext context, ISeedDataProvider seedData)
    {
        if (await context.Makes.AnyAsync())
            return;

        var makes = seedData.GetMakes()
            .Select(dto => new Make
            {
                Name = dto.Name,
                Models = [.. dto.Models.Select(name => new Model { Name = name })]
            })
            .ToList();

        var features = seedData.GetFeatures()
            .Select(dto => new CarFeature
            {
                Name = dto.Name,
                Category = dto.Category
            })
            .ToList();

        context.Makes.AddRange(makes);
        context.CarFeatures.AddRange(features);

        await context.SaveChangesAsync();
    }

    public static async Task SeedMissingModelsAsync(AppDbContext context, ISeedDataProvider seedData)
    {
        var dbMakes = await context.Makes.Include(m => m.Models).ToListAsync();
        var makesByName = dbMakes.ToDictionary(m => m.Name, StringComparer.OrdinalIgnoreCase);

        bool hasChanges = false;
        foreach (var dto in seedData.GetMakes())
        {
            if (!makesByName.TryGetValue(dto.Name, out var make)) continue;

            var existing = make.Models.Select(m => m.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var modelName in dto.Models)
            {
                if (!existing.Contains(modelName))
                {
                    make.Models.Add(new Model { Name = modelName, MakeId = make.Id });
                    hasChanges = true;
                }
            }
        }

        if (hasChanges)
            await context.SaveChangesAsync();
    }

    public static async Task SeedRolesAndAdminAsync(
        RoleManager<IdentityRole> roleManager,
        UserManager<ApplicationUser> userManager)
    {
        if (!await roleManager.RoleExistsAsync(AdminRole))
            await roleManager.CreateAsync(new IdentityRole(AdminRole));

        var admin = await userManager.FindByEmailAsync(AdminEmail);
        if (admin != null) return;

        admin = new ApplicationUser
        {
            Email = AdminEmail,
            UserName = "Admin",
            EmailConfirmed = true,
            FirstName = "Admin",
            LastName = "User",
            City = "София",
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(admin, AdminPassword);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(admin, AdminRole);
    }
}
