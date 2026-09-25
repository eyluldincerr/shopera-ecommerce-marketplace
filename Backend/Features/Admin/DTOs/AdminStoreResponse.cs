namespace Shopera.Features.Admin.DTOs
{
    public sealed class AdminStoreResponse
    {
        public int StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
        public string? StoreSlug { get; set; }
        public string? StoreDescription { get; set; }
        public string? SupportEmail { get; set; }
        public string? SupportPhone { get; set; }
        public string? ReturnPolicy { get; set; }
        public string? SupportPolicy { get; set; }

        public int SellerUserId { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public string SellerEmail { get; set; } = string.Empty;
        public string? SellerPhoneNumber { get; set; }
        public DateTime SellerRegistrationDate { get; set; }
        public string SellerAccountStatus { get; set; } = string.Empty;
        public string SellerRole { get; set; } = string.Empty;

        // Compatibility aliases used by the separate Admin frontend.
        public int UserId => SellerUserId;
        public string OwnerName => SellerName;
        public string FullName => SellerName;
        public string Email => SellerEmail;
        public string? PhoneNumber => SellerPhoneNumber;
        public DateTime RegistrationDate => SellerRegistrationDate;
        public string AccountStatus => SellerAccountStatus;
        public string Role => SellerRole;
        public string Initials
        {
            get
            {
                string source = string.IsNullOrWhiteSpace(SellerName) ? StoreName : SellerName;
                string initials = string.Concat(source
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Take(2)
                    .Select(part => char.ToUpperInvariant(part[0])));
                return string.IsNullOrWhiteSpace(initials) ? "ST" : initials;
            }
        }

        public string ApprovalStatus { get; set; } = string.Empty;
        public string StoreStatus { get; set; } = string.Empty;
        public int? ApprovedByAdminUserId { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }
}
