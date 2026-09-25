import {
  Clock3,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getPromotionImageUrl } from "../../api/adminPromotionService.js";
import {
  formatHeroClock,
  getClosestHeroDurationHours,
} from "../../utils/promotionDestination.js";

export const getCampaignDisplayStatus = (campaign, now = new Date()) => {
  const storedStatus = String(campaign?.status || "DRAFT").toUpperCase();
  const start = campaign?.startDate ? new Date(campaign.startDate) : null;
  const end = campaign?.endDate ? new Date(campaign.endDate) : null;

  if (storedStatus === "ACTIVE") {
    if (end && end <= now) return "EXPIRED";
    if (start && start > now) return "SCHEDULED";
    return "LIVE";
  }

  return storedStatus;
};

const getTimingLabel = (campaign, displayStatus) => {
  const hours = getClosestHeroDurationHours(campaign.startDate, campaign.endDate);
  const duration = `${hours} ${hours === 1 ? "hour" : "hours"}`;

  if (displayStatus === "LIVE") {
    return `${duration} · ends around ${formatHeroClock(campaign.endDate)}`;
  }

  if (displayStatus === "EXPIRED") {
    return `${duration} · ended around ${formatHeroClock(campaign.endDate)}`;
  }

  if (displayStatus === "SCHEDULED") {
    return `${duration} · starts around ${formatHeroClock(campaign.startDate)}`;
  }

  return `${duration} when published`;
};

function PromotionCard({ campaign, busy = false, onDelete, onStatusChange }) {
  const displayStatus = getCampaignDisplayStatus(campaign);
  const imageUrl = campaign.hasBannerImage ? getPromotionImageUrl(campaign) : "";
  const isPublished = campaign.status === "ACTIVE";

  return (
    <article className="admin-promotion-card">
      <div className="admin-promotion-card-image">
        {imageUrl ? (
          <>
            <img
              className="admin-promotion-card-image-backdrop"
              src={imageUrl}
              alt=""
              aria-hidden="true"
            />
            <img
              className="admin-promotion-card-image-main"
              src={imageUrl}
              alt={campaign.bannerAltText || campaign.campaignName}
            />
          </>
        ) : (
          <div className="admin-promotion-card-image-empty">No banner image</div>
        )}

        <span
          className={`admin-promotion-status admin-promotion-status-${displayStatus.toLowerCase()}`}
        >
          {displayStatus}
        </span>

        <span className="admin-promotion-order">#{campaign.displayOrder}</span>
      </div>

      <div className="admin-promotion-card-body">
        <div className="admin-promotion-card-heading">
          <div>
            <span>{campaign.promotionPlanName || "Banner plan"}</span>
            <h2>{campaign.campaignName}</h2>
          </div>
        </div>

        <p className="admin-promotion-card-description">
          {campaign.campaignDescription || "No promotional description."}
        </p>

        <div className="admin-promotion-card-meta">
          <div>
            <Clock3 size={16} aria-hidden="true" />
            <span>{getTimingLabel(campaign, displayStatus)}</span>
          </div>

          {campaign.linkURL && (
            <div>
              <ExternalLink size={16} aria-hidden="true" />
              <span title={campaign.linkURL}>{campaign.linkURL}</span>
            </div>
          )}
        </div>

        <div className="admin-promotion-card-actions">
          <Link
            className="admin-promotion-card-action"
            to={`/admin/promotions/edit/${campaign.campaignID}`}
          >
            <Pencil size={16} aria-hidden="true" />
            Edit
          </Link>

          <button
            type="button"
            className="admin-promotion-card-action"
            disabled={busy}
            onClick={() =>
              onStatusChange(campaign.campaignID, isPublished ? "PAUSED" : "ACTIVE")
            }
          >
            {isPublished ? (
              <Pause size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
            {isPublished ? "Pause" : "Publish"}
          </button>

          <button
            type="button"
            className="admin-promotion-card-action admin-promotion-card-action-danger"
            disabled={busy}
            onClick={() => onDelete(campaign.campaignID)}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default PromotionCard;
