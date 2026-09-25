using Shopera.Common.Exceptions;
using Shopera.Features.Cart.Models;

namespace Shopera.Features.Cart.Exceptions;

public sealed class CartStoreConflictException : RequestConflictException
{
    public CartStoreConflictException(
        int? existingStoreId = null,
        int? requestedStoreId = null)
        : base(
            CartErrorCodes.StoreConflict,
            "Your cart contains items from another store. Complete the current order or clear the cart before adding this item.",
            BuildExtensions(existingStoreId, requestedStoreId))
    {
    }

    private static IReadOnlyDictionary<string, object?> BuildExtensions(
        int? existingStoreId,
        int? requestedStoreId)
    {
        var values = new Dictionary<string, object?>();

        if (existingStoreId.HasValue)
        {
            values["existingStoreId"] = existingStoreId.Value;
        }

        if (requestedStoreId.HasValue)
        {
            values["requestedStoreId"] = requestedStoreId.Value;
        }

        return values;
    }
}
