namespace Shopera.Features.Identity.Authentication.Models;

public static class AuthErrorCodes
{
    public const string InvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string AccountInactive = "AUTH_ACCOUNT_INACTIVE";
    public const string UnsupportedRole = "AUTH_ROLE_UNSUPPORTED";
    public const string EmailAlreadyExists = "AUTH_EMAIL_ALREADY_EXISTS";
    public const string InvalidRole = "AUTH_ROLE_INVALID";
    public const string WeakPassword = "AUTH_PASSWORD_WEAK";
    public const string CurrentPasswordInvalid =
        "AUTH_CURRENT_PASSWORD_INVALID";
    public const string PasswordReuse = "AUTH_PASSWORD_REUSE";
    public const string ResetTokenInvalid =
        "AUTH_RESET_TOKEN_INVALID";
}
