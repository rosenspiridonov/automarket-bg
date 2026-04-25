using System.ComponentModel;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CarMarketplace.Application.Common;

[TypeConverter(typeof(ListingSortOrderTypeConverter))]
public enum ListingSortOrder
{
    Newest,
    PriceAsc,
    PriceDesc,
    YearDesc,
    YearAsc,
    MileageAsc
}

public static class ListingSortOrderExtensions
{
    public static ListingSortOrder ParseOrDefault(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return ListingSortOrder.Newest;

        return value.ToLowerInvariant() switch
        {
            "newest" => ListingSortOrder.Newest,
            "price_asc" => ListingSortOrder.PriceAsc,
            "price_desc" => ListingSortOrder.PriceDesc,
            "year_desc" => ListingSortOrder.YearDesc,
            "year_asc" => ListingSortOrder.YearAsc,
            "mileage_asc" => ListingSortOrder.MileageAsc,
            _ => ListingSortOrder.Newest
        };
    }

    public static string ToWireFormat(this ListingSortOrder order) => order switch
    {
        ListingSortOrder.PriceAsc => "price_asc",
        ListingSortOrder.PriceDesc => "price_desc",
        ListingSortOrder.YearDesc => "year_desc",
        ListingSortOrder.YearAsc => "year_asc",
        ListingSortOrder.MileageAsc => "mileage_asc",
        _ => "newest"
    };
}

public class ListingSortOrderJsonConverter : JsonConverter<ListingSortOrder>
{
    public override ListingSortOrder Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        return ListingSortOrderExtensions.ParseOrDefault(value);
    }

    public override void Write(Utf8JsonWriter writer, ListingSortOrder value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToWireFormat());
    }
}

public class ListingSortOrderTypeConverter : TypeConverter
{
    public override bool CanConvertFrom(ITypeDescriptorContext? context, Type sourceType) =>
        sourceType == typeof(string) || base.CanConvertFrom(context, sourceType);

    public override object? ConvertFrom(ITypeDescriptorContext? context, CultureInfo? culture, object value)
    {
        if (value is string s) return ListingSortOrderExtensions.ParseOrDefault(s);
        return base.ConvertFrom(context, culture, value);
    }

    public override object? ConvertTo(ITypeDescriptorContext? context, CultureInfo? culture, object? value, Type destinationType)
    {
        if (destinationType == typeof(string) && value is ListingSortOrder order)
            return order.ToWireFormat();
        return base.ConvertTo(context, culture, value, destinationType);
    }
}
