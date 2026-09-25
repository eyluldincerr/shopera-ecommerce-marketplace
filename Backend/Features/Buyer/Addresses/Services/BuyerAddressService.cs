using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Buyer.Addresses.Contracts;
using Shopera.Features.Buyer.Addresses.DTOs;
using Shopera.Features.Buyer.Addresses.Models;

namespace Shopera.Features.Buyer.Addresses.Services
{
    public sealed class BuyerAddressService
        : IBuyerAddressService
    {
        private readonly ApplicationDbContext _dbContext;

        public BuyerAddressService(
            ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<ServiceResult<
            IReadOnlyList<BuyerAddressResponse>>> GetAllAsync(
            int buyerUserId)
        {
            if (!await IsActiveBuyerAsync(buyerUserId))
            {
                return Forbidden<
                    IReadOnlyList<BuyerAddressResponse>>();
            }

            var addresses = await _dbContext.BuyerAddresses
                .AsNoTracking()
                .Where(address =>
                    address.BuyerUserId == buyerUserId)
                .OrderByDescending(address =>
                    address.IsDefaultShipping)
                .ThenByDescending(address =>
                    address.IsDefaultBilling)
                .ThenBy(address => address.AddressId)
                .Select(address => new BuyerAddressResponse
                {
                    AddressId = address.AddressId,
                    AddressLabel = address.AddressLabel,
                    StreetAddress = address.StreetAddress,
                    City = address.City,
                    StateProvince = address.StateProvince,
                    PostalCode = address.PostalCode,
                    Country = address.Country,
                    IsDefaultShipping =
                        address.IsDefaultShipping,
                    IsDefaultBilling =
                        address.IsDefaultBilling
                })
                .ToListAsync();

            return ServiceResult<
                IReadOnlyList<BuyerAddressResponse>>.Success(
                addresses);
        }

        public async Task<ServiceResult<BuyerAddressResponse>>
            GetByIdAsync(
                int buyerUserId,
                int addressId)
        {
            if (!await IsActiveBuyerAsync(buyerUserId))
            {
                return Forbidden<BuyerAddressResponse>();
            }

            var address = await _dbContext.BuyerAddresses
                .AsNoTracking()
                .SingleOrDefaultAsync(item =>
                    item.AddressId == addressId &&
                    item.BuyerUserId == buyerUserId);

            return address is null
                ? NotFound()
                : ServiceResult<BuyerAddressResponse>.Success(
                    MapToResponse(address));
        }

        public async Task<ServiceResult<BuyerAddressResponse>>
            CreateAsync(
                int buyerUserId,
                CreateBuyerAddressRequest request)
        {
            if (!await IsActiveBuyerAsync(buyerUserId))
            {
                return Forbidden<BuyerAddressResponse>();
            }

            var streetAddress =
                NormalizeRequired(request.StreetAddress);
            var city = NormalizeRequired(request.City);
            var country = NormalizeRequired(request.Country);
            var postalCode =
                NormalizeOptional(request.PostalCode);

            if (streetAddress is null ||
                city is null ||
                country is null)
            {
                return Invalid(
                    "StreetAddress, City, and Country are " +
                    "required.");
            }

            if (await IsDuplicateAsync(
                    buyerUserId,
                    null,
                    streetAddress,
                    city,
                    postalCode,
                    country))
            {
                return Duplicate();
            }

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            await ClearOtherDefaultsAsync(
                buyerUserId,
                null,
                request.IsDefaultShipping,
                request.IsDefaultBilling);

            var address = new BuyerAddress
            {
                BuyerUserId = buyerUserId,
                AddressLabel =
                    NormalizeOptional(request.AddressLabel),
                StreetAddress = streetAddress,
                City = city,
                StateProvince =
                    NormalizeOptional(request.StateProvince),
                PostalCode = postalCode,
                Country = country,
                IsDefaultShipping =
                    request.IsDefaultShipping,
                IsDefaultBilling =
                    request.IsDefaultBilling
            };

            _dbContext.BuyerAddresses.Add(address);
            try
            {
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync();
                _dbContext.ChangeTracker.Clear();
                return Duplicate();
            }

            return ServiceResult<BuyerAddressResponse>.Success(
                MapToResponse(address));
        }

        public async Task<ServiceResult<BuyerAddressResponse>>
            UpdateAsync(
                int buyerUserId,
                int addressId,
                UpdateBuyerAddressRequest request)
        {
            if (!await IsActiveBuyerAsync(buyerUserId))
            {
                return Forbidden<BuyerAddressResponse>();
            }

            var address = await _dbContext.BuyerAddresses
                .SingleOrDefaultAsync(item =>
                    item.AddressId == addressId &&
                    item.BuyerUserId == buyerUserId);

            if (address is null)
            {
                return NotFound();
            }

            var streetAddress = NormalizeRequired(request.StreetAddress);
            var city = NormalizeRequired(request.City);
            var country = NormalizeRequired(request.Country);

            if (streetAddress is null ||
                city is null ||
                country is null)
            {
                return Invalid(
                    "StreetAddress, City, and Country cannot " +
                    "be empty.");
            }

            var postalCode = NormalizeOptional(request.PostalCode);

            if (await IsDuplicateAsync(
                    buyerUserId,
                    addressId,
                    streetAddress,
                    city,
                    postalCode,
                    country))
            {
                return Duplicate();
            }

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            await ClearOtherDefaultsAsync(
                buyerUserId,
                addressId,
                request.IsDefaultShipping,
                request.IsDefaultBilling);

            address.AddressLabel = NormalizeOptional(request.AddressLabel);
            address.StreetAddress = streetAddress;
            address.City = city;
            address.StateProvince = NormalizeOptional(request.StateProvince);
            address.PostalCode = postalCode;
            address.Country = country;
            address.IsDefaultShipping = request.IsDefaultShipping;
            address.IsDefaultBilling = request.IsDefaultBilling;

            try
            {
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync();
                _dbContext.ChangeTracker.Clear();
                return Duplicate();
            }

            return ServiceResult<BuyerAddressResponse>.Success(
                MapToResponse(address));
        }

        public async Task<ServiceResult<bool>> DeleteAsync(
            int buyerUserId,
            int addressId)
        {
            if (!await IsActiveBuyerAsync(buyerUserId))
            {
                return Forbidden<bool>();
            }

            var address = await _dbContext.BuyerAddresses
                .SingleOrDefaultAsync(item =>
                    item.AddressId == addressId &&
                    item.BuyerUserId == buyerUserId);

            if (address is null)
            {
                return ServiceResult<bool>.Failure(
                    BuyerAddressErrorCodes.AddressNotFound,
                    "The selected buyer address was not found.");
            }

            _dbContext.BuyerAddresses.Remove(address);
            await _dbContext.SaveChangesAsync();

            return ServiceResult<bool>.Success(true);
        }

        private async Task ClearOtherDefaultsAsync(
            int buyerUserId,
            int? excludedAddressId,
            bool clearShipping,
            bool clearBilling)
        {
            if (!clearShipping && !clearBilling)
            {
                return;
            }

            var addresses = await _dbContext.BuyerAddresses
                .Where(address =>
                    address.BuyerUserId == buyerUserId &&
                    (!excludedAddressId.HasValue ||
                     address.AddressId !=
                        excludedAddressId.Value) &&
                    ((clearShipping &&
                      address.IsDefaultShipping) ||
                     (clearBilling &&
                      address.IsDefaultBilling)))
                .ToListAsync();

            foreach (var address in addresses)
            {
                if (clearShipping)
                {
                    address.IsDefaultShipping = false;
                }

                if (clearBilling)
                {
                    address.IsDefaultBilling = false;
                }
            }
        }

        private async Task<bool> IsDuplicateAsync(
            int buyerUserId,
            int? excludedAddressId,
            string streetAddress,
            string city,
            string? postalCode,
            string country)
        {
            return await _dbContext.BuyerAddresses.AnyAsync(
                address =>
                    address.BuyerUserId == buyerUserId &&
                    (!excludedAddressId.HasValue ||
                     address.AddressId !=
                        excludedAddressId.Value) &&
                    address.StreetAddress == streetAddress &&
                    address.City == city &&
                    address.PostalCode == postalCode &&
                    address.Country == country);
        }

        private async Task<bool> IsActiveBuyerAsync(
            int buyerUserId)
        {
            return buyerUserId > 0 &&
                await _dbContext.UserAccounts
                    .AsNoTracking()
                    .AnyAsync(user =>
                        user.UserId == buyerUserId &&
                        user.Role == AccountRoles.Buyer &&
                        user.AccountStatus ==
                            AccountStatuses.Active);
        }

        private static BuyerAddressResponse MapToResponse(
            BuyerAddress address)
        {
            return new BuyerAddressResponse
            {
                AddressId = address.AddressId,
                AddressLabel = address.AddressLabel,
                StreetAddress = address.StreetAddress,
                City = address.City,
                StateProvince = address.StateProvince,
                PostalCode = address.PostalCode,
                Country = address.Country,
                IsDefaultShipping =
                    address.IsDefaultShipping,
                IsDefaultBilling =
                    address.IsDefaultBilling
            };
        }

        private static string? NormalizeRequired(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? NormalizeOptional(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static ServiceResult<T> Forbidden<T>()
        {
            return ServiceResult<T>.Failure(
                BuyerAddressErrorCodes.BuyerForbidden,
                "The supplied user is not an active buyer.");
        }

        private static ServiceResult<BuyerAddressResponse>
            NotFound()
        {
            return ServiceResult<BuyerAddressResponse>.Failure(
                BuyerAddressErrorCodes.AddressNotFound,
                "The selected buyer address was not found.");
        }

        private static ServiceResult<BuyerAddressResponse>
            Duplicate()
        {
            return ServiceResult<BuyerAddressResponse>.Failure(
                BuyerAddressErrorCodes.DuplicateAddress,
                "This address is already saved for the buyer.");
        }

        private static ServiceResult<BuyerAddressResponse>
            Invalid(string message)
        {
            return ServiceResult<BuyerAddressResponse>.Failure(
                BuyerAddressErrorCodes.InvalidAddress,
                message);
        }
    }
}
