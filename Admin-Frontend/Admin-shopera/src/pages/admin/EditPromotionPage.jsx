import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import AdminPageLayout from "../../components/admin/AdminPageLayout.jsx";
import PromotionForm from "../../components/admin/PromotionForm.jsx";
import {
  getPromotionCampaign,
  getPromotionPlans,
  updatePromotionCampaign,
  updatePromotionCampaignStatus,
} from "../../api/adminPromotionService.js";

function EditPromotionPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [loadedCampaign, loadedPlans] = await Promise.all([
          getPromotionCampaign(campaignId),
          getPromotionPlans(),
        ]);

        if (isMounted) {
          setCampaign(loadedCampaign);
          setPlans(loadedPlans);
        }
      } catch (error) {
        console.error("Hero banner could not be loaded:", error);
        if (isMounted) {
          setErrorMessage(error.message || "Hero banner could not be loaded.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  const handleSubmit = async (values, { publish }) => {
    try {
      setSubmitting(true);
      setErrorMessage("");

      const updated = await updatePromotionCampaign(campaignId, values);

      if (publish) {
        await updatePromotionCampaignStatus(updated.campaignID, "ACTIVE");
      }

      navigate("/admin/promotions", { replace: true });
    } catch (error) {
      console.error("Hero banner could not be updated:", error);
      setErrorMessage(error.message || "Hero banner could not be updated.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Edit Hero Banner"
        description="Update the image, message, Buyer destination, run time or priority for this promotion."
      >
        <Link className="admin-promotion-secondary-button" to="/admin/promotions">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to banners
        </Link>
      </AdminPageHeader>

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error" role="alert">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="admin-page-loading">Loading hero banner...</div>
      ) : campaign ? (
        <PromotionForm
          initialValues={campaign}
          plans={plans}
          onSubmit={handleSubmit}
          submitting={submitting}
          currentStatus={campaign.status}
        />
      ) : (
        <div className="admin-promotion-empty">
          <h2>Hero banner not found</h2>
          <Link className="admin-promotion-primary-button" to="/admin/promotions">
            Return to hero banners
          </Link>
        </div>
      )}
    </AdminPageLayout>
  );
}

export default EditPromotionPage;
