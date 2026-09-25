namespace Shopera.Features.Buyer.Addresses.Models
{
    public static class BuyerAddressErrorCodes
    {
        public const string BuyerForbidden = "BUYER_FORBIDDEN";
        public const string AddressNotFound =
            "BUYER_ADDRESS_NOT_FOUND";
        public const string DuplicateAddress =
            "BUYER_ADDRESS_DUPLICATE";
        public const string InvalidAddress =
            "BUYER_ADDRESS_INVALID";
    }
}
