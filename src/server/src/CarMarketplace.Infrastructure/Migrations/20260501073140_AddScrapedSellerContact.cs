using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarMarketplace.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScrapedSellerContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ScrapedSellerName",
                table: "CarListings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScrapedSellerPhone",
                table: "CarListings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScrapedSellerName",
                table: "CarListings");

            migrationBuilder.DropColumn(
                name: "ScrapedSellerPhone",
                table: "CarListings");
        }
    }
}
