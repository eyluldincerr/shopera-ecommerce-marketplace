import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import AdminPageLayout from "../../components/admin/AdminPageLayout.jsx";
import PromotionForm from "../../components/admin/PromotionForm.jsx";
import {
  createPromotionCampaign,
  getPromotionPlans,
  updatePromotionCampaignStatus,
} from "../../api/adminPromotionService.js";

function CreatePromotionPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      try {
        const loadedPlans = await getPromotionPlans();
        if (isMounted) setPlans(loadedPlans);
      } catch (error) {
        console.error("Hero banner system could not be prepared:", error);
        if (isMounted) {
          setErrorMessage(error.message || "Hero banner system could not be prepared.");
        }
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    };

    loadPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (values, { publish }) => {
    try {
      setSubmitting(true);
      setErrorMessage("");

      const created = await createPromotionCampaign(values);
      if (publish) {
        await updatePromotionCampaignStatus(created.campaignID, "ACTIVE");
      }

      navigate("/admin/promotions", { replace: true });
    } catch (error) {
      console.error("Hero banner could not be created:", error);
      setErrorMessage(error.message || "Hero banner could not be created.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Create Hero Banner"
        description="Build a customer-facing promotion with a smart destination and a simple hourly run time."
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

      {loadingPlans ? (
        <div className="admin-page-loading">Preparing hero banner...</div>
      ) : (
        <PromotionForm
          plans={plans}
          onSubmit={handleSubmit}
          submitting={submitting}
          currentStatus="DRAFT"
        />
      )}
    </AdminPageLayout>
  );
}

export default CreatePromotionPage;
