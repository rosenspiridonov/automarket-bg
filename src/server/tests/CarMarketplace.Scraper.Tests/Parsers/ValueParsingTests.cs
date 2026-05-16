using CarMarketplace.Scraper.Parsers;

namespace CarMarketplace.Scraper.Tests.Parsers;

public class ValueParsingTests
{
    [Theory]
    [InlineData("14 725 €", 14725)]
    [InlineData("41 600 €", 41600)]
    [InlineData("1 500 €", 1500)]
    [InlineData("99999 €", 99999)]
    public void TryParsePrice_EuroAmount_ReturnsExpected(string input, decimal expected)
    {
        var result = MobileBgParser.TryParsePrice(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("28 799 лв", 28799)]
    [InlineData("81 362 лв.", 81362)]
    [InlineData("2 933 лева", 2933)]
    public void TryParsePrice_BgnAmount_ReturnsExpected(string input, decimal expected)
    {
        var result = MobileBgParser.TryParsePrice(input);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void TryParsePrice_BgnAmountWithDecimal_ParsesAsDecimal()
    {
        var result = MobileBgParser.TryParsePrice("81 362.53 лв.");

        Assert.Equal(81362.53m, result);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not a price")]
    [InlineData("free!")]
    [InlineData("€")]
    public void TryParsePrice_Garbage_ReturnsNull(string input)
    {
        var result = MobileBgParser.TryParsePrice(input);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("50 €")]
    [InlineData("1 €")]
    public void TryParsePrice_BelowMinimum_ReturnsNull(string input)
    {
        var result = MobileBgParser.TryParsePrice(input);

        Assert.Null(result);
    }

    [Fact]
    public void TryParsePrice_PrefersEuroOverBgn()
    {
        var result = MobileBgParser.TryParsePrice("14 725 € / 28 799 лв.");

        Assert.Equal(14725, result);
    }

    [Theory]
    [InlineData("275 813 км", 275813)]
    [InlineData("1 км", 1)]
    [InlineData("100000 km", 100000)]
    [InlineData("63 500 км", 63500)]
    public void TryParseMileage_ValidInput_ReturnsExpected(string input, int expected)
    {
        var result = MobileBgParser.TryParseMileage(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not a number")]
    [InlineData("км")]
    public void TryParseMileage_Garbage_ReturnsNull(string input)
    {
        var result = MobileBgParser.TryParseMileage(input);

        Assert.Null(result);
    }

    [Fact]
    public void TryParseMileage_AboveMaximum_ReturnsNull()
    {
        var result = MobileBgParser.TryParseMileage("9999999 км");

        Assert.Null(result);
    }

    [Theory]
    [InlineData("180 к.с.", 180)]
    [InlineData("475 к.с.", 475)]
    [InlineData("231 к.с.", 231)]
    [InlineData("68 к.с.", 68)]
    public void TryParseHorsePower_ValidInput_ReturnsExpected(string input, int expected)
    {
        var result = MobileBgParser.TryParseHorsePower(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("5 к.с.")]
    [InlineData("0 к.с.")]
    [InlineData("3000 к.с.")]
    public void TryParseHorsePower_OutOfRange_ReturnsNull(string input)
    {
        var result = MobileBgParser.TryParseHorsePower(input);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("октомври 2017", 2017)]
    [InlineData("април 2026", 2026)]
    [InlineData("януари 1995", 1995)]
    [InlineData("2020", 2020)]
    public void TryParseYear_ValidInput_ReturnsExpected(string input, int expected)
    {
        var result = MobileBgParser.TryParseYear(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("1979")]
    [InlineData("2099")]
    [InlineData("no year here")]
    public void TryParseYear_OutOfRange_ReturnsNull(string input)
    {
        var result = MobileBgParser.TryParseYear(input);

        Assert.Null(result);
    }
}
