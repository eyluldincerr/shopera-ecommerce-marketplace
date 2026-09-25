import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import AdminPageLayout from "../../components/admin/AdminPageLayout.jsx";
import PromotionCard, {
  getCampaignDisplayStatus,
} from "../../components/admin/PromotionCard.jsx";
import {
  deletePromotionCampaign,
  getPromotionCampaigns,
  updatePromotionCampaign,
  updatePromotionCampaignStatus,
} from "../../api/adminPromotionService.js";
import {
  createRelativeHeroWindow,
  getClosestHeroDurationHours,
} from "../../utils/promotionDestination.js";

function ManagePromotionsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyID, setBusyID] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCampaigns = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setErrorMessage("");
      const data = await getPromotionCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Hero banners could not be loaded:", error);
      setErrorMessage(error.message || "Hero banners could not be loaded.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const summaries = useMemo(() => {
    const statuses = campaigns.map((campaign) => getCampaignDisplayStatus(campaign));

    return {
      total: campaigns.length,
      live: statuses.filter((status) => status === "LIVE").length,
      paused: statuses.filter((status) => status === "PAUSED").length,
      drafts: statuses.filter((status) => status === "DRAFT").length,
    };
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const displayStatus = getCampaignDisplayStatus(campaign);
      const matchesStatus = statusFilter === "ALL" || displayStatus === statusFilter;
      const matchesSearch =
        !search ||
        campaign.campaignName.toLowerCase().includes(search) ||
        campaign.campaignDescription.toLowerCase().includes(search) ||
        campaign.promotionPlanName.toLowerCase().includes(search) ||
        campaign.linkURL.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [campaigns, searchValue, statusFilter]);

  const handleStatusChange = async (campaignID, status) => {
    try {
      setBusyID(campaignID);
      setErrorMessage("");
      setSuccessMessage("");

      if (status === "ACTIVE") {
        const campaign = campaigns.find((item) => item.campaignID === campaignID);

        if (!campaign) {
          throw new Error("Hero banner could not be found.");
        }

        const durationHours = getClosestHeroDurationHours(
          campaign.startDate,
          campaign.endDate,
        );
        const nextWindow = createRelativeHeroWindow(durationHours, new Date());

        await updatePromotionCampaign(campaignID, {
          ...campaign,
          startDate: nextWindow.startDate,
          endDate: nextWindow.endDate,
          bannerImageFile: null,
        });
      }

      await updatePromotionCampaignStatus(campaignID, status);
      await loadCampaigns({ showLoading: false });
      setSuccessMessage(
        status === "ACTIVE"
          ? "Hero banner published. Its timer started from the current time."
          : "Hero banner paused.",
      );
    } catch (error) {
      console.error("Hero banner status could not be updated:", error);
      setErrorMessage(error.message || "Hero banner status could not be updated.");
    } finally {
      setBusyID(null);
    }
  };

  const handleDelete = async (campaignID) => {
    const campaign = campaigns.find((item) => item.campaignID === campaignID);
    const confirmed = window.confirm(
      `Delete “${campaign?.campaignName || "this hero banner"}”? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setBusyID(campaignID);
      setErrorMessage("");
      setSuccessMessage("");
      await deletePromotionCampaign(campaignID);
      await loadCampaigns({ showLoading: false });
      setSuccessMessage("Hero banner deleted.");
    } catch (error) {
      console.error("Hero banner could not be deleted:", error);
      setErrorMessage(error.message || "Hero banner could not be deleted.");
    } finally {
      setBusyID(null);
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Hero Banners"
        description="Create promotions, choose a Buyer destination and run each banner for a simple number of hours."
      >
        <Link className="admin-promotion-primary-button" to="/admin/promotions/create">
          <Plus size={17} aria-hidden="true" />
          Create hero banner
        </Link>
      </AdminPageHeader>

      {successMessage && (
        <div className="admin-page-notice admin-page-notice-success" role="status">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="admin-promotion-summary-grid">
        <article><span>Total banners</span><strong>{summaries.total}</strong></article>
        <article><span>Live now</span><strong>{summaries.live}</strong></article>
        <article><span>Paused</span><strong>{summaries.paused}</strong></article>
        <article><span>Drafts</span><strong>{summaries.drafts}</strong></article>
      </div>

      <section className="admin-promotion-panel">
        <div className="admin-promotion-toolbar">
          <label className="admin-promotion-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search hero banners"
              aria-label="Search hero banners"
            />
          </label>

          <label className="admin-promotion-filter">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter hero banners by status"
            >
              <option value="ALL">All statuses</option>
              <option value="LIVE">Live</option>
              <option value="DRAFT">Draft</option>
              <option value="PAUSED">Paused</option>
              <option value="EXPIRED">Expired</option>
              <option value="SCHEDULED">Legacy scheduled</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="admin-page-loading">Loading hero banners...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="admin-promotion-empty">
            <h2>No hero banners found</h2>
            <p>
              {campaigns.length === 0
                ? "Create your first promotional hero banner for the Shopera home page."
                : "Try another search or status filter."}
            </p>
            {campaigns.length === 0 && (
              <Link className="admin-promotion-primary-button" to="/admin/promotions/create">
                <Plus size={17} aria-hidden="true" />
                Create hero banner
              </Link>
            )}
          </div>
        ) : (
          <div className="admin-promotion-grid">
            {filteredCampaigns.map((campaign) => (
              <PromotionCard
                key={campaign.campaignID}
                campaign={campaign}
                busy={busyID === campaign.campaignID}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </section>
    </AdminPageLayout>
  );
}

export default ManagePromotionsPage;
