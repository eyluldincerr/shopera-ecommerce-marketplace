namespace Shopera.Domain.Constants
{
    public static class AccountRoles
    {
        public const string Buyer = "BUYER";
        public const string Seller = "SELLER";
        public const string Admin = "ADMIN";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[] { Buyer, Seller, Admin },
                StringComparer.OrdinalIgnoreCase);
    }
}
