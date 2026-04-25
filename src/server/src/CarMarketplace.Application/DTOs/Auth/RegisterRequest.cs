namespace CarMarketplace.Application.DTOs.Auth;

public record RegisterRequest
{
    public required string Email { get; init; }
    public required string UserName { get; init; }
    public required string Password { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? PhoneNumber { get; init; }
    public string? City { get; init; }
}
