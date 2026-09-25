using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Admin.Coupons.DTOs;
using Shopera.Features.Admin.Coupons.Models;
using Shopera.Features.Admin.Coupons.Services;
using Shopera.Features.Cart.DTOs.Requests;
using Shopera.Features.Cart.Services;
using Shopera.Features.Coupons.Models;
using Shopera.Features.Coupons.Services;
using Shopera.Features.Orders.DTOs.Requests;
using Shopera.Features.Orders.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests;

public sealed class CouponIntegrationTests
{
    [Fact]
    public async Task AdminCoupon_CreateUpdateDisable_UsesExistingCouponTable()
    {
        await using var database = new TestDatabase();
        database.Context.UserAccounts.Add(TestData.ActiveAdmin(1));
        await database.Context.SaveChangesAsync();

        var service = new AdminCouponService(database.Context);
        var created = await service.CreateAsync(1, new CreateAdminCouponRequest
        {
            CouponCode = " summer20 ",
            DiscountType = DiscountTypes.Percentage,
            DiscountValue = 20m,
            ExpiryDate = DateTime.UtcNow.AddDays(30),
            MinPurchaseAmount = 100m,
            UsageLimit = 50,
            Status = CouponStatuses.Active
        });

        Assert.True(created.Succeeded);
        Assert.Equal("SUMMER20", created.Value!.CouponCode);
        Assert.False(created.Value.UsageTrackingEnforced);
        Assert.True(created.Value.IsUsable);

        var duplicate = await service.CreateAsync(1, new CreateAdminCouponRequest
        {
            CouponCode = "SUMMER20",
            DiscountType = DiscountTypes.FixedAmount,
            DiscountValue = 5m,
            ExpiryDate = DateTime.UtcNow.AddDays(10),
            Status = CouponStatuses.Active
        });
        Assert.False(duplicate.Succeeded);
        Assert.Equal(AdminCouponErrorCodes.DuplicateCoupon, duplicate.ErrorCode);

        var updated = await service.UpdateAsync(
            1,
            created.Value.CouponId,
            new UpdateAdminCouponRequest
            {
                DiscountValue = 15m,
                UpdateUsageLimit = true,
                UsageLimit = null
            });
        Assert.True(updated.Succeeded);
        Assert.Equal(15m, updated.Value!.DiscountValue);
        Assert.Null(updated.Value.UsageLimit);

        var disabled = await service.DisableAsync(1, created.Value.CouponId);
        Assert.True(disabled.Succeeded);
        Assert.Equal(
            CouponStatuses.Disabled,
            (await database.Context.Coupons.SingleAsync()).Status);
    }

    [Fact]
    public async Task BuyerCouponValidation_UsesAuthoritativeCurrentCartPrice()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        database.Context.Coupons.Add(new Coupon
        {
            CouponId = 700,
            CouponCode = "SAVE20",
            DiscountType = DiscountTypes.Percentage,
            DiscountValue = 20m,
            ExpiryDate = DateTime.UtcNow.AddDays(30),
            MinPurchaseAmount = 50m,
            UsageLimit = 1,
            Status = CouponStatuses.Active
        });
        await database.Context.SaveChangesAsync();

        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 2
        });

        ProductVariant variant = await database.Context.ProductVariants
            .SingleAsync(item => item.VariantId == 1000);
        variant.Price = 60m;
        await database.Context.SaveChangesAsync();

        var coupons = new CouponService(database.Context);
        var quote = await coupons.ValidateForCartAsync(20, "save20");

        Assert.Equal("SAVE20", quote.CouponCode);
        Assert.Equal(120m, quote.SubtotalAmount);
        Assert.Equal(24m, quote.DiscountAmount);
        Assert.Equal(96m, quote.TotalAmount);
        Assert.Equal("EUR", quote.CurrencyCode);
    }

    [Fact]
    public async Task Checkout_RevalidatesCouponAndStoresDiscountSnapshot()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        database.Context.Coupons.Add(new Coupon
        {
            CouponId = 701,
            CouponCode = "TENEURO",
            DiscountType = DiscountTypes.FixedAmount,
            DiscountValue = 10m,
            ExpiryDate = DateTime.UtcNow.AddDays(30),
            MinPurchaseAmount = 50m,
            UsageLimit = 1,
            Status = CouponStatuses.Active
        });
        await database.Context.SaveChangesAsync();

        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 2
        });

        var orders = new OrderService(
            database.Context,
            new FakeNotificationService(),
            cartService);
        var placed = await orders.CheckoutAsync(20, CheckoutRequest("TENEURO"));

        Assert.Equal("TENEURO", placed.CouponCode);
        Assert.Equal(99.98m, placed.Subtotal);
        Assert.Equal(10m, placed.DiscountAmount);
        Assert.Equal(89.98m, placed.TotalAmount);

        CustomerOrder stored = await database.Context.CustomerOrders.SingleAsync();
        Assert.Equal(701, stored.CouponId);
        Assert.Equal(10m, stored.DiscountAmount);
    }

    [Fact]
    public async Task BuyerCouponValidation_ReturnsTypedEligibilityConflicts()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        database.Context.Coupons.AddRange(
            new Coupon
            {
                CouponId = 702,
                CouponCode = "EXPIRED",
                DiscountType = DiscountTypes.FixedAmount,
                DiscountValue = 5m,
                ExpiryDate = DateTime.UtcNow.AddMinutes(-1),
                MinPurchaseAmount = 0m,
                Status = CouponStatuses.Active
            },
            new Coupon
            {
                CouponId = 703,
                CouponCode = "HIGHMIN",
                DiscountType = DiscountTypes.FixedAmount,
                DiscountValue = 5m,
                ExpiryDate = DateTime.UtcNow.AddDays(10),
                MinPurchaseAmount = 1000m,
                Status = CouponStatuses.Active
            },
            new Coupon
            {
                CouponId = 704,
                CouponCode = "OFF",
                DiscountType = DiscountTypes.FixedAmount,
                DiscountValue = 5m,
                ExpiryDate = DateTime.UtcNow.AddDays(10),
                MinPurchaseAmount = 0m,
                Status = CouponStatuses.Disabled
            },
            new Coupon
            {
                CouponId = 705,
                CouponCode = "STATUS-EXPIRED",
                DiscountType = DiscountTypes.FixedAmount,
                DiscountValue = 5m,
                ExpiryDate = DateTime.UtcNow.AddDays(10),
                MinPurchaseAmount = 0m,
                Status = CouponStatuses.Expired
            });
        await database.Context.SaveChangesAsync();

        var coupons = new CouponService(database.Context);

        var missing = await Assert.ThrowsAsync<RequestConflictException>(() =>
            coupons.ValidateForCartAsync(20, "MISSING"));
        Assert.Equal(CouponErrorCodes.NotFound, missing.Code);

        var expired = await Assert.ThrowsAsync<RequestConflictException>(() =>
            coupons.ValidateForCartAsync(20, "EXPIRED"));
        Assert.Equal(CouponErrorCodes.Expired, expired.Code);

        var minimum = await Assert.ThrowsAsync<RequestConflictException>(() =>
            coupons.ValidateForCartAsync(20, "HIGHMIN"));
        Assert.Equal(CouponErrorCodes.MinimumNotMet, minimum.Code);

        var inactive = await Assert.ThrowsAsync<RequestConflictException>(() =>
            coupons.ValidateForCartAsync(20, "OFF"));
        Assert.Equal(CouponErrorCodes.Inactive, inactive.Code);

        var statusExpired = await Assert.ThrowsAsync<RequestConflictException>(() =>
            coupons.ValidateForCartAsync(20, "STATUS-EXPIRED"));
        Assert.Equal(CouponErrorCodes.Expired, statusExpired.Code);
    }

    private static async Task SeedCommerceAsync(TestDatabase database)
    {
        var admin = TestData.ActiveAdmin(1);
        var seller = TestData.ActiveSeller(10);
        var buyer = TestData.ActiveBuyer(20, "Test Buyer");
        var store = TestData.ApprovedStore(30, seller.UserId);
        var category = TestData.Category(40, admin.UserId);
        var product = TestData.Product(100, store.StoreId, category.CategoryId);
        var variant = TestData.Variant(1000, product.ProductId, "SKU-1000", stock: 5);

        database.Context.AddRange(admin, seller, buyer, store, category, product, variant);
        await database.Context.SaveChangesAsync();
    }

    private static CheckoutRequest CheckoutRequest(string couponCode) => new()
    {
        CouponCode = couponCode,
        ShippingAddress = Address("SHIPPING"),
        BillingAddress = Address("BILLING")
    };

    private static CheckoutAddressRequest Address(string label) => new()
    {
        RecipientName = "Test Buyer",
        RecipientPhone = "+905551112233",
        StreetAddress = $"1 {label} Street",
        City = "Nicosia",
        PostalCode = "99010",
        Country = "Cyprus"
    };
}
