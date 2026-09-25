using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Buyer.Addresses.Contracts;
using Shopera.Features.Buyer.Addresses.DTOs;
using Shopera.Features.Buyer.Addresses.Models;

namespace Shopera.Features.Buyer.Addresses.Controllers
{
    [ApiController]
    [Authorize(Roles = AccountRoles.Buyer)]
    [Route("api/user/addresses")]
    public sealed class BuyerAddressesController
        : ControllerBase
    {
        private readonly IBuyerAddressService _addressService;

        public BuyerAddressesController(
            IBuyerAddressService addressService)
        {
            _addressService = addressService;
        }

        [HttpGet]
        public async Task<ActionResult<
            IReadOnlyList<BuyerAddressResponse>>> GetAll()
        {
            var result = await _addressService.GetAllAsync(
                User.GetRequiredUserId());

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("{addressId:int}")]
        public async Task<ActionResult<BuyerAddressResponse>>
            GetById(
                int addressId)
        {
            if (addressId < 1)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid address",
                    detail: "Address ID must be greater than zero.");
            }

            var result = await _addressService.GetByIdAsync(
                User.GetRequiredUserId(),
                addressId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost]
        public async Task<ActionResult<BuyerAddressResponse>>
            Create(
                [FromBody] CreateBuyerAddressRequest request)
        {
            var result = await _addressService.CreateAsync(
                User.GetRequiredUserId(),
                request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return CreatedAtAction(
                nameof(GetById),
                new
                {
                    addressId = result.Value!.AddressId
                },
                result.Value);
        }

        [HttpPut("{addressId:int}")]
        public async Task<ActionResult<BuyerAddressResponse>>
            Update(
                int addressId,
                [FromBody] UpdateBuyerAddressRequest request)
        {
            if (addressId < 1)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid address",
                    detail: "Address ID must be greater than zero.");
            }

            var result = await _addressService.UpdateAsync(
                User.GetRequiredUserId(),
                addressId,
                request);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpDelete("{addressId:int}")]
        public async Task<IActionResult> Delete(
            int addressId)
        {
            if (addressId < 1)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid address",
                    detail: "Address ID must be greater than zero.");
            }

            var result = await _addressService.DeleteAsync(
                User.GetRequiredUserId(),
                addressId);

            return result.Succeeded
                ? NoContent()
                : Failure(result);
        }

        private ActionResult Failure<T>(
            ServiceResult<T> result)
        {
            var status = result.ErrorCode switch
            {
                BuyerAddressErrorCodes.BuyerForbidden =>
                    StatusCodes.Status403Forbidden,
                BuyerAddressErrorCodes.AddressNotFound =>
                    StatusCodes.Status404NotFound,
                BuyerAddressErrorCodes.DuplicateAddress =>
                    StatusCodes.Status409Conflict,
                _ => StatusCodes.Status400BadRequest
            };

            return Problem(
                statusCode: status,
                title: status switch
                {
                    StatusCodes.Status400BadRequest => "Invalid address",
                    StatusCodes.Status403Forbidden => "Buyer access required",
                    StatusCodes.Status404NotFound => "Address not found",
                    StatusCodes.Status409Conflict => "Address conflict",
                    _ => "Address request failed"
                },
                detail: result.ErrorMessage);
        }
    }
}
