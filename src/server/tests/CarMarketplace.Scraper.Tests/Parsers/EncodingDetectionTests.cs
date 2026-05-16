using CarMarketplace.Scraper.Parsers;

namespace CarMarketplace.Scraper.Tests.Parsers;

public class EncodingDetectionTests
{
    [Fact]
    public void LooksClean_PureAscii_ReturnsTrue()
    {
        const string asciiOnly = "<!DOCTYPE html><html><head></head><body>Hello world</body></html>";

        var result = MobileBgParser.LooksClean(asciiOnly);

        Assert.True(result);
    }

    [Fact]
    public void LooksClean_EmptyString_ReturnsTrue()
    {
        var result = MobileBgParser.LooksClean(string.Empty);

        Assert.True(result);
    }

    [Fact]
    public void LooksClean_CleanBulgarianText_ReturnsTrue()
    {
        const string cleanBulgarian = "Цена: 14 725 €. Автомобил Mercedes-Benz C 220, дизел, автоматична скоростна кутия.";

        var result = MobileBgParser.LooksClean(cleanBulgarian);

        Assert.True(result);
    }

    [Fact]
    public void LooksClean_ManyReplacementChars_ReturnsFalse()
    {
        var manyReplacements = new string('�', 50) + "abc";

        var result = MobileBgParser.LooksClean(manyReplacements);

        Assert.False(result);
    }

    [Fact]
    public void LooksClean_FewReplacementCharsInLongText_ReturnsTrue()
    {
        var longTextWithFewErrors = new string('a', 10_000) + "��";

        var result = MobileBgParser.LooksClean(longTextWithFewErrors);

        Assert.True(result);
    }

    [Fact]
    public void LooksClean_ReplacementRatioJustUnderOnePercent_ReturnsTrue()
    {
        var text = new string('a', 200) + new string('�', 1);

        var result = MobileBgParser.LooksClean(text);

        Assert.True(result);
    }

    [Fact]
    public void LooksClean_ReplacementRatioOverOnePercent_ReturnsFalse()
    {
        var text = new string('a', 50) + new string('�', 5);

        var result = MobileBgParser.LooksClean(text);

        Assert.False(result);
    }
}
