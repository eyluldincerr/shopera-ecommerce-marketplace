using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Shopera.Common.Exceptions;
using Shopera.Common.Security;
using Shopera.Configuration;
using Shopera.Data;
using Shopera.Features.Admin.Categories.Contracts;
using Shopera.Features.Admin.Categories.Services;
using Shopera.Features.Admin.Contracts;
using Shopera.Features.Admin.Coupons.Contracts;
using Shopera.Features.Admin.Coupons.Services;
using Shopera.Features.Admin.Management.Contracts;
using Shopera.Features.Admin.Management.Services;
using Shopera.Features.Admin.Services;
using Shopera.Features.Buyer.Addresses.Contracts;
using Shopera.Features.Buyer.Addresses.Services;
using Shopera.Features.Buyer.Reviews.Contracts;
using Shopera.Features.Buyer.Reviews.Services;
using Shopera.Features.Buyer.Wishlist.Contracts;
using Shopera.Features.Buyer.Wishlist.Services;
using Shopera.Features.Cart.Contracts;
using Shopera.Features.Cart.Services;
using Shopera.Features.Catalogue.Contracts;
using Shopera.Features.Catalogue.Services;
using Shopera.Features.Coupons.Contracts;
using Shopera.Features.Coupons.Services;
using Shopera.Features.Identity.Authentication.Contracts;
using Shopera.Features.Identity.Authentication.Services;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.Hubs;
using Shopera.Features.Notifications.Services;
using Shopera.Features.Orders.Contracts;
using Shopera.Features.Orders.Services;
using Shopera.Features.Profile.Contracts;
using Shopera.Features.Profile.Services;
using Shopera.Features.Promotions.Services;
using Shopera.Features.Seller.Analytics.Contracts;
using Shopera.Features.Seller.Analytics.Services;
using Shopera.Features.Seller.Products.Contracts;
using Shopera.Features.Seller.Products.Services;
using Shopera.Features.Seller.Stores.Contracts;
using Shopera.Features.Seller.Stores.Services;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

string jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Jwt:Key is required. Configure it with user-secrets or an environment variable.");

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key must contain at least 32 characters.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                string token = context.Request.Query["access_token"].ToString();
                if (!string.IsNullOrWhiteSpace(token) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var dbContext = context.HttpContext.RequestServices
                    .GetRequiredService<ApplicationDbContext>();

                bool isAllowed = await JwtAccountValidator
                    .IsCurrentAccountAllowedAsync(
                        dbContext,
                        context.Principal!,
                        jwtKey,
                        context.HttpContext.RequestAborted);

                if (!isAllowed)
                {
                    context.Fail(
                        "The authenticated account is no longer active or its role has changed.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

// Keep expensive authentication endpoints resistant to brute-force and
// password-hashing denial-of-service attempts. These are intentionally
// IP-partitioned and in-memory; production multi-instance deployments should
// also enforce equivalent limits at the reverse proxy/API gateway.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new
            {
                code = "RATE_LIMITED",
                message = "Too many requests. Please wait and try again.",
                traceId = context.HttpContext.TraceIdentifier
            },
            cancellationToken);
    };

    options.AddPolicy(
        SecurityRateLimitPolicies.Login,
        context => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            }));

    options.AddPolicy(
        SecurityRateLimitPolicies.Registration,
        context => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            }));

    options.AddPolicy(
        SecurityRateLimitPolicies.PasswordRecovery,
        context => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            }));
});

// Bound request bodies before MVC/form parsing so oversized multipart uploads
// cannot consume the default 128 MB buffering allowance. Shopera's largest
// legitimate upload is an 8 MB promotion banner.
builder.WebHost.ConfigureKestrel(options =>
    options.Limits.MaxRequestBodySize = 10L * 1024L * 1024L);
builder.Services.Configure<FormOptions>(options =>
    options.MultipartBodyLengthLimit = 10L * 1024L * 1024L);

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Add controllers. Expected request/business exceptions are handled inside
// the MVC pipeline so normal 400/401/404/409 outcomes do not bubble out as
// debugger-stopping "User-Unhandled" exceptions. Unexpected failures still
// fall through to GlobalExceptionHandler.
builder.Services.AddScoped<SafeRequestExceptionFilter>();
builder.Services.AddControllers(options =>
    options.Filters.AddService<SafeRequestExceptionFilter>());

var frontendOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "Frontend",
        policy =>
        {
            if (frontendOrigins.Length > 0)
            {
                policy
                    .WithOrigins(frontendOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            }
        });
});
// Register SignalR. The explicit user-ID provider keeps Clients.User(...)
// aligned with the JWT NameIdentifier claim used throughout Shopera.
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, ShoperaUserIdProvider>();

// Register the notification service.
builder.Services.AddScoped<
    INotificationService,
    NotificationService>();

builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<ICouponService, CouponService>();
builder.Services.AddScoped<IProfileService, ProfileService>();

// Register the admin seller-approval and messaging service.
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAdminManagementService, AdminManagementService>();
builder.Services.AddScoped<
    IAdminCategoryService,
    AdminCategoryService>();
builder.Services.AddScoped<
    IAdminCouponService,
    AdminCouponService>();

// Register the buyer address and product review services.
builder.Services.AddScoped<
    IBuyerAddressService,
    BuyerAddressService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IWishlistService, WishlistService>();

// Register the seller-owned store submission service.
builder.Services.AddScoped<
    ISellerStoreService,
    SellerStoreService>();

// Register seller analytics backed by Order and financial snapshots.
builder.Services.AddScoped<ISellerAnalyticsService, SellerAnalyticsService>();

// Register seller catalogue management and public discovery.
builder.Services.AddScoped<
    ISellerProductService,
    SellerProductService>();
builder.Services.AddScoped<
    IProductCatalogueService,
    ProductCatalogueService>();

// Register product image validation service.
builder.Services.AddScoped<
    IProductImageValidator,
    ProductImageValidator>();

// Register product image service for handling binary uploads.
builder.Services.AddScoped<
    IProductImageService,
    ProductImageService>();

// Connect ApplicationDbContext to SQL Server.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException(
            "The DefaultConnection connection string was not found."
        )
    )
);

// After AddDbContext and other services
builder.Services.AddScoped<IPromotionService, PromotionService>();

// Ensure your DbContext includes the new tables
// (They should already be in your DbContext if you added DbSet<PromotionPlan> and DbSet<PromotionCampaign>)
// Add OpenAPI.
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

// Configure development-only endpoints.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseRouting();

if (frontendOrigins.Length > 0)
{
    app.UseCors("Frontend");
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map the SignalR notification endpoint.
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();

public partial class Program
{
}
