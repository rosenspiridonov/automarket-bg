using Microsoft.AspNetCore.Identity;

namespace CarMarketplace.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? City { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<CarListing> Listings { get; set; } = [];
    public ICollection<Favorite> Favorites { get; set; } = [];
    public ICollection<SavedSearch> SavedSearches { get; set; } = [];
}
