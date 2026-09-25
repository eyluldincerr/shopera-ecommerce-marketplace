import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CategoryFormModal from "./CategoryFormModal";
import AdminModalPortal from "./AdminModalPortal";
import { createAdminCategory, getAdminCategories } from "../../api/adminCategoryService";

const actions = [
  ["Add Category", "category"],
  ["Add Coupon", "coupon"],
  ["Review Brand Applications", "pending-brand-applications", "/admin/seller-verification"],
  ["View Product Oversight", "product-oversight", "/admin/products"],
  ["Review Account Alerts", "account-alerts", "/admin/users"],
  ["Inspect Orders", "latest-orders", "/admin/orders"],
];

function AdminQuickActions({ visibleWidgetIds = [], onAddCoupon }) {
  const navigate = useNavigate();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!categoryOpen) return;
    getAdminCategories().then(setCategories).catch((currentError) => setError(currentError.message));
  }, [categoryOpen]);

  const submitCategory = async (values) => {
    try {
      setProcessing(true); setError(""); setSuccess("");
      const created = await createAdminCategory(values);
      setCategoryOpen(false); setSuccess(`${created.categoryName} was created.`);
      window.dispatchEvent(new Event("admin-data-updated"));
    } catch (currentError) { setError(currentError.message || "Category could not be created."); }
    finally { setProcessing(false); }
  };

  const runAction = (target, fallback) => {
    if (target === "category") {
      setError(""); setSuccess(""); setCategoryOpen(true);
      return;
    }
    if (target === "coupon") {
      onAddCoupon?.();
      return;
    }
    if (visibleWidgetIds.includes(target)) {
      document.querySelector(`[data-widget-id="${target}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.requestAnimationFrame(() => document.querySelector(`[data-widget-id="${target}"] button, [data-widget-id="${target}"] a`)?.focus());
      return;
    }
    if (fallback) navigate(fallback);
  };

  return (
    <section className="admin-operational-widget" aria-labelledby="quick-actions-title">
      <div className="admin-operational-heading"><div><h2 id="quick-actions-title">Quick Actions</h2><p>Open common administration workflows.</p></div></div>
      <div className="admin-quick-actions">
        {actions.map(([label, target, fallback]) => (
          <button key={target} type="button" onClick={() => runAction(target, fallback)}>{label}</button>
        ))}
      </div>
      {success && <p className="admin-widget-notice success" role="status">{success}</p>}
      {error && <p className="admin-widget-notice error" role="alert">{error}</p>}
      <AdminModalPortal isOpen={categoryOpen}><CategoryFormModal isOpen={categoryOpen} categories={categories} isProcessing={processing} onSubmit={submitCategory} onCancel={() => !processing && setCategoryOpen(false)} /></AdminModalPortal>
    </section>
  );
}

export default AdminQuickActions;
