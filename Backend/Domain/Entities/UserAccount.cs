namespace Shopera.Domain.Entities
{
    public sealed class UserAccount
    {
        public int UserId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public DateTime RegistrationDate { get; set; }

        public string Role { get; set; } = string.Empty;

        public string AccountStatus { get; set; } = string.Empty;

        public string? PermissionLevel { get; set; }
    }
}
