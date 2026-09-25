using Microsoft.EntityFrameworkCore;
using Shopera.Domain.Entities;
using Shopera.Features.Buyer.Addresses.DTOs;
using Shopera.Features.Buyer.Addresses.Models;
using Shopera.Features.Buyer.Addresses.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class BuyerAddressServiceTests
    {
        [Fact]
        public async Task CreateDefaultShipping_ClearsOldDefault()
        {
            await using var database = new TestDatabase();
            var buyer = TestData.ActiveBuyer(10);
            database.Context.UserAccounts.Add(buyer);
            database.Context.BuyerAddresses.Add(
                new BuyerAddress
                {
                    AddressId = 1,
                    BuyerUserId = buyer.UserId,
                    StreetAddress = "Old Street",
                    City = "Nicosia",
                    Country = "Cyprus",
                    IsDefaultShipping = true
                });
            await database.Context.SaveChangesAsync();

            var service =
                new BuyerAddressService(database.Context);

            var result = await service.CreateAsync(
                buyer.UserId,
                new CreateBuyerAddressRequest
                {
                    AddressLabel = "Home",
                    StreetAddress = "New Street 15",
                    City = "Nicosia",
                    Country = "Cyprus",
                    IsDefaultShipping = true
                });

            Assert.True(result.Succeeded);

            var addresses = await database.Context
                .BuyerAddresses
                .OrderBy(address => address.AddressId)
                .ToListAsync();

            Assert.Equal(2, addresses.Count);
            Assert.False(addresses[0].IsDefaultShipping);
            Assert.True(addresses[1].IsDefaultShipping);
        }

        [Fact]
        public async Task GetById_DoesNotExposeOtherBuyerAddress()
        {
            await using var database = new TestDatabase();
            var firstBuyer = TestData.ActiveBuyer(10);
            var secondBuyer = TestData.ActiveBuyer(
                11,
                "Second Buyer");
            database.Context.UserAccounts.AddRange(
                firstBuyer,
                secondBuyer);
            database.Context.BuyerAddresses.Add(
                new BuyerAddress
                {
                    AddressId = 5,
                    BuyerUserId = firstBuyer.UserId,
                    StreetAddress = "Private Street",
                    City = "Kyrenia",
                    Country = "Cyprus"
                });
            await database.Context.SaveChangesAsync();

            var service =
                new BuyerAddressService(database.Context);

            var result = await service.GetByIdAsync(
                secondBuyer.UserId,
                5);

            Assert.False(result.Succeeded);
            Assert.Equal(
                BuyerAddressErrorCodes.AddressNotFound,
                result.ErrorCode);
        }

        [Fact]
        public async Task Create_RejectsDuplicateAddress()
        {
            await using var database = new TestDatabase();
            var buyer = TestData.ActiveBuyer(10);
            database.Context.UserAccounts.Add(buyer);
            database.Context.BuyerAddresses.Add(
                new BuyerAddress
                {
                    BuyerUserId = buyer.UserId,
                    StreetAddress = "Same Street",
                    City = "Limassol",
                    PostalCode = "3100",
                    Country = "Cyprus"
                });
            await database.Context.SaveChangesAsync();

            var service =
                new BuyerAddressService(database.Context);

            var result = await service.CreateAsync(
                buyer.UserId,
                new CreateBuyerAddressRequest
                {
                    StreetAddress = "Same Street",
                    City = "Limassol",
                    PostalCode = "3100",
                    Country = "Cyprus"
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                BuyerAddressErrorCodes.DuplicateAddress,
                result.ErrorCode);
        }
    }
}
