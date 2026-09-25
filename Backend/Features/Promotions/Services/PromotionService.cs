using Microsoft.EntityFrameworkCore;
using Shopera.Data;
using Shopera.Common.Security;
using Shopera.Features.Promotions.DTOs;
using Shopera.Features.Promotions.Models;

namespace Shopera.Features.Promotions.Services;

public class PromotionService : IPromotionService
{
    private const long MaxBannerImageBytes = 8 * 1024 * 1024;

    private static readonly HashSet<string> AllowedPlanTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "BANNER",
            "DISCOUNT",
            "FEATURED"
        };

    private static readonly HashSet<string> AllowedCampaignStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "DRAFT",
            "ACTIVE",
            "PAUSED",
            "EXPIRED"
        };

    private static readonly HashSet<string> AllowedBannerContentTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

    private readonly ApplicationDbContext _context;

    public PromotionService(ApplicationDbContext context)
    {
        _context = context;
    }

    // ---- Plans ----
    public async Task<IEnumerable<PromotionPlanDto>> GetAllPlansAsync()
    {
        return await _context.PromotionPlans
            .AsNoTracking()
            .OrderByDescending(p => p.IsActive)
            .ThenBy(p => p.PlanName)
            .Select(p => new PromotionPlanDto
            {
                PromotionPlanID = p.PromotionPlanID,
                PlanName = p.PlanName,
                PlanDescription = p.PlanDescription,
                PlanType = p.PlanType,
                IsActive = p.IsActive,
                Config = p.Config,
                CreatedDate = p.CreatedDate,
                UpdatedDate = p.UpdatedDate
            })
            .ToListAsync();
    }

    public async Task<PromotionPlanDto?> GetPlanByIdAsync(int planId)
    {
        return await _context.PromotionPlans
            .AsNoTracking()
            .Where(p => p.PromotionPlanID == planId)
            .Select(p => new PromotionPlanDto
            {
                PromotionPlanID = p.PromotionPlanID,
                PlanName = p.PlanName,
                PlanDescription = p.PlanDescription,
                PlanType = p.PlanType,
                IsActive = p.IsActive,
                Config = p.Config,
                CreatedDate = p.CreatedDate,
                UpdatedDate = p.UpdatedDate
            })
            .FirstOrDefaultAsync();
    }

    public async Task<PromotionPlanDto> CreatePlanAsync(CreatePromotionPlanDto dto)
    {
        string planName = RequiredText(dto.PlanName, "Plan name");
        string planType = NormalizePlanType(dto.PlanType);

        var plan = new PromotionPlan
        {
            PlanName = planName,
            PlanDescription = OptionalText(dto.PlanDescription),
            PlanType = planType,
            IsActive = dto.IsActive,
            Config = OptionalText(dto.Config),
            CreatedDate = DateTime.UtcNow
        };

        _context.PromotionPlans.Add(plan);
        await _context.SaveChangesAsync();

        return MapPlan(plan);
    }

    public async Task<PromotionPlanDto> UpdatePlanAsync(int planId, CreatePromotionPlanDto dto)
    {
        var plan = await _context.PromotionPlans.FindAsync(planId);
        if (plan == null)
        {
            throw new KeyNotFoundException($"Promotion plan with ID {planId} was not found.");
        }

        plan.PlanName = RequiredText(dto.PlanName, "Plan name");
        plan.PlanDescription = OptionalText(dto.PlanDescription);
        plan.PlanType = NormalizePlanType(dto.PlanType);
        plan.IsActive = dto.IsActive;
        plan.Config = OptionalText(dto.Config);
        plan.UpdatedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapPlan(plan);
    }

    public async Task DeletePlanAsync(int planId)
    {
        var plan = await _context.PromotionPlans.FindAsync(planId);
        if (plan == null)
        {
            throw new KeyNotFoundException($"Promotion plan with ID {planId} was not found.");
        }

        bool hasCampaigns = await _context.PromotionCampaigns
            .AnyAsync(c => c.PromotionPlanID == planId);

        if (hasCampaigns)
        {
            throw new ArgumentException(
                "This promotion plan is already used by one or more campaigns. Remove or move those campaigns before deleting the plan."
            );
        }

        _context.PromotionPlans.Remove(plan);
        await _context.SaveChangesAsync();
    }

    // ---- Campaigns ----
    public async Task<IEnumerable<PromotionCampaignDto>> GetAllCampaignsAsync(bool includeInactive = false)
    {
        var query = _context.PromotionCampaigns
            .AsNoTracking()
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(c => c.IsActive);
        }

        return await ProjectCampaigns(query)
            .OrderBy(c => c.DisplayOrder)
            .ThenByDescending(c => c.StartDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<PromotionCampaignDto>> GetActiveCampaignsForHomeAsync()
    {
        DateTime now = DateTime.UtcNow;

        var query = _context.PromotionCampaigns
            .AsNoTracking()
            .Where(c =>
                c.IsActive &&
                c.Status == "ACTIVE" &&
                c.StartDate <= now &&
                c.EndDate >= now &&
                c.BannerImage != null &&
                c.Plan != null &&
                c.Plan.IsActive &&
                c.Plan.PlanType == "BANNER");

        var campaigns = await ProjectCampaigns(query)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.CampaignID)
            .ToListAsync();

        // Smart Admin destinations point to existing public Shopera routes.
        // If a promoted Store/Product later becomes unavailable, do not send
        // Buyers into a dead destination. Search/custom/no-link campaigns are
        // unaffected by this check.
        var storeIds = campaigns
            .Select(c => GetInternalDestinationId(c.LinkURL, "/stores/"))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();
        var productIds = campaigns
            .Select(c => GetInternalDestinationId(c.LinkURL, "/products/"))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();
        var categoryIds = campaigns
            .Select(c => GetInternalDestinationId(c.LinkURL, "/categories/"))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

        var availableStoreIds = storeIds.Length == 0
            ? new HashSet<int>()
            : (await _context.Stores
                .AsNoTracking()
                .Where(store =>
                    storeIds.Contains(store.StoreId) &&
                    store.ApprovalStatus == "APPROVED" &&
                    store.StoreStatus == "ACTIVE")
                .Select(store => store.StoreId)
                .ToListAsync())
                .ToHashSet();

        var availableProductIds = productIds.Length == 0
            ? new HashSet<int>()
            : (await (
                from product in _context.Products.AsNoTracking()
                join store in _context.Stores.AsNoTracking()
                    on product.StoreId equals store.StoreId
                where productIds.Contains(product.ProductId) &&
                    store.ApprovalStatus == "APPROVED" &&
                    store.StoreStatus == "ACTIVE" &&
                    (product.Status == "ACTIVE" || product.Status == "OUT_OF_STOCK")
                select product.ProductId)
                .ToListAsync())
                .ToHashSet();

        var availableCategoryIds = categoryIds.Length == 0
            ? new HashSet<int>()
            : (await _context.Categories
                .AsNoTracking()
                .Where(category => categoryIds.Contains(category.CategoryId))
                .Select(category => category.CategoryId)
                .ToListAsync())
                .ToHashSet();

        return campaigns.Where(c =>
        {
            int? storeId = GetInternalDestinationId(c.LinkURL, "/stores/");
            if (storeId.HasValue) return availableStoreIds.Contains(storeId.Value);

            int? productId = GetInternalDestinationId(c.LinkURL, "/products/");
            if (productId.HasValue) return availableProductIds.Contains(productId.Value);

            int? categoryId = GetInternalDestinationId(c.LinkURL, "/categories/");
            if (categoryId.HasValue) return availableCategoryIds.Contains(categoryId.Value);

            return true;
        });
    }

    public async Task<PromotionCampaignDto?> GetCampaignByIdAsync(int campaignId)
    {
        return await ProjectCampaigns(
                _context.PromotionCampaigns
                    .AsNoTracking()
                    .Where(c => c.CampaignID == campaignId)
            )
            .FirstOrDefaultAsync();
    }

    public async Task<PromotionCampaignDto> CreateCampaignAsync(CreatePromotionCampaignDto dto)
    {
        var plan = await RequirePlanAsync(dto.PromotionPlanID);
        ValidateBannerPlan(plan);

        (DateTime startDate, DateTime endDate) = NormalizeAndValidateDates(
            dto.StartDate,
            dto.EndDate
        );

        (byte[]? imageBytes, string? contentType) =
            await ReadBannerImageAsync(dto.BannerImageFile);

        var campaign = new PromotionCampaign
        {
            PromotionPlanID = plan.PromotionPlanID,
            CampaignName = RequiredText(dto.CampaignName, "Campaign name"),
            CampaignDescription = OptionalText(dto.CampaignDescription),
            BannerImage = imageBytes,
            BannerContentType = contentType,
            BannerAltText = OptionalText(dto.BannerAltText),
            LinkURL = NormalizeAndValidateLink(dto.LinkURL),
            DisplayOrder = Math.Max(0, dto.DisplayOrder),
            StartDate = startDate,
            EndDate = endDate,
            IsActive = false,
            Status = "DRAFT",
            CreatedDate = DateTime.UtcNow
        };

        _context.PromotionCampaigns.Add(campaign);
        await _context.SaveChangesAsync();

        return (await GetCampaignByIdAsync(campaign.CampaignID))!;
    }

    public async Task<PromotionCampaignDto> UpdateCampaignAsync(
        int campaignId,
        CreatePromotionCampaignDto dto)
    {
        var campaign = await _context.PromotionCampaigns
            .Include(c => c.Plan)
            .FirstOrDefaultAsync(c => c.CampaignID == campaignId);

        if (campaign == null)
        {
            throw new KeyNotFoundException($"Campaign with ID {campaignId} was not found.");
        }

        var plan = campaign.PromotionPlanID == dto.PromotionPlanID && campaign.Plan != null
            ? campaign.Plan
            : await RequirePlanAsync(dto.PromotionPlanID);

        ValidateBannerPlan(plan);

        (DateTime startDate, DateTime endDate) = NormalizeAndValidateDates(
            dto.StartDate,
            dto.EndDate
        );

        campaign.PromotionPlanID = plan.PromotionPlanID;
        campaign.CampaignName = RequiredText(dto.CampaignName, "Campaign name");
        campaign.CampaignDescription = OptionalText(dto.CampaignDescription);
        campaign.BannerAltText = OptionalText(dto.BannerAltText);
        campaign.LinkURL = NormalizeAndValidateLink(dto.LinkURL);
        campaign.DisplayOrder = Math.Max(0, dto.DisplayOrder);
        campaign.StartDate = startDate;
        campaign.EndDate = endDate;
        campaign.UpdatedDate = DateTime.UtcNow;

        if (dto.BannerImageFile is { Length: > 0 })
        {
            (byte[]? imageBytes, string? contentType) =
                await ReadBannerImageAsync(dto.BannerImageFile);

            campaign.BannerImage = imageBytes;
            campaign.BannerContentType = contentType;
        }

        if (campaign.Status == "ACTIVE")
        {
            if (campaign.EndDate <= DateTime.UtcNow)
            {
                campaign.Status = "EXPIRED";
                campaign.IsActive = false;
            }
            else
            {
                campaign.IsActive = true;
            }
        }

        await _context.SaveChangesAsync();

        return (await GetCampaignByIdAsync(campaign.CampaignID))!;
    }

    public async Task DeleteCampaignAsync(int campaignId)
    {
        var campaign = await _context.PromotionCampaigns.FindAsync(campaignId);
        if (campaign == null)
        {
            throw new KeyNotFoundException($"Campaign with ID {campaignId} was not found.");
        }

        _context.PromotionCampaigns.Remove(campaign);
        await _context.SaveChangesAsync();
    }

    public async Task<(byte[] Data, string ContentType)?> GetCampaignImageAsync(int campaignId)
    {
        var image = await _context.PromotionCampaigns
            .AsNoTracking()
            .Where(c => c.CampaignID == campaignId)
            .Select(c => new
            {
                c.BannerImage,
                c.BannerContentType
            })
            .FirstOrDefaultAsync();

        if (image?.BannerImage == null || image.BannerImage.Length == 0)
        {
            return null;
        }

        string contentType = AllowedBannerContentTypes.Contains(image.BannerContentType ?? "")
            ? image.BannerContentType!
            : "image/jpeg";

        return (image.BannerImage, contentType);
    }

    public async Task UpdateCampaignStatusAsync(int campaignId, string status)
    {
        var campaign = await _context.PromotionCampaigns
            .Include(c => c.Plan)
            .FirstOrDefaultAsync(c => c.CampaignID == campaignId);

        if (campaign == null)
        {
            throw new KeyNotFoundException($"Campaign with ID {campaignId} was not found.");
        }

        string normalizedStatus = (status ?? string.Empty).Trim().ToUpperInvariant();
        if (!AllowedCampaignStatuses.Contains(normalizedStatus))
        {
            throw new ArgumentException(
                $"Invalid campaign status. Allowed values: {string.Join(", ", AllowedCampaignStatuses)}."
            );
        }

        if (normalizedStatus == "ACTIVE")
        {
            if (campaign.Plan == null)
            {
                throw new ArgumentException("The campaign promotion plan is not available.");
            }

            ValidateCampaignCanBePublished(campaign, campaign.Plan);
        }

        campaign.Status = normalizedStatus;
        campaign.IsActive = normalizedStatus == "ACTIVE";
        campaign.UpdatedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    private IQueryable<PromotionCampaignDto> ProjectCampaigns(
        IQueryable<PromotionCampaign> query)
    {
        return query.Select(c => new PromotionCampaignDto
        {
            CampaignID = c.CampaignID,
            PromotionPlanID = c.PromotionPlanID,
            PromotionPlanName = c.Plan != null ? c.Plan.PlanName : string.Empty,
            CampaignName = c.CampaignName,
            CampaignDescription = c.CampaignDescription,
            BannerImageUrl = $"/api/promotions/campaigns/{c.CampaignID}/image",
            HasBannerImage = c.BannerImage != null,
            BannerContentType = c.BannerContentType,
            BannerAltText = c.BannerAltText,
            LinkURL = c.LinkURL,
            DisplayOrder = c.DisplayOrder,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            IsActive = c.IsActive,
            Status = c.Status,
            CreatedDate = c.CreatedDate,
            UpdatedDate = c.UpdatedDate
        });
    }

    private async Task<PromotionPlan> RequirePlanAsync(int planId)
    {
        var plan = await _context.PromotionPlans.FindAsync(planId);
        if (plan == null)
        {
            throw new KeyNotFoundException($"Promotion plan with ID {planId} was not found.");
        }

        return plan;
    }

    private static PromotionPlanDto MapPlan(PromotionPlan plan)
    {
        return new PromotionPlanDto
        {
            PromotionPlanID = plan.PromotionPlanID,
            PlanName = plan.PlanName,
            PlanDescription = plan.PlanDescription,
            PlanType = plan.PlanType,
            IsActive = plan.IsActive,
            Config = plan.Config,
            CreatedDate = plan.CreatedDate,
            UpdatedDate = plan.UpdatedDate
        };
    }

    private static void ValidateBannerPlan(PromotionPlan plan)
    {
        if (!string.Equals(plan.PlanType, "BANNER", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                "Homepage hero campaigns must use a BANNER promotion plan."
            );
        }
    }

    private static void ValidateCampaignCanBePublished(
        PromotionCampaign campaign,
        PromotionPlan plan)
    {
        ValidateBannerPlan(plan);

        if (!plan.IsActive)
        {
            throw new ArgumentException(
                "Activate the selected banner plan before publishing this campaign."
            );
        }

        if (campaign.BannerImage == null || campaign.BannerImage.Length == 0)
        {
            throw new ArgumentException(
                "Upload a banner image before publishing this campaign."
            );
        }

        if (campaign.EndDate <= campaign.StartDate)
        {
            throw new ArgumentException("The end date must be after the start date.");
        }

        if (campaign.EndDate <= DateTime.UtcNow)
        {
            throw new ArgumentException(
                "This campaign has already ended. Extend the end date before publishing it."
            );
        }
    }

    private static async Task<(byte[]? Data, string? ContentType)> ReadBannerImageAsync(
        IFormFile? imageFile)
    {
        if (imageFile == null || imageFile.Length == 0)
        {
            return (null, null);
        }

        if (imageFile.Length > MaxBannerImageBytes)
        {
            throw new ArgumentException("Banner images must be 8 MB or smaller.");
        }

        using var stream = new MemoryStream();
        await imageFile.CopyToAsync(stream);
        byte[] imageBytes = stream.ToArray();

        string? detectedContentType =
            ImageUploadSignatureValidator.DetectSupportedContentType(
                imageBytes.AsSpan(0, Math.Min(12, imageBytes.Length)));

        if (detectedContentType is null ||
            !AllowedBannerContentTypes.Contains(detectedContentType) ||
            !ImageUploadSignatureValidator.ExtensionMatches(
                imageFile.FileName,
                detectedContentType))
        {
            throw new ArgumentException(
                "Banner image content must be a real JPG, PNG, or WebP file with a matching extension."
            );
        }

        return (imageBytes, detectedContentType);
    }

    private static (DateTime StartDate, DateTime EndDate) NormalizeAndValidateDates(
        DateTime startDate,
        DateTime endDate)
    {
        DateTime startUtc = NormalizeUtc(startDate);
        DateTime endUtc = NormalizeUtc(endDate);

        if (startUtc == default || endUtc == default)
        {
            throw new ArgumentException("Start date and end date are required.");
        }

        if (endUtc <= startUtc)
        {
            throw new ArgumentException("The end date must be after the start date.");
        }

        return (startUtc, endUtc);
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static string NormalizePlanType(string value)
    {
        string normalized = RequiredText(value, "Plan type").ToUpperInvariant();

        if (!AllowedPlanTypes.Contains(normalized))
        {
            throw new ArgumentException(
                $"Invalid promotion plan type. Allowed values: {string.Join(", ", AllowedPlanTypes)}."
            );
        }

        return normalized;
    }

    private static int? GetInternalDestinationId(string? linkUrl, string prefix)
    {
        if (string.IsNullOrWhiteSpace(linkUrl) ||
            !linkUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        string value = linkUrl[prefix.Length..];
        int queryIndex = value.IndexOfAny(['?', '#']);
        if (queryIndex >= 0)
        {
            value = value[..queryIndex];
        }

        value = value.Trim('/');
        return int.TryParse(value, out int id) && id > 0 ? id : null;
    }

    private static string? NormalizeAndValidateLink(string? value)
    {
        string? normalized = OptionalText(value);
        if (normalized == null)
        {
            return null;
        }

        if (normalized.StartsWith('/') && !normalized.StartsWith("//"))
        {
            return normalized;
        }

        if (Uri.TryCreate(normalized, UriKind.Absolute, out Uri? uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return normalized;
        }

        throw new ArgumentException(
            "Banner link must be a Shopera path beginning with / or a valid http/https URL."
        );
    }

    private static string RequiredText(string? value, string label)
    {
        string normalized = (value ?? string.Empty).Trim();
        if (normalized.Length == 0)
        {
            throw new ArgumentException($"{label} is required.");
        }

        return normalized;
    }

    private static string? OptionalText(string? value)
    {
        string normalized = (value ?? string.Empty).Trim();
        return normalized.Length == 0 ? null : normalized;
    }
}
