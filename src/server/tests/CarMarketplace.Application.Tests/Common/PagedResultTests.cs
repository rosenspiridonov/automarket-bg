using CarMarketplace.Application.Common;

namespace CarMarketplace.Application.Tests.Common;

public class PagedResultTests
{
    [Theory]
    [InlineData(100, 20, 5)]
    [InlineData(101, 20, 6)]
    [InlineData(0, 20, 0)]
    [InlineData(1, 20, 1)]
    [InlineData(20, 20, 1)]
    [InlineData(21, 10, 3)]
    public void TotalPages_CalculatesCorrectly(int totalCount, int pageSize, int expectedPages)
    {
        var result = new PagedResult<string>
        {
            TotalCount = totalCount,
            PageSize = pageSize,
            Page = 1
        };

        Assert.Equal(expectedPages, result.TotalPages);
    }

    [Theory]
    [InlineData(1, false)]
    [InlineData(2, true)]
    [InlineData(5, true)]
    public void HasPreviousPage_BasedOnCurrentPage(int page, bool expected)
    {
        var result = new PagedResult<string>
        {
            Page = page,
            PageSize = 10,
            TotalCount = 100
        };

        Assert.Equal(expected, result.HasPreviousPage);
    }

    [Theory]
    [InlineData(1, 10, 100, true)]
    [InlineData(10, 10, 100, false)]
    [InlineData(5, 20, 100, false)]
    [InlineData(3, 20, 100, true)]
    public void HasNextPage_BasedOnCurrentPageAndTotal(int page, int pageSize, int total, bool expected)
    {
        var result = new PagedResult<string>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };

        Assert.Equal(expected, result.HasNextPage);
    }
}
