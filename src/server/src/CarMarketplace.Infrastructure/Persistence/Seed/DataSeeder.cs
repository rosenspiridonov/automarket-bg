using CarMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CarMarketplace.Infrastructure.Persistence.Seed;

public static class DataSeeder
{
    public const string AdminRole = "Admin";
    public const string AdminEmail = "admin@automarket.bg";
    private const string AdminPassword = "Admin!Pass123";

    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Makes.AnyAsync())
            return;

        var makes = GetMakesWithModels();
        context.Makes.AddRange(makes);

        var features = GetFeatures();
        context.CarFeatures.AddRange(features);

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
            City = "Sofia",
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(admin, AdminPassword);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(admin, AdminRole);
    }

    private static List<Make> GetMakesWithModels()
    {
        return
        [
            new Make { Name = "Audi", Models = { new() { Name = "A3" }, new() { Name = "A4" }, new() { Name = "A5" }, new() { Name = "A6" }, new() { Name = "A7" }, new() { Name = "A8" }, new() { Name = "Q3" }, new() { Name = "Q5" }, new() { Name = "Q7" }, new() { Name = "Q8" }, new() { Name = "TT" }, new() { Name = "RS3" }, new() { Name = "RS6" } } },
            new Make { Name = "BMW", Models = { new() { Name = "1 Series" }, new() { Name = "2 Series" }, new() { Name = "3 Series" }, new() { Name = "4 Series" }, new() { Name = "5 Series" }, new() { Name = "6 Series" }, new() { Name = "7 Series" }, new() { Name = "X1" }, new() { Name = "X3" }, new() { Name = "X5" }, new() { Name = "X6" }, new() { Name = "X7" }, new() { Name = "M3" }, new() { Name = "M5" } } },
            new Make { Name = "Mercedes-Benz", Models = { new() { Name = "A-Class" }, new() { Name = "B-Class" }, new() { Name = "C-Class" }, new() { Name = "E-Class" }, new() { Name = "S-Class" }, new() { Name = "CLA" }, new() { Name = "CLS" }, new() { Name = "GLA" }, new() { Name = "GLC" }, new() { Name = "GLE" }, new() { Name = "GLS" }, new() { Name = "AMG GT" } } },
            new Make { Name = "Volkswagen", Models = { new() { Name = "Golf" }, new() { Name = "Passat" }, new() { Name = "Polo" }, new() { Name = "Tiguan" }, new() { Name = "Touareg" }, new() { Name = "Arteon" }, new() { Name = "T-Roc" }, new() { Name = "ID.3" }, new() { Name = "ID.4" } } },
            new Make { Name = "Toyota", Models = { new() { Name = "Corolla" }, new() { Name = "Camry" }, new() { Name = "RAV4" }, new() { Name = "Yaris" }, new() { Name = "C-HR" }, new() { Name = "Land Cruiser" }, new() { Name = "Supra" }, new() { Name = "Hilux" } } },
            new Make { Name = "Honda", Models = { new() { Name = "Civic" }, new() { Name = "Accord" }, new() { Name = "CR-V" }, new() { Name = "HR-V" }, new() { Name = "Jazz" } } },
            new Make { Name = "Ford", Models = { new() { Name = "Focus" }, new() { Name = "Fiesta" }, new() { Name = "Mondeo" }, new() { Name = "Kuga" }, new() { Name = "Puma" }, new() { Name = "Mustang" }, new() { Name = "Ranger" } } },
            new Make { Name = "Opel", Models = { new() { Name = "Astra" }, new() { Name = "Corsa" }, new() { Name = "Insignia" }, new() { Name = "Mokka" }, new() { Name = "Crossland" }, new() { Name = "Grandland" } } },
            new Make { Name = "Peugeot", Models = { new() { Name = "208" }, new() { Name = "308" }, new() { Name = "508" }, new() { Name = "2008" }, new() { Name = "3008" }, new() { Name = "5008" } } },
            new Make { Name = "Renault", Models = { new() { Name = "Clio" }, new() { Name = "Megane" }, new() { Name = "Captur" }, new() { Name = "Kadjar" }, new() { Name = "Scenic" }, new() { Name = "Talisman" } } },
            new Make { Name = "Skoda", Models = { new() { Name = "Octavia" }, new() { Name = "Superb" }, new() { Name = "Fabia" }, new() { Name = "Kodiaq" }, new() { Name = "Karoq" }, new() { Name = "Kamiq" }, new() { Name = "Scala" } } },
            new Make { Name = "Hyundai", Models = { new() { Name = "i10" }, new() { Name = "i20" }, new() { Name = "i30" }, new() { Name = "Tucson" }, new() { Name = "Santa Fe" }, new() { Name = "Kona" }, new() { Name = "Ioniq 5" } } },
            new Make { Name = "Kia", Models = { new() { Name = "Ceed" }, new() { Name = "Sportage" }, new() { Name = "Sorento" }, new() { Name = "Rio" }, new() { Name = "Stonic" }, new() { Name = "EV6" }, new() { Name = "Niro" } } },
            new Make { Name = "Volvo", Models = { new() { Name = "S60" }, new() { Name = "S90" }, new() { Name = "V60" }, new() { Name = "V90" }, new() { Name = "XC40" }, new() { Name = "XC60" }, new() { Name = "XC90" } } },
            new Make { Name = "Nissan", Models = { new() { Name = "Micra" }, new() { Name = "Qashqai" }, new() { Name = "Juke" }, new() { Name = "X-Trail" }, new() { Name = "Leaf" }, new() { Name = "Navara" } } },
            new Make { Name = "Mazda", Models = { new() { Name = "2" }, new() { Name = "3" }, new() { Name = "6" }, new() { Name = "CX-3" }, new() { Name = "CX-5" }, new() { Name = "CX-30" }, new() { Name = "MX-5" } } },
            new Make { Name = "Fiat", Models = { new() { Name = "500" }, new() { Name = "Panda" }, new() { Name = "Tipo" }, new() { Name = "Punto" } } },
            new Make { Name = "Seat", Models = { new() { Name = "Leon" }, new() { Name = "Ibiza" }, new() { Name = "Ateca" }, new() { Name = "Arona" }, new() { Name = "Tarraco" } } },
            new Make { Name = "Citroen", Models = { new() { Name = "C3" }, new() { Name = "C4" }, new() { Name = "C5 Aircross" }, new() { Name = "Berlingo" } } },
            new Make { Name = "Dacia", Models = { new() { Name = "Sandero" }, new() { Name = "Duster" }, new() { Name = "Logan" }, new() { Name = "Jogger" }, new() { Name = "Spring" } } },
            new Make { Name = "Porsche", Models = { new() { Name = "911" }, new() { Name = "Cayenne" }, new() { Name = "Macan" }, new() { Name = "Panamera" }, new() { Name = "Taycan" } } },
            new Make { Name = "Land Rover", Models = { new() { Name = "Range Rover" }, new() { Name = "Range Rover Sport" }, new() { Name = "Discovery" }, new() { Name = "Defender" }, new() { Name = "Evoque" } } },
            new Make { Name = "Jaguar", Models = { new() { Name = "XE" }, new() { Name = "XF" }, new() { Name = "F-Pace" }, new() { Name = "E-Pace" }, new() { Name = "F-Type" } } },
            new Make { Name = "Alfa Romeo", Models = { new() { Name = "Giulia" }, new() { Name = "Stelvio" }, new() { Name = "Tonale" } } },
            new Make { Name = "Subaru", Models = { new() { Name = "Impreza" }, new() { Name = "Forester" }, new() { Name = "Outback" }, new() { Name = "XV" } } },
            new Make { Name = "Mitsubishi", Models = { new() { Name = "Outlander" }, new() { Name = "ASX" }, new() { Name = "Eclipse Cross" }, new() { Name = "L200" } } },
            new Make { Name = "Suzuki", Models = { new() { Name = "Swift" }, new() { Name = "Vitara" }, new() { Name = "S-Cross" }, new() { Name = "Jimny" } } },
            new Make { Name = "Tesla", Models = { new() { Name = "Model 3" }, new() { Name = "Model Y" }, new() { Name = "Model S" }, new() { Name = "Model X" } } },
            new Make { Name = "Lexus", Models = { new() { Name = "IS" }, new() { Name = "ES" }, new() { Name = "NX" }, new() { Name = "RX" }, new() { Name = "UX" } } },
            new Make { Name = "Mini", Models = { new() { Name = "Cooper" }, new() { Name = "Countryman" }, new() { Name = "Clubman" } } }
        ];
    }

    private static List<CarFeature> GetFeatures()
    {
        return
        [
            new CarFeature { Name = "Кожен салон", Category = "Интериор" },
            new CarFeature { Name = "Подгряване на седалки", Category = "Интериор" },
            new CarFeature { Name = "Вентилирани седалки", Category = "Интериор" },
            new CarFeature { Name = "Панорамен покрив", Category = "Интериор" },
            new CarFeature { Name = "Ambient осветление", Category = "Интериор" },
            new CarFeature { Name = "Подгрев на волана", Category = "Интериор" },
            new CarFeature { Name = "Електрически седалки", Category = "Интериор" },
            new CarFeature { Name = "Седалки с памет", Category = "Интериор" },

            new CarFeature { Name = "Навигация", Category = "Технологии" },
            new CarFeature { Name = "Bluetooth", Category = "Технологии" },
            new CarFeature { Name = "Apple CarPlay", Category = "Технологии" },
            new CarFeature { Name = "Android Auto", Category = "Технологии" },
            new CarFeature { Name = "Head-up дисплей", Category = "Технологии" },
            new CarFeature { Name = "Цифрово табло", Category = "Технологии" },
            new CarFeature { Name = "Безжично зареждане", Category = "Технологии" },
            new CarFeature { Name = "Задна камера", Category = "Технологии" },
            new CarFeature { Name = "360 камера", Category = "Технологии" },
            new CarFeature { Name = "Парктроник", Category = "Технологии" },
            new CarFeature { Name = "Keyless вход", Category = "Технологии" },

            new CarFeature { Name = "Круиз контрол", Category = "Безопасност" },
            new CarFeature { Name = "Адаптивен круиз контрол", Category = "Безопасност" },
            new CarFeature { Name = "Lane assist", Category = "Безопасност" },
            new CarFeature { Name = "Сензор за мъртва точка", Category = "Безопасност" },
            new CarFeature { Name = "ABS", Category = "Безопасност" },
            new CarFeature { Name = "ESP", Category = "Безопасност" },
            new CarFeature { Name = "Въздушни възглавници", Category = "Безопасност" },
            new CarFeature { Name = "ISOFIX", Category = "Безопасност" },

            new CarFeature { Name = "Климатроник", Category = "Комфорт" },
            new CarFeature { Name = "Двузонов климатроник", Category = "Комфорт" },
            new CarFeature { Name = "Автоматични чистачки", Category = "Комфорт" },
            new CarFeature { Name = "Автоматични фарове", Category = "Комфорт" },
            new CarFeature { Name = "Електрически огледала", Category = "Комфорт" },
            new CarFeature { Name = "Електрически стъкла", Category = "Комфорт" },
            new CarFeature { Name = "Електрически багажник", Category = "Комфорт" },

            new CarFeature { Name = "LED фарове", Category = "Екстериор" },
            new CarFeature { Name = "Ксенонови фарове", Category = "Екстериор" },
            new CarFeature { Name = "Алуминиеви джанти", Category = "Екстериор" },
            new CarFeature { Name = "Тонирани стъкла", Category = "Екстериор" },
            new CarFeature { Name = "Релси на покрива", Category = "Екстериор" },
            new CarFeature { Name = "Теглич", Category = "Екстериор" }
        ];
    }
}
