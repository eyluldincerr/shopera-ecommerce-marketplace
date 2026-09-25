import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";

import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import AdminPageLayout from "../../components/admin/AdminPageLayout.jsx";
import {
  createPromotionPlan,
  deletePromotionPlan,
  getPromotionPlans,
  updatePromotionPlan,
} from "../../api/adminPromotionService.js";

const emptyPlan = {
  planName: "",
  planDescription: "",
  planType: "BANNER",
  isActive: true,
  config: "",
};

function ManagePromotionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingID, setEditingID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setPlans(await getPromotionPlans());
    } catch (error) {
      console.error("Promotion plans could not be loaded:", error);
      setErrorMessage(error.message || "Promotion plans could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const resetForm = () => {
    setEditingID(null);
    setForm(emptyPlan);
  };

  const startEdit = (plan) => {
    setEditingID(plan.promotionPlanID);
    setForm({
      planName: plan.planName,
      planDescription: plan.planDescription,
      planType: plan.planType || "BANNER",
      isActive: plan.isActive,
      config: plan.config,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.planName.trim()) {
      setErrorMessage("Plan name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (editingID) {
        await updatePromotionPlan(editingID, form);
        setSuccessMessage("Banner plan updated.");
      } else {
        await createPromotionPlan(form);
        setSuccessMessage("Banner plan created.");
      }

      resetForm();
      await loadPlans();
    } catch (error) {
      console.error("Promotion plan could not be saved:", error);
      setErrorMessage(error.message || "Promotion plan could not be saved.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete “${plan.planName}”?`)) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");
      await deletePromotionPlan(plan.promotionPlanID);
      setSuccessMessage("Banner plan deleted.");
      await loadPlans();
    } catch (error) {
      console.error("Promotion plan could not be deleted:", error);
      setErrorMessage(error.message || "Promotion plan could not be deleted.");
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Banner Plans"
        description="Plans group hero banners. The customer home page only displays campaigns using an active BANNER plan."
      >
        <Link className="admin-promotion-secondary-button" to="/admin/promotions">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to banners
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

      <div className="admin-promotion-plans-layout">
        <section className="admin-promotion-form-card">
          <div className="admin-promotion-form-card-heading">
            <div>
              <h2>{editingID ? "Edit banner plan" : "Create banner plan"}</h2>
              <p>For homepage heroes, keep the plan type set to BANNER.</p>
            </div>
          </div>

          <form className="admin-promotion-plan-form" onSubmit={handleSubmit}>
            <div className="admin-promotion-field">
              <label htmlFor="planName">Plan name</label>
              <input
                id="planName"
                value={form.planName}
                maxLength={100}
                onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))}
                placeholder="Homepage Hero"
                disabled={submitting}
              />
            </div>

            <div className="admin-promotion-field">
              <label htmlFor="planDescription">Description</label>
              <textarea
                id="planDescription"
                rows={3}
                maxLength={500}
                value={form.planDescription}
                onChange={(event) => setForm((current) => ({ ...current, planDescription: event.target.value }))}
                placeholder="Primary promotional carousel on the customer home page."
                disabled={submitting}
              />
            </div>

            <div className="admin-promotion-field">
              <label htmlFor="planType">Plan type</label>
              <select
                id="planType"
                value={form.planType}
                onChange={(event) => setForm((current) => ({ ...current, planType: event.target.value }))}
                disabled={submitting}
              >
                <option value="BANNER">BANNER</option>
                <option value="DISCOUNT">DISCOUNT</option>
                <option value="FEATURED">FEATURED</option>
              </select>
            </div>

            <label className="admin-promotion-check-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                disabled={submitting}
              />
              <span>Plan is active</span>
            </label>

            <div className="admin-promotion-form-actions admin-promotion-form-actions-inline">
              {editingID && (
                <button
                  type="button"
                  className="admin-promotion-secondary-button"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  <X size={16} aria-hidden="true" />
                  Cancel
                </button>
              )}

              <button type="submit" className="admin-promotion-primary-button" disabled={submitting}>
                {editingID ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                {submitting ? "Saving..." : editingID ? "Save plan" : "Create plan"}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-promotion-form-card">
          <div className="admin-promotion-form-card-heading">
            <div>
              <h2>Existing plans</h2>
              <p>Do not delete a plan while campaigns still use it.</p>
            </div>
          </div>

          {loading ? (
            <div className="admin-page-loading">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="admin-promotion-empty admin-promotion-empty-compact">
              <p>No promotion plans exist yet.</p>
            </div>
          ) : (
            <div className="admin-promotion-plan-list">
              {plans.map((plan) => (
                <article key={plan.promotionPlanID} className="admin-promotion-plan-row">
                  <div>
                    <div className="admin-promotion-plan-title">
                      <strong>{plan.planName}</strong>
                      <span>{plan.planType}</span>
                      <span className={plan.isActive ? "is-active" : "is-inactive"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p>{plan.planDescription || "No description."}</p>
                  </div>

                  <div className="admin-promotion-plan-actions">
                    <button type="button" onClick={() => startEdit(plan)}>
                      <Pencil size={16} aria-hidden="true" />
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(plan)}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminPageLayout>
  );
}

export default ManagePromotionPlansPage;
