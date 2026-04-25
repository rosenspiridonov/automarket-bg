using System.Text;
using CarMarketplace.Application.Common;
using CarMarketplace.Domain.Entities;
using CarMarketplace.Infrastructure;
using CarMarketplace.Infrastructure.Persistence;
using CarMarketplace.Infrastructure.Persistence.Seed;
using CarMarketplace.Scraper.Configuration;
using CarMarketplace.Scraper.Parsers;
using CarMarketplace.Scraper.Pipeline;
using CarMarketplace.Web.Middleware;
using CarMarketplace.Web.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Polly;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console());

builder.Services.AddInfrastructure(builder.Configuration);

System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

builder.Services.Configure<ScraperSettings>(builder.Configuration.GetSection(ScraperSettings.SectionName));

var scraperSettings = new ScraperSettings();
builder.Configuration.GetSection(ScraperSettings.SectionName).Bind(scraperSettings);

void ConfigureScraperHttpClient(HttpClient client)
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd(scraperSettings.UserAgent);
    client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(scraperSettings.AcceptLanguage);
    client.Timeout = TimeSpan.FromSeconds(scraperSettings.HttpTimeoutSeconds);
}

void ConfigureResilience(HttpStandardResilienceOptions options)
{
    var attemptTimeout = TimeSpan.FromSeconds(scraperSettings.HttpTimeoutSeconds);
    options.AttemptTimeout.Timeout = attemptTimeout;
    options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(
        scraperSettings.HttpTimeoutSeconds * (scraperSettings.Retry.MaxAttempts + 1));

    options.Retry.MaxRetryAttempts = scraperSettings.Retry.MaxAttempts;
    options.Retry.Delay = TimeSpan.FromMilliseconds(scraperSettings.Retry.BaseDelayMs);
    options.Retry.MaxDelay = TimeSpan.FromMilliseconds(scraperSettings.Retry.MaxDelayMs);
    options.Retry.BackoffType = DelayBackoffType.Exponential;
    options.Retry.UseJitter = true;

    // Polly requires SamplingDuration >= 2 * AttemptTimeout; clamp defensively
    // so a misconfigured appsettings value can't fail validation at startup.
    var configuredSampling = TimeSpan.FromSeconds(scraperSettings.CircuitBreaker.SamplingDurationSeconds);
    var minSampling = attemptTimeout * 2;
    options.CircuitBreaker.FailureRatio = scraperSettings.CircuitBreaker.FailureRatio;
    options.CircuitBreaker.SamplingDuration = configuredSampling >= minSampling ? configuredSampling : minSampling;
    options.CircuitBreaker.MinimumThroughput = scraperSettings.CircuitBreaker.MinimumThroughput;
    options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(scraperSettings.CircuitBreaker.BreakDurationSeconds);
}

builder.Services.AddHttpClient<MobileBgParser>(ConfigureScraperHttpClient)
    .AddStandardResilienceHandler(ConfigureResilience);

builder.Services.AddHttpClient<CarsBgParser>(ConfigureScraperHttpClient)
    .AddStandardResilienceHandler(ConfigureResilience);

builder.Services.AddTransient<IListingParser, MobileBgParser>();
builder.Services.AddTransient<IListingParser, CarsBgParser>();
builder.Services.AddTransient<ListingNormalizer>();
builder.Services.AddTransient<ScrapingPipeline>();
builder.Services.AddSingleton<ScraperBackgroundService>();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new ListingSortOrderJsonConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:6173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<GlobalExceptionHandler>();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await context.Database.MigrateAsync();
    await DataSeeder.SeedAsync(context);

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    await DataSeeder.SeedRolesAndAdminAsync(roleManager, userManager);
}

app.Run();
