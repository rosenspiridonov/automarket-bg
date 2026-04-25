namespace CarMarketplace.Domain.Common;

public static class ListingConstants
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 5000;
    public const int ImageUrlMaxLength = 500;
    public const decimal PriceMaxValue = 9_999_999_999m;
    public const int ScrapedListingExpirationDays = 90;
    public const int UserListingExpirationDays = 30;
}
