using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Buyer.Addresses.Controllers;
using Shopera.Features.Buyer.Addresses.DTOs;
using Shopera.Features.Buyer.Addresses.Models;
using Shopera.Features.Buyer.Addresses.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests;

public sealed class BuyerAddressContractTests
{
    [Fact]
    public void Controller_UsesBuyerJwtRouteAndPutUpdate()
    {
        Type controllerType = typeof(BuyerAddressesController);
        var route = controllerType.GetCustomAttribute<RouteAttribute>();
        var authorize = controllerType.GetCustomAttribute<AuthorizeAttribute>();
        MethodInfo update = controllerType.GetMethod(nameof(BuyerAddressesController.Update))!;
        var httpPut = update.GetCustomAttribute<HttpPutAttribute>();

        Assert.Equal("api/user/addresses", route?.Template);
        Assert.Equal(AccountRoles.Buyer, authorize?.Roles);
        Assert.Equal("{addressId:int}", httpPut?.Template);
        Assert.Null(update.GetCustomAttribute<HttpPatchAttribute>());
    }

    [Fact]
    public void JwtNameIdentifier_IsTheOnlyAddressOwnerInput()
    {
        var buyer = new ClaimsPrincipal(new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "41"),
                new Claim(ClaimTypes.Role, AccountRoles.Buyer)
            },
            "Bearer"));

        Assert.Equal(41, buyer.GetRequiredUserId());
        Assert.Throws<UnauthorizedAccessException>(
            () => new ClaimsPrincipal(new ClaimsIdentity()).GetRequiredUserId());
        Assert.Null(typeof(CreateBuyerAddressRequest).GetProperty("BuyerUserId"));
        Assert.Null(typeof(UpdateBuyerAddressRequest).GetProperty("BuyerUserId"));
    }

    [Fact]
    public void AddressRequests_EnforceSqlLengthsAndRequiredFields()
    {
        var invalid = new CreateBuyerAddressRequest
        {
            AddressLabel = new string('a', 51),
            StreetAddress = new string('s', 256),
            City = new string('c', 101),
            StateProvince = new string('p', 101),
            PostalCode = new string('z', 31),
            Country = ""
        };
        var results = new List<ValidationResult>();

        bool isValid = Validator.TryValidateObject(
            invalid,
            new ValidationContext(invalid),
            results,
            validateAllProperties: true);

        Assert.False(isValid);
        Assert.True(results.Count >= 6);
    }

    [Fact]
    public async Task Update_CompletelyReplacesAndClearsOptionalValues()
    {
        await using var database = new TestDatabase();
        var buyer = TestData.ActiveBuyer(10);
        database.Context.UserAccounts.Add(buyer);
        database.Context.BuyerAddresses.Add(new BuyerAddress
        {
            AddressId = 7,
            BuyerUserId = buyer.UserId,
            AddressLabel = "Home",
            StreetAddress = "Old Street",
            City = "Nicosia",
            StateProvince = "Old state",
            PostalCode = "99100",
            Country = "Cyprus",
            IsDefaultShipping = true,
            IsDefaultBilling = true
        });
        await database.Context.SaveChangesAsync();

        var service = new BuyerAddressService(database.Context);
        var result = await service.UpdateAsync(buyer.UserId, 7,
            new UpdateBuyerAddressRequest
            {
                AddressLabel = null,
                StreetAddress = "New Street",
                City = "Kyrenia",
                StateProvince = null,
                PostalCode = null,
                Country = "Cyprus",
                IsDefaultShipping = false,
                IsDefaultBilling = false
            });

        Assert.True(result.Succeeded);
        Assert.Null(result.Value!.AddressLabel);
        Assert.Null(result.Value.StateProvince);
        Assert.Null(result.Value.PostalCode);
        Assert.Equal("New Street", result.Value.StreetAddress);
        Assert.False(result.Value.IsDefaultShipping);
        Assert.False(result.Value.IsDefaultBilling);
    }

    [Fact]
    public async Task Defaults_AreClearedIndependentlyForTheSameBuyer()
    {
        await using var database = new TestDatabase();
        var buyer = TestData.ActiveBuyer(10);
        var otherBuyer = TestData.ActiveBuyer(11);
        database.Context.UserAccounts.AddRange(buyer, otherBuyer);
        database.Context.BuyerAddresses.AddRange(
            Address(1, buyer.UserId, "First", shipping: true, billing: true),
            Address(2, buyer.UserId, "Second"),
            Address(3, otherBuyer.UserId, "Other", shipping: true, billing: true));
        await database.Context.SaveChangesAsync();

        var service = new BuyerAddressService(database.Context);
        await service.UpdateAsync(buyer.UserId, 2, Update("Second", true, false));
        var addresses = await database.Context.BuyerAddresses.OrderBy(x => x.AddressId).ToListAsync();

        Assert.False(addresses[0].IsDefaultShipping);
        Assert.True(addresses[0].IsDefaultBilling);
        Assert.True(addresses[1].IsDefaultShipping);
        Assert.False(addresses[1].IsDefaultBilling);
        Assert.True(addresses[2].IsDefaultShipping);
        Assert.True(addresses[2].IsDefaultBilling);

        await service.UpdateAsync(buyer.UserId, 2, Update("Second", true, true));
        addresses = await database.Context.BuyerAddresses.OrderBy(x => x.AddressId).ToListAsync();
        Assert.False(addresses[0].IsDefaultBilling);
        Assert.True(addresses[1].IsDefaultBilling);
    }

    [Fact]
    public async Task Service_RejectsSellerAndForeignAddressAndReportsDuplicate()
    {
        await using var database = new TestDatabase();
        var buyer = TestData.ActiveBuyer(10);
        var seller = TestData.ActiveSeller(20);
        var otherBuyer = TestData.ActiveBuyer(11);
        database.Context.UserAccounts.AddRange(buyer, seller, otherBuyer);
        database.Context.BuyerAddresses.AddRange(
            Address(5, otherBuyer.UserId, "Private"),
            Address(6, buyer.UserId, "Duplicate"));
        await database.Context.SaveChangesAsync();
        var service = new BuyerAddressService(database.Context);

        var sellerResult = await service.GetAllAsync(seller.UserId);
        var foreignResult = await service.GetByIdAsync(buyer.UserId, 5);
        var duplicateResult = await service.CreateAsync(buyer.UserId,
            new CreateBuyerAddressRequest
            {
                StreetAddress = "Duplicate Street",
                City = "Nicosia",
                Country = "Cyprus"
            });

        Assert.Equal(BuyerAddressErrorCodes.BuyerForbidden, sellerResult.ErrorCode);
        Assert.Equal(BuyerAddressErrorCodes.AddressNotFound, foreignResult.ErrorCode);
        Assert.Equal(BuyerAddressErrorCodes.DuplicateAddress, duplicateResult.ErrorCode);
    }

    private static BuyerAddress Address(
        int addressId,
        int buyerUserId,
        string label,
        bool shipping = false,
        bool billing = false) => new()
        {
            AddressId = addressId,
            BuyerUserId = buyerUserId,
            AddressLabel = label,
            StreetAddress = $"{label} Street",
            City = "Nicosia",
            Country = "Cyprus",
            IsDefaultShipping = shipping,
            IsDefaultBilling = billing
        };

    private static UpdateBuyerAddressRequest Update(
        string label,
        bool shipping,
        bool billing) => new()
        {
            AddressLabel = label,
            StreetAddress = $"{label} Street",
            City = "Nicosia",
            StateProvince = null,
            PostalCode = null,
            Country = "Cyprus",
            IsDefaultShipping = shipping,
            IsDefaultBilling = billing
        };
}
