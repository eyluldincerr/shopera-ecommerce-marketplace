using Microsoft.EntityFrameworkCore;
using Shopera.Common.DTOs;
using Shopera.Common.Exceptions;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Admin.Management.Contracts;
using Shopera.Features.Admin.Management.DTOs;

namespace Shopera.Features.Admin.Management.Services;

public sealed class AdminManagementService : IAdminManagementService
{
    private const int MaximumPageSize = 100;
    private readonly ApplicationDbContext _dbContext;

    public AdminManagementService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<AdminUserResponse>> GetUsersAsync(int adminUserId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        return await _dbContext.UserAccounts.AsNoTracking()
            .OrderBy(user => user.UserId)
            .Select(user => new AdminUserResponse(
                user.UserId,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.Role,
                user.AccountStatus,
                user.PermissionLevel,
                user.RegistrationDate))
            .ToListAsync();
    }

    public async Task<AdminUserResponse> GetUserAsync(int adminUserId, int userId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(userId, "User ID");

        return await _dbContext.UserAccounts.AsNoTracking()
            .Where(user => user.UserId == userId)
            .Select(user => new AdminUserResponse(
                user.UserId,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.Role,
                user.AccountStatus,
                user.PermissionLevel,
                user.RegistrationDate))
            .SingleOrDefaultAsync()
            ?? throw new KeyNotFoundException("User was not found.");
    }

    public async Task UpdateUserStatusAsync(int adminUserId, int userId, string status)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(userId, "User ID");

        string normalized = NormalizeRequiredUpper(status, "Account status");
        if (normalized is not (AccountStatuses.Active or AccountStatuses.Inactive or AccountStatuses.Suspended))
        {
            throw new ArgumentException("Account status must be ACTIVE, INACTIVE, or SUSPENDED.");
        }

        if (userId == adminUserId)
        {
            throw Conflict(
                "ADMIN_SELF_STATUS_CHANGE_NOT_ALLOWED",
                "Administrators cannot change their own account status.");
        }

        var user = await _dbContext.UserAccounts
            .SingleOrDefaultAsync(item => item.UserId == userId)
            ?? throw new KeyNotFoundException("User was not found.");

        if (string.Equals(user.PermissionLevel, "SUPER_ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            throw Conflict(
                "SUPER_ADMIN_STATUS_CHANGE_NOT_ALLOWED",
                "SUPER_ADMIN accounts cannot be modified through this endpoint.");
        }

        if (string.Equals(user.AccountStatus, normalized, StringComparison.OrdinalIgnoreCase))
        {
            throw Conflict(
                "ACCOUNT_STATUS_UNCHANGED",
                $"User is already {normalized}.");
        }

        user.AccountStatus = normalized;
        await _dbContext.SaveChangesAsync();
    }

    public async Task<AdminStoreDetailsResponse> GetStoreAsync(int adminUserId, int storeId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(storeId, "Store ID");

        return await StoreDetailsQuery(storeId: storeId)
            .SingleOrDefaultAsync()
            ?? throw new KeyNotFoundException("Store was not found.");
    }

    public async Task<AdminStoreDetailsResponse> GetStoreBySellerAsync(
        int adminUserId,
        int sellerUserId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(sellerUserId, "Seller user ID");

        return await StoreDetailsQuery(sellerUserId: sellerUserId)
            .SingleOrDefaultAsync()
            ?? throw new KeyNotFoundException("Store was not found.");
    }

    public async Task<AdminStoreDetailsResponse> UpdateStoreStatusAsync(
        int adminUserId,
        int storeId,
        string status,
        string? decisionNote)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(storeId, "Store ID");

        string normalizedStatus = NormalizeRequiredUpper(status, "Store status");
        if (normalizedStatus is not (
                StoreStatuses.Active or
                StoreStatuses.Inactive or
                StoreStatuses.Suspended or
                StoreStatuses.Closed))
        {
            throw new ArgumentException(
                "Store status must be ACTIVE, INACTIVE, SUSPENDED, or CLOSED.");
        }

        Store store = await _dbContext.Stores
            .SingleOrDefaultAsync(item => item.StoreId == storeId)
            ?? throw new KeyNotFoundException("Store was not found.");

        UserAccount seller = await _dbContext.UserAccounts.AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == store.SellerUserId)
            ?? throw new KeyNotFoundException("The Store owner account was not found.");

        string previousApprovalStatus = store.ApprovalStatus;
        string previousStoreStatus = store.StoreStatus;
        string? note = NormalizeOptional(decisionNote);
        DateTime changedAt = DateTime.UtcNow;
        bool approvalChanged = false;

        if (normalizedStatus == StoreStatuses.Suspended)
        {
            if (store.ApprovalStatus is StoreApprovalStatuses.Pending or StoreApprovalStatuses.Rejected)
            {
                throw Conflict(
                    "STORE_SUSPENSION_NOT_ALLOWED",
                    "Only an approved Store can be suspended. Use the approval workflow for pending or rejected Stores.");
            }

            if (store.ApprovalStatus == StoreApprovalStatuses.Suspended &&
                store.StoreStatus == StoreStatuses.Suspended)
            {
                throw Conflict("STORE_STATUS_UNCHANGED", "Store is already SUSPENDED.");
            }

            if (store.ApprovalStatus != StoreApprovalStatuses.Suspended)
            {
                store.ApprovalStatus = StoreApprovalStatuses.Suspended;
                store.ApprovedByAdminUserId = adminUserId;
                approvalChanged = true;
            }

            store.StoreStatus = StoreStatuses.Suspended;
        }
        else
        {
            if (store.ApprovalStatus == StoreApprovalStatuses.Suspended)
            {
                store.ApprovalStatus = StoreApprovalStatuses.Approved;
                store.ApprovedByAdminUserId = adminUserId;
                approvalChanged = true;
            }
            else if (store.ApprovalStatus != StoreApprovalStatuses.Approved)
            {
                throw Conflict(
                    "STORE_STATUS_CHANGE_NOT_ALLOWED",
                    "The Store must be APPROVED before its operational status can be changed.");
            }

            if (normalizedStatus == StoreStatuses.Active &&
                seller.AccountStatus != AccountStatuses.Active)
            {
                throw Conflict(
                    "STORE_OWNER_NOT_ACTIVE",
                    "The Store cannot be activated while its owner account is not ACTIVE.");
            }

            if (previousStoreStatus == normalizedStatus && !approvalChanged)
            {
                throw Conflict(
                    "STORE_STATUS_UNCHANGED",
                    $"Store is already {normalizedStatus}.");
            }

            store.StoreStatus = normalizedStatus;
        }

        store.UpdatedDate = changedAt;

        if (approvalChanged)
        {
            _dbContext.StoreApprovalHistories.Add(new StoreApprovalHistory
            {
                StoreId = store.StoreId,
                OldStatus = previousApprovalStatus,
                NewStatus = store.ApprovalStatus,
                ChangedByAdminUserId = adminUserId,
                ChangedDate = changedAt,
                DecisionNote = note ?? (store.ApprovalStatus == StoreApprovalStatuses.Suspended
                    ? "Store suspended by an administrator."
                    : "Store restored by an administrator.")
            });
        }

        await _dbContext.SaveChangesAsync();

        return await StoreDetailsQuery(storeId: storeId)
            .SingleAsync();
    }

    public async Task<IReadOnlyList<PendingSellerResponse>> GetPendingSellersAsync(
        int adminUserId)
    {
        await EnsureActiveAdminAsync(adminUserId);

        return await (
                from store in _dbContext.Stores.AsNoTracking()
                join seller in _dbContext.UserAccounts.AsNoTracking()
                    on store.SellerUserId equals seller.UserId
                where store.ApprovalStatus == StoreApprovalStatuses.Pending
                orderby store.CreatedDate, store.StoreId
                select new PendingSellerResponse(
                    store.StoreId,
                    store.SellerUserId,
                    seller.FullName,
                    seller.Email,
                    seller.PhoneNumber,
                    seller.AccountStatus,
                    seller.Role,
                    store.StoreName,
                    store.StoreSlug,
                    store.StoreDescription,
                    store.SupportEmail,
                    store.SupportPhone,
                    store.ReturnPolicy,
                    store.SupportPolicy,
                    store.ApprovalStatus,
                    store.StoreStatus,
                    seller.RegistrationDate,
                    store.CreatedDate,
                    store.UpdatedDate,
                    store.ApprovedByAdminUserId))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<AdminStoreApprovalHistoryResponse>>
        GetStoreApprovalHistoryAsync(int adminUserId, int storeId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(storeId, "Store ID");

        if (!await _dbContext.Stores.AsNoTracking().AnyAsync(item => item.StoreId == storeId))
        {
            throw new KeyNotFoundException("Store was not found.");
        }

        return await _dbContext.StoreApprovalHistories.AsNoTracking()
            .Where(item => item.StoreId == storeId)
            .OrderByDescending(item => item.ChangedDate)
            .ThenByDescending(item => item.StoreApprovalHistoryId)
            .Select(item => new AdminStoreApprovalHistoryResponse(
                item.StoreApprovalHistoryId,
                item.OldStatus,
                item.NewStatus,
                item.ChangedByAdminUserId,
                item.ChangedDate,
                item.DecisionNote))
            .ToListAsync();
    }

    public async Task<PagedResponse<AdminProductSummaryResponse>> GetProductsAsync(
        int adminUserId,
        string? search,
        int? storeId,
        int? sellerUserId,
        int? categoryId,
        string? status,
        int page,
        int pageSize)
    {
        await EnsureActiveAdminAsync(adminUserId);
        (page, pageSize) = NormalizePage(page, pageSize);

        string? normalizedStatus = NormalizeOptionalUpper(status);
        if (normalizedStatus is not null && !ProductStatuses.All.Contains(normalizedStatus))
        {
            throw new ArgumentException("Invalid product status.");
        }

        var query =
            from product in _dbContext.Products.AsNoTracking()
            join store in _dbContext.Stores.AsNoTracking()
                on product.StoreId equals store.StoreId
            join seller in _dbContext.UserAccounts.AsNoTracking()
                on store.SellerUserId equals seller.UserId
            join category in _dbContext.Categories.AsNoTracking()
                on product.CategoryId equals category.CategoryId
            select new
            {
                Product = product,
                Store = store,
                Seller = seller,
                Category = category
            };

        if (storeId.HasValue)
        {
            query = query.Where(item => item.Product.StoreId == storeId.Value);
        }
        if (sellerUserId.HasValue)
        {
            query = query.Where(item => item.Store.SellerUserId == sellerUserId.Value);
        }
        if (categoryId.HasValue)
        {
            query = query.Where(item => item.Product.CategoryId == categoryId.Value);
        }
        if (normalizedStatus is not null)
        {
            query = query.Where(item => item.Product.Status == normalizedStatus);
        }

        string? normalizedSearch = NormalizeOptional(search);
        if (normalizedSearch is not null)
        {
            string pattern = $"%{normalizedSearch}%";
            bool hasNumericSearch = int.TryParse(normalizedSearch, out int numericSearchId);
            query = query.Where(item =>
                EF.Functions.Like(item.Product.ProductName, pattern) ||
                (item.Product.Brand != null && EF.Functions.Like(item.Product.Brand, pattern)) ||
                (item.Product.ModelNumber != null && EF.Functions.Like(item.Product.ModelNumber, pattern)) ||
                EF.Functions.Like(item.Product.ProductCondition, pattern) ||
                EF.Functions.Like(item.Store.StoreName, pattern) ||
                EF.Functions.Like(item.Seller.FullName, pattern) ||
                (hasNumericSearch && item.Product.ProductId == numericSearchId));
        }

        int totalCount = await query.CountAsync();

        var rows = await query
            .OrderByDescending(item => item.Product.CreatedDate)
            .ThenBy(item => item.Product.ProductId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new
            {
                item.Product.ProductId,
                item.Product.ProductName,
                item.Product.Brand,
                item.Product.StoreId,
                item.Store.StoreName,
                SellerUserId = item.Store.SellerUserId,
                item.Product.CategoryId,
                item.Category.CategoryName,
                item.Product.Status,
                item.Product.ProductCondition,
                StoreApprovalStatus = item.Store.ApprovalStatus,
                item.Store.StoreStatus,
                MinimumPrice = _dbContext.ProductVariants
                    .Where(variant => variant.ProductId == item.Product.ProductId)
                    .Select(variant => (decimal?)variant.Price)
                    .Min(),
                MaximumPrice = _dbContext.ProductVariants
                    .Where(variant => variant.ProductId == item.Product.ProductId)
                    .Select(variant => (decimal?)variant.Price)
                    .Max(),
                VariantCount = _dbContext.ProductVariants
                    .Count(variant => variant.ProductId == item.Product.ProductId),
                TotalStock = _dbContext.ProductVariants
                    .Where(variant => variant.ProductId == item.Product.ProductId)
                    .Sum(variant => (int?)variant.StockQuantity) ?? 0,
                PrimaryImageId = _dbContext.ProductImages
                    .Where(image => image.ProductId == item.Product.ProductId)
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.DisplayOrder)
                    .ThenBy(image => image.ImageId)
                    .Select(image => (int?)image.ImageId)
                    .FirstOrDefault(),
                PrimaryImageAlt = _dbContext.ProductImages
                    .Where(image => image.ProductId == item.Product.ProductId)
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.DisplayOrder)
                    .ThenBy(image => image.ImageId)
                    .Select(image => image.AltText)
                    .FirstOrDefault(),
                HasSellableVariant = _dbContext.ProductVariants.Any(variant =>
                    variant.ProductId == item.Product.ProductId &&
                    variant.Status == ProductVariantStatuses.Active &&
                    variant.StockQuantity > 0),
                item.Product.CreatedDate
            })
            .ToListAsync();

        var items = rows.Select(row =>
        {
            bool storeCanOperate =
                row.StoreApprovalStatus == StoreApprovalStatuses.Approved &&
                row.StoreStatus == StoreStatuses.Active;
            return new AdminProductSummaryResponse(
                row.ProductId,
                row.ProductName,
                row.Brand,
                row.StoreId,
                row.StoreName,
                row.SellerUserId,
                row.CategoryId,
                row.CategoryName,
                row.Status,
                row.ProductCondition,
                row.MinimumPrice,
                row.MaximumPrice,
                row.VariantCount,
                row.TotalStock,
                row.PrimaryImageId.HasValue ? ProductImageUrl(row.PrimaryImageId.Value) : null,
                row.PrimaryImageAlt,
                row.StoreApprovalStatus,
                row.StoreStatus,
                storeCanOperate,
                row.Status == ProductStatuses.Active && storeCanOperate && row.HasSellableVariant,
                row.CreatedDate);
        }).ToList();

        return new PagedResponse<AdminProductSummaryResponse>(
            items,
            page,
            pageSize,
            totalCount);
    }

    public async Task<AdminProductDetailsResponse> GetProductAsync(
        int adminUserId,
        int productId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(productId, "Product ID");

        var product = await (
                from item in _dbContext.Products.AsNoTracking()
                join store in _dbContext.Stores.AsNoTracking()
                    on item.StoreId equals store.StoreId
                join category in _dbContext.Categories.AsNoTracking()
                    on item.CategoryId equals category.CategoryId
                where item.ProductId == productId
                select new
                {
                    Product = item,
                    StoreName = store.StoreName,
                    SellerUserId = store.SellerUserId,
                    StoreApprovalStatus = store.ApprovalStatus,
                    store.StoreStatus,
                    CategoryName = category.CategoryName
                })
            .SingleOrDefaultAsync()
            ?? throw new KeyNotFoundException("Product was not found.");

        var info = await _dbContext.ProductInfos.AsNoTracking()
            .Where(item => item.ProductId == productId)
            .Select(item => new AdminProductInfoResponse(
                item.ProductDetails,
                item.Specifications,
                item.WhatsInTheBox,
                item.WarrantyInformation,
                item.ReturnPolicy,
                item.CareInstructions,
                item.AdditionalInformation,
                item.CreatedDate,
                item.UpdatedDate))
            .SingleOrDefaultAsync();

        // Important: only metadata/IDs are projected here. ImageData stays out of JSON.
        var imageRows = await _dbContext.ProductImages.AsNoTracking()
            .Where(image => image.ProductId == productId)
            .OrderBy(image => image.DisplayOrder)
            .ThenBy(image => image.ImageId)
            .Select(image => new
            {
                image.ImageId,
                image.AltText,
                image.DisplayOrder,
                image.IsPrimary
            })
            .ToListAsync();

        var images = imageRows.Select(image => new AdminProductImageResponse(
            image.ImageId,
            ProductImageUrl(image.ImageId),
            image.AltText,
            image.DisplayOrder,
            image.IsPrimary)).ToList();

        var variants = await _dbContext.ProductVariants.AsNoTracking()
            .Where(variant => variant.ProductId == productId)
            .OrderBy(variant => variant.VariantId)
            .Select(variant => new AdminProductVariantResponse(
                variant.VariantId,
                variant.Sku,
                variant.VariantName,
                variant.Size,
                variant.Color,
                variant.StorageCapacity,
                variant.Price,
                variant.StockQuantity,
                variant.Status,
                variant.CreatedDate))
            .ToListAsync();

        return new AdminProductDetailsResponse(
            product.Product.ProductId,
            product.Product.ProductName,
            product.Product.ShortDescription,
            product.Product.Description,
            product.Product.Brand,
            product.Product.ModelNumber,
            product.Product.ProductCondition,
            product.Product.ConditionDescription,
            product.Product.Status,
            product.Product.CreatedDate,
            product.Product.StoreId,
            product.StoreName,
            product.SellerUserId,
            product.StoreApprovalStatus,
            product.StoreStatus,
            product.Product.CategoryId,
            product.CategoryName,
            info,
            images,
            variants);
    }

    public async Task<AdminProductDetailsResponse> UpdateProductStatusAsync(
        int adminUserId,
        int productId,
        string status)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(productId, "Product ID");

        string normalizedStatus = NormalizeRequiredUpper(status, "Product status");
        if (normalizedStatus is not (
                ProductStatuses.Active or
                ProductStatuses.Inactive or
                ProductStatuses.Deleted))
        {
            throw new ArgumentException(
                "Admin product status must be ACTIVE, INACTIVE, or DELETED.");
        }

        Product product = await _dbContext.Products
            .SingleOrDefaultAsync(item => item.ProductId == productId)
            ?? throw new KeyNotFoundException("Product was not found.");

        if (product.Status == normalizedStatus)
        {
            throw Conflict(
                "PRODUCT_STATUS_UNCHANGED",
                $"Product is already {normalizedStatus}.");
        }

        if (product.Status == ProductStatuses.Deleted &&
            normalizedStatus == ProductStatuses.Active)
        {
            throw Conflict(
                "PRODUCT_RESTORE_REQUIRED",
                "Restore the deleted Product to INACTIVE before activating it.");
        }

        if (normalizedStatus == ProductStatuses.Active)
        {
            var ownership = await (
                    from store in _dbContext.Stores.AsNoTracking()
                    join seller in _dbContext.UserAccounts.AsNoTracking()
                        on store.SellerUserId equals seller.UserId
                    where store.StoreId == product.StoreId
                    select new
                    {
                        store.ApprovalStatus,
                        store.StoreStatus,
                        seller.AccountStatus
                    })
                .SingleOrDefaultAsync()
                ?? throw new KeyNotFoundException("The Product Store was not found.");

            if (ownership.ApprovalStatus != StoreApprovalStatuses.Approved ||
                ownership.StoreStatus != StoreStatuses.Active ||
                ownership.AccountStatus != AccountStatuses.Active)
            {
                throw Conflict(
                    "PRODUCT_ACTIVATION_NOT_ALLOWED",
                    "The Product cannot be activated unless its Store is approved and active and its owner account is ACTIVE.");
            }
        }

        product.Status = normalizedStatus;
        await _dbContext.SaveChangesAsync();

        return await GetProductAsync(adminUserId, productId);
    }

    public async Task<PagedResponse<AdminOrderSummaryResponse>> GetOrdersAsync(
        int adminUserId,
        string? search,
        int? buyerUserId,
        int? storeId,
        int? sellerUserId,
        string? orderStatus,
        string? paymentStatus,
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize)
    {
        await EnsureActiveAdminAsync(adminUserId);
        (page, pageSize) = NormalizePage(page, pageSize);

        string? normalizedOrderStatus = NormalizeOptionalUpper(orderStatus);
        if (normalizedOrderStatus is not null && !OrderStatuses.All.Contains(normalizedOrderStatus))
        {
            throw new ArgumentException("Invalid order status.");
        }
        if (from.HasValue && to.HasValue && from.Value.Date > to.Value.Date)
        {
            throw new ArgumentException("The from date cannot be later than the to date.");
        }

        string? normalizedPaymentStatus = NormalizeOptionalUpper(paymentStatus);
        DateTime? inclusiveFrom = from?.Date;
        DateTime? exclusiveTo = to?.Date.AddDays(1);

        var query =
            from order in _dbContext.CustomerOrders.AsNoTracking()
            join buyer in _dbContext.UserAccounts.AsNoTracking()
                on order.BuyerUserId equals buyer.UserId
            join store in _dbContext.Stores.AsNoTracking()
                on order.StoreId equals store.StoreId
            select new
            {
                Order = order,
                Buyer = buyer,
                Store = store
            };

        if (buyerUserId.HasValue)
        {
            query = query.Where(item => item.Order.BuyerUserId == buyerUserId.Value);
        }
        if (storeId.HasValue)
        {
            query = query.Where(item => item.Order.StoreId == storeId.Value);
        }
        if (sellerUserId.HasValue)
        {
            query = query.Where(item => item.Store.SellerUserId == sellerUserId.Value);
        }
        if (normalizedOrderStatus is not null)
        {
            query = query.Where(item => item.Order.OrderStatus == normalizedOrderStatus);
        }
        if (normalizedPaymentStatus is not null)
        {
            query = query.Where(item => _dbContext.Payments.Any(payment =>
                payment.OrderId == item.Order.OrderId &&
                payment.PaymentStatus == normalizedPaymentStatus));
        }
        if (inclusiveFrom.HasValue)
        {
            query = query.Where(item => item.Order.OrderDate >= inclusiveFrom.Value);
        }
        if (exclusiveTo.HasValue)
        {
            query = query.Where(item => item.Order.OrderDate < exclusiveTo.Value);
        }

        string? normalizedSearch = NormalizeOptional(search);
        if (normalizedSearch is not null)
        {
            string pattern = $"%{normalizedSearch}%";
            bool hasNumericSearch = int.TryParse(normalizedSearch, out int numericSearchId);
            query = query.Where(item =>
                EF.Functions.Like(item.Order.OrderNumber, pattern) ||
                EF.Functions.Like(item.Buyer.FullName, pattern) ||
                EF.Functions.Like(item.Buyer.Email, pattern) ||
                EF.Functions.Like(item.Store.StoreName, pattern) ||
                (hasNumericSearch && (item.Order.OrderId == numericSearchId ||
                                      item.Order.BuyerUserId == numericSearchId)));
        }

        int totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(item => item.Order.OrderDate)
            .ThenByDescending(item => item.Order.OrderId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new AdminOrderSummaryResponse(
                item.Order.OrderId,
                item.Order.OrderNumber,
                item.Order.BuyerUserId,
                item.Buyer.FullName,
                item.Buyer.Email,
                item.Order.StoreId,
                item.Store.StoreName,
                item.Order.OrderStatus,
                _dbContext.Payments
                    .Where(payment => payment.OrderId == item.Order.OrderId)
                    .OrderByDescending(payment => payment.CreatedDate)
                    .ThenByDescending(payment => payment.PaymentId)
                    .Select(payment => payment.PaymentStatus)
                    .FirstOrDefault() ?? "NO_PAYMENT",
                _dbContext.Shipments
                    .Where(shipment => shipment.OrderId == item.Order.OrderId)
                    .OrderByDescending(shipment => shipment.ShipmentId)
                    .Select(shipment => shipment.ShipmentStatus)
                    .FirstOrDefault() ?? "NO_SHIPMENT",
                item.Order.TotalAmount,
                item.Order.CurrencyCode,
                item.Order.OrderDate,
                _dbContext.OrderItems
                    .Where(orderItem => orderItem.OrderId == item.Order.OrderId)
                    .Sum(orderItem => (int?)orderItem.Quantity) ?? 0))
            .ToListAsync();

        return new PagedResponse<AdminOrderSummaryResponse>(
            items,
            page,
            pageSize,
            totalCount);
    }

    public async Task<AdminOrderDetailsResponse> GetOrderAsync(int adminUserId, int orderId)
    {
        await EnsureActiveAdminAsync(adminUserId);
        ValidateId(orderId, "Order ID");

        var order = await (
                from item in _dbContext.CustomerOrders.AsNoTracking()
                join buyer in _dbContext.UserAccounts.AsNoTracking()
                    on item.BuyerUserId equals buyer.UserId
                join store in _dbContext.Stores.AsNoTracking()
                    on item.StoreId equals store.StoreId
                where item.OrderId == orderId
                select new
                {
                    Order = item,
                    BuyerName = buyer.FullName,
                    BuyerEmail = buyer.Email,
                    StoreName = store.StoreName,
                    SellerUserId = store.SellerUserId
                })
            .SingleOrDefaultAsync()
            ?? throw new KeyNotFoundException("Order was not found.");

        var items = await _dbContext.OrderItems.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .OrderBy(item => item.OrderItemId)
            .Select(item => new AdminOrderItemResponse(
                item.OrderItemId,
                item.VariantId,
                item.ProductNameAtPurchase,
                item.SkuAtPurchase,
                item.VariantNameAtPurchase,
                item.Quantity,
                item.UnitPriceAtPurchase))
            .ToListAsync();

        var addresses = await _dbContext.OrderAddresses.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .OrderBy(item => item.OrderAddressId)
            .Select(item => new AdminOrderAddressResponse(
                item.OrderAddressId,
                item.AddressType,
                item.RecipientName,
                item.RecipientPhone,
                item.StreetAddress,
                item.City,
                item.StateProvince,
                item.PostalCode,
                item.Country))
            .ToListAsync();

        var payments = await _dbContext.Payments.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .OrderByDescending(item => item.CreatedDate)
            .ThenByDescending(item => item.PaymentId)
            .Select(item => new AdminPaymentResponse(
                item.PaymentId,
                item.Amount,
                item.PaymentMethod,
                item.PaymentStatus,
                item.CreatedDate,
                item.PaymentDate,
                item.TransactionReference))
            .ToListAsync();

        var shipments = await _dbContext.Shipments.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .OrderByDescending(item => item.ShipmentId)
            .Select(item => new AdminShipmentResponse(
                item.ShipmentId,
                item.CourierName,
                item.TrackingNumber,
                item.ShipmentStatus,
                item.ShippedDate,
                item.DeliveredDate,
                item.ShippingCost))
            .ToListAsync();

        var history = await _dbContext.OrderStatusHistories.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .OrderBy(item => item.ChangedDate)
            .ThenBy(item => item.OrderStatusHistoryId)
            .Select(item => new AdminOrderHistoryResponse(
                item.OrderStatusHistoryId,
                item.OldStatus,
                item.NewStatus,
                item.ChangedDate,
                item.ChangedByUserId,
                item.ChangeNote))
            .ToListAsync();

        var financial = await _dbContext.OrderSellerFinancials.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .Select(item => new AdminSellerFinancialResponse(
                item.GrossSalesAmount,
                item.SellerDiscountAmount,
                item.CommissionAmount,
                item.RefundAmount,
                item.CostOfGoodsAmount,
                item.SellerNetAmount,
                item.EstimatedProfitAmount,
                item.CurrencyCode,
                item.CalculatedDate))
            .SingleOrDefaultAsync();

        return new AdminOrderDetailsResponse(
            order.Order.OrderId,
            order.Order.OrderNumber,
            order.Order.BuyerUserId,
            order.BuyerName,
            order.BuyerEmail,
            order.Order.StoreId,
            order.StoreName,
            order.SellerUserId,
            order.Order.OrderDate,
            order.Order.OrderStatus,
            order.Order.SubtotalAmount,
            order.Order.DiscountAmount,
            order.Order.ShippingAmount,
            order.Order.TotalAmount,
            order.Order.CurrencyCode,
            items,
            addresses,
            payments,
            shipments,
            history,
            financial);
    }

    public async Task<AdminDashboardResponse> GetDashboardAsync(int adminUserId)
    {
        await EnsureActiveAdminAsync(adminUserId);

        int totalUsers = await _dbContext.UserAccounts.AsNoTracking().CountAsync();
        int approvedStores = await _dbContext.Stores.AsNoTracking()
            .CountAsync(store => store.ApprovalStatus == StoreApprovalStatuses.Approved);
        int pendingStores = await _dbContext.Stores.AsNoTracking()
            .CountAsync(store => store.ApprovalStatus == StoreApprovalStatuses.Pending);
        int totalOrders = await _dbContext.CustomerOrders.AsNoTracking().CountAsync();

        // Shopera payment is intentionally postponed. Revenue/sales metrics are
        // therefore derived only from authoritative DELIVERED orders.
        var deliveredSalesRows = await _dbContext.CustomerOrders.AsNoTracking()
            .Where(order => order.OrderStatus == OrderStatuses.Delivered)
            .GroupBy(order => order.CurrencyCode)
            .Select(group => new
            {
                CurrencyCode = group.Key,
                Amount = group.Sum(order => order.TotalAmount)
            })
            .OrderBy(row => row.CurrencyCode)
            .ToListAsync();

        var deliveredSales = deliveredSalesRows
            .Select(row => new AdminDeliveredSalesResponse(
                row.CurrencyCode,
                row.Amount))
            .ToList();

        return new AdminDashboardResponse(
            totalUsers,
            approvedStores,
            pendingStores,
            totalOrders,
            deliveredSales);
    }

    public async Task<AdminSalesAnalyticsResponse> GetSalesAnalyticsAsync(
        int adminUserId,
        string currencyCode,
        DateTime? from,
        DateTime? to)
    {
        await EnsureActiveAdminAsync(adminUserId);

        string normalizedCurrency = (currencyCode ?? string.Empty).Trim().ToUpperInvariant();
        if (normalizedCurrency.Length != 3 || !normalizedCurrency.All(char.IsLetter))
        {
            throw new ArgumentException("CurrencyCode must be a three-letter code.");
        }
        if (from.HasValue && to.HasValue && from.Value.Date > to.Value.Date)
        {
            throw new ArgumentException("The from date cannot be later than the to date.");
        }

        DateTime? inclusiveFrom = from?.Date;
        DateTime? exclusiveTo = to?.Date.AddDays(1);

        var query = _dbContext.CustomerOrders.AsNoTracking()
            .Where(order =>
                order.OrderStatus == OrderStatuses.Delivered &&
                order.CurrencyCode == normalizedCurrency);

        if (inclusiveFrom.HasValue)
        {
            query = query.Where(order => order.OrderDate >= inclusiveFrom.Value);
        }
        if (exclusiveTo.HasValue)
        {
            query = query.Where(order => order.OrderDate < exclusiveTo.Value);
        }

        var rows = await query
            .Select(order => new
            {
                order.OrderId,
                order.OrderDate,
                order.TotalAmount
            })
            .ToListAsync();

        decimal deliveredOrderValue = rows.Sum(row => row.TotalAmount);
        int deliveredOrderCount = rows.Count;

        var points = rows
            .GroupBy(row => row.OrderDate.Date)
            .OrderBy(group => group.Key)
            .Select(group => new AdminSalesPointResponse
            {
                Date = group.Key,
                DeliveredOrderValue = group.Sum(row => row.TotalAmount),
                DeliveredOrderCount = group.Count()
            })
            .ToList();

        return new AdminSalesAnalyticsResponse
        {
            CurrencyCode = normalizedCurrency,
            From = inclusiveFrom,
            To = to?.Date,
            DeliveredOrderValue = deliveredOrderValue,
            DeliveredOrderCount = deliveredOrderCount,
            AverageDeliveredOrderValue = deliveredOrderCount == 0
                ? 0m
                : decimal.Round(
                    deliveredOrderValue / deliveredOrderCount,
                    2,
                    MidpointRounding.AwayFromZero),
            Points = points
        };
    }


    public async Task<IReadOnlyList<AdminOrderAttentionResponse>>
        GetOrdersNeedingAttentionAsync(int adminUserId)
    {
        await EnsureActiveAdminAsync(adminUserId);

        var orderRows = await (
                from order in _dbContext.CustomerOrders.AsNoTracking()
                join store in _dbContext.Stores.AsNoTracking()
                    on order.StoreId equals store.StoreId
                orderby order.OrderDate descending, order.OrderId descending
                select new
                {
                    Order = order,
                    StoreName = store.StoreName,
                    LatestPaymentStatus = _dbContext.Payments
                        .Where(payment => payment.OrderId == order.OrderId)
                        .OrderByDescending(payment => payment.CreatedDate)
                        .ThenByDescending(payment => payment.PaymentId)
                        .Select(payment => payment.PaymentStatus)
                        .FirstOrDefault(),
                    LatestShipmentStatus = _dbContext.Shipments
                        .Where(shipment => shipment.OrderId == order.OrderId)
                        .OrderByDescending(shipment => shipment.ShipmentId)
                        .Select(shipment => shipment.ShipmentStatus)
                        .FirstOrDefault(),
                    HasDeliveredShipment = _dbContext.Shipments.Any(shipment =>
                        shipment.OrderId == order.OrderId &&
                        shipment.ShipmentStatus == ShipmentStatuses.Delivered)
                })
            .ToListAsync();

        // Payment is postponed, so a missing/failed payment is not an Admin
        // attention condition. Only authoritative order/shipment mismatches are.
        return orderRows
            .Where(item =>
                item.Order.OrderStatus != OrderStatuses.Delivered &&
                item.Order.OrderStatus != OrderStatuses.Returned &&
                item.HasDeliveredShipment)
            .Select(item => new AdminOrderAttentionResponse(
                item.Order.OrderId,
                item.Order.OrderNumber,
                item.Order.StoreId,
                item.StoreName,
                item.Order.OrderStatus,
                item.LatestPaymentStatus ?? "NO_PAYMENT",
                item.LatestShipmentStatus ?? "NO_SHIPMENT",
                item.Order.TotalAmount,
                item.Order.CurrencyCode,
                item.Order.OrderDate,
                "DELIVERED_SHIPMENT_ORDER_STATUS_MISMATCH"))
            .ToList();
    }

    private IQueryable<AdminStoreDetailsResponse> StoreDetailsQuery(
        int? storeId = null,
        int? sellerUserId = null)
    {
        // Keep filters on STORE before projecting into the Admin DTO.
        // EF Core can then translate the Store/UserAccount join entirely to SQL.
        // Filtering after the positional DTO projection caused the runtime
        // InvalidOperationException seen when Admin opened a Store detail.
        var stores = _dbContext.Stores.AsNoTracking();

        if (storeId.HasValue)
        {
            stores = stores.Where(store => store.StoreId == storeId.Value);
        }

        if (sellerUserId.HasValue)
        {
            stores = stores.Where(store => store.SellerUserId == sellerUserId.Value);
        }

        return
            from store in stores
            join seller in _dbContext.UserAccounts.AsNoTracking()
                on store.SellerUserId equals seller.UserId
            select new AdminStoreDetailsResponse(
                store.StoreId,
                store.SellerUserId,
                store.StoreName,
                store.StoreSlug,
                store.StoreDescription,
                store.SupportEmail,
                store.SupportPhone,
                store.ReturnPolicy,
                store.SupportPolicy,
                seller.FullName,
                seller.Email,
                seller.PhoneNumber,
                seller.AccountStatus,
                seller.Role,
                store.ApprovalStatus,
                store.StoreStatus,
                seller.RegistrationDate,
                store.CreatedDate,
                store.UpdatedDate,
                store.ApprovedByAdminUserId);
    }

    private async Task EnsureActiveAdminAsync(int adminUserId)
    {
        bool isActiveAdmin = await _dbContext.UserAccounts.AsNoTracking().AnyAsync(user =>
            user.UserId == adminUserId &&
            user.Role == AccountRoles.Admin &&
            user.AccountStatus == AccountStatuses.Active);

        if (!isActiveAdmin)
        {
            throw new UnauthorizedAccessException("An active ADMIN account is required.");
        }
    }

    private static (int Page, int PageSize) NormalizePage(int page, int pageSize)
    {
        if (page < 1)
        {
            throw new ArgumentException("Page must be at least 1.");
        }
        if (pageSize is < 1 or > MaximumPageSize)
        {
            throw new ArgumentException($"PageSize must be between 1 and {MaximumPageSize}.");
        }
        return (page, pageSize);
    }

    private static void ValidateId(int id, string label)
    {
        if (id < 1)
        {
            throw new ArgumentException($"{label} must be greater than zero.");
        }
    }

    private static string NormalizeRequiredUpper(string? value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"{label} is required.");
        }
        return value.Trim().ToUpperInvariant();
    }

    private static string? NormalizeOptionalUpper(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToUpperInvariant();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string ProductImageUrl(int imageId) =>
        $"/api/product-images/{imageId}/content";

    private static RequestConflictException Conflict(string code, string message) =>
        new(code, message);
}
