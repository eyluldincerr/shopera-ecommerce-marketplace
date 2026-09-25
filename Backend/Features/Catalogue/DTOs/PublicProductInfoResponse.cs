using System.Text.Json;

namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicProductInfoResponse
    {
        public JsonElement? ProductDetails { get; set; }

        public JsonElement? Specifications { get; set; }

        public JsonElement? WhatsInTheBox { get; set; }

        public string? WarrantyInformation { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? CareInstructions { get; set; }

        public string? AdditionalInformation { get; set; }
    }
}
