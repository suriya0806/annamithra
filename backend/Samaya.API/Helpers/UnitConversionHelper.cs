namespace Samaya.API.Helpers
{
    public static class UnitConversionHelper
    {
        /// <summary>
        /// Converts a quantity from one measurement unit to another (e.g. G to KG, ML to L).
        /// Returns the converted quantity if compatible, or original quantity if units match or are countable.
        /// </summary>
        public static decimal ConvertQuantity(decimal quantity, string? fromUnit, string? toUnit)
        {
            if (quantity == 0 || string.IsNullOrWhiteSpace(fromUnit) || string.IsNullOrWhiteSpace(toUnit))
                return quantity;

            var from = NormalizeUnit(fromUnit);
            var to = NormalizeUnit(toUnit);

            if (from == to)
                return quantity;

            // Weight conversions (Base = Grams)
            if (IsWeight(from) && IsWeight(to))
            {
                var grams = ToGrams(quantity, from);
                return FromGrams(grams, to);
            }

            // Volume conversions (Base = Milliliters)
            if (IsVolume(from) && IsVolume(to))
            {
                var ml = ToMilliliters(quantity, from);
                return FromMilliliters(ml, to);
            }

            // Density assumption fallback for liquid water/oil: 1g ≈ 1ml if mixed
            if (from == "g" && to == "l") return quantity / 1000m;
            if (from == "kg" && to == "ml") return quantity * 1000m;
            if (from == "ml" && to == "kg") return quantity / 1000m;
            if (from == "l" && to == "g") return quantity * 1000m;

            // Countable / Unknown units - return as is (1:1)
            return quantity;
        }

        public static string NormalizeUnit(string? unit)
        {
            if (string.IsNullOrWhiteSpace(unit)) return "";
            var u = unit.Trim().ToLowerInvariant();
            return u switch
            {
                "g" or "gm" or "gms" or "gram" or "grams" => "g",
                "kg" or "kgs" or "kilogram" or "kilograms" => "kg",
                "mg" or "milligram" or "milligrams" => "mg",
                "ml" or "mls" or "milliliter" or "milliliters" or "millilitre" or "millilitres" => "ml",
                "l" or "lt" or "lts" or "ltr" or "ltrs" or "liter" or "liters" or "litre" or "litres" => "l",
                "tbsp" or "tablespoon" or "tablespoons" => "tbsp",
                "tsp" or "teaspoon" or "teaspoons" => "tsp",
                "cup" or "cups" => "cup",
                "pcs" or "pc" or "piece" or "pieces" => "pcs",
                "nos" or "no" or "number" or "numbers" => "nos",
                "pack" or "packet" or "packets" or "packs" => "pack",
                "box" or "boxes" => "box",
                "portion" or "portions" => "portion",
                _ => u
            };
        }

        public static string FormatQuantityWithUnit(decimal quantity, string? unit)
        {
            var normalizedUnit = NormalizeUnit(unit);
            var displayUnit = string.IsNullOrWhiteSpace(unit) ? "" : unit.Trim();
            if (normalizedUnit == "g") displayUnit = "G";
            else if (normalizedUnit == "kg") displayUnit = "KG";
            else if (normalizedUnit == "ml") displayUnit = "ML";
            else if (normalizedUnit == "l") displayUnit = "L";
            else if (normalizedUnit == "mg") displayUnit = "MG";
            else if (normalizedUnit == "pcs") displayUnit = "PCS";

            var formattedNumber = (quantity % 1 == 0)
                ? quantity.ToString("0")
                : quantity.ToString("0.###");

            return string.IsNullOrWhiteSpace(displayUnit) ? formattedNumber : $"{formattedNumber} {displayUnit}";
        }

        private static bool IsWeight(string u) => u is "g" or "kg" or "mg";
        private static bool IsVolume(string u) => u is "ml" or "l" or "tbsp" or "tsp" or "cup";

        private static decimal ToGrams(decimal qty, string u) => u switch
        {
            "kg" => qty * 1000m,
            "g" => qty,
            "mg" => qty / 1000m,
            _ => qty
        };

        private static decimal FromGrams(decimal grams, string u) => u switch
        {
            "kg" => grams / 1000m,
            "g" => grams,
            "mg" => grams * 1000m,
            _ => grams
        };

        private static decimal ToMilliliters(decimal qty, string u) => u switch
        {
            "l" => qty * 1000m,
            "ml" => qty,
            "tbsp" => qty * 15m,
            "tsp" => qty * 5m,
            "cup" => qty * 250m,
            _ => qty
        };

        private static decimal FromMilliliters(decimal ml, string u) => u switch
        {
            "l" => ml / 1000m,
            "ml" => ml,
            "tbsp" => ml / 15m,
            "tsp" => ml / 5m,
            "cup" => ml / 250m,
            _ => ml
        };
    }
}
