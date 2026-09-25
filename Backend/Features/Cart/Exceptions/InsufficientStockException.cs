using Shopera.Common.Exceptions;
using Shopera.Features.Cart.Models;

namespace Shopera.Features.Cart.Exceptions;

public sealed class InsufficientStockException : RequestConflictException
{
    public InsufficientStockException(
        int variantId,
        int requestedQuantity,
        int? availableStock,
        Exception? innerException = null)
        : base(
            CartErrorCodes.InsufficientStock,
            "The requested quantity is no longer available.",
            BuildExtensions(variantId, requestedQuantity, availableStock),
            innerException)
    {
        VariantId = variantId;
        RequestedQuantity = requestedQuantity;
        AvailableStock = availableStock;
    }

    public int VariantId { get; }

    public int RequestedQuantity { get; }

    public int? AvailableStock { get; }

    private static IReadOnlyDictionary<string, object?> BuildExtensions(
        int variantId,
        int requestedQuantity,
        int? availableStock)
    {
        var values = new Dictionary<string, object?>
        {
            ["variantId"] = variantId,
            ["requestedQuantity"] = requestedQuantity
        };

        if (availableStock.HasValue)
        {
            values["availableStock"] = availableStock.Value;
        }

        return values;
    }
}
