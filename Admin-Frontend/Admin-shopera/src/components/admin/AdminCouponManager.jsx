import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminCoupons, setAdminCouponStatus, updateAdminCoupon } from "../../api/adminCouponService";
import AdminConfirmModal from "./AdminConfirmModal";
import AdminModalPortal from "./AdminModalPortal";
import AdminStatusBadge from "./AdminStatusBadge";
import CouponFormModal from "./CouponFormModal";
import { canEnableCoupon } from "../../utils/couponUtils";

const formatDiscount = (coupon) => coupon.discountType === "PERCENTAGE"
  ? `${Number(coupon.discountValue || 0)}%`
  : Number(coupon.discountValue || 0).toFixed(2);

function AdminCouponManager({ onAddCoupon }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setCoupons(await getAdminCoupons());
    } catch (currentError) {
      setError(currentError.message || "Coupons could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("admin-coupons-updated", refresh);
    return () => window.removeEventListener("admin-coupons-updated", refresh);
  }, [load]);

  const counts = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((coupon) => coupon.effectiveStatus === "ACTIVE").length,
    expired: coupons.filter((coupon) => coupon.effectiveStatus === "EXPIRED").length,
    disabled: coupons.filter((coupon) => coupon.effectiveStatus === "DISABLED").length,
  }), [coupons]);

  const submitEdit = async (values) => {
    try {
      setProcessing(true);
      setError("");
      const updated = await updateAdminCoupon(editing.couponId, values);
      setSuccess(`${updated.couponCode} was updated.`);
      setEditing(null);
      await load();
      window.dispatchEvent(new Event("admin-data-updated"));
    } catch (currentError) {
      setError(currentError.message || "Coupon could not be updated.");
    } finally {
      setProcessing(false);
    }
  };

  const confirmStatusChange = async () => {
    try {
      setProcessing(true);
      setError("");
      const nextStatus = statusAction.type === "enable" ? "ACTIVE" : "DISABLED";
      const updated = await setAdminCouponStatus(statusAction.coupon.couponId, nextStatus);
      setSuccess(`${updated.couponCode} was ${nextStatus === "ACTIVE" ? "enabled" : "disabled"}.`);
      setStatusAction(null);
      await load();
      window.dispatchEvent(new Event("admin-data-updated"));
    } catch (currentError) {
      setError(currentError.message || "Coupon status could not be updated.");
    } finally {
      setProcessing(false);
    }
  };

  return <section className="admin-operational-widget admin-coupon-widget">
    <div className="admin-operational-heading admin-widget-header"><div className="admin-widget-header-copy"><h2>Coupon Manager</h2><p>Current coupon availability and recent offers.</p></div><div className="admin-widget-header-actions"><button type="button" onClick={onAddCoupon}>Add Coupon</button><Link to="/admin/coupons">View All</Link></div></div>
    <div className="admin-coupon-widget-counts"><span>Total <strong>{counts.total}</strong></span><span>Active <strong>{counts.active}</strong></span><span>Expired <strong>{counts.expired}</strong></span><span>Disabled <strong>{counts.disabled}</strong></span></div>
    {success && <p className="admin-widget-notice success" role="status">{success}</p>}
    {error && <p className="admin-widget-notice error" role="alert">{error}</p>}
    {loading ? <p className="admin-widget-state">Loading coupons...</p> : coupons.length === 0 ? <p className="admin-widget-state">No coupons have been created yet.</p> : <ul className="admin-compact-list">{coupons.slice(0, 3).map((coupon) => <li key={coupon.couponId}><div><strong>{coupon.couponCode}</strong><span>{formatDiscount(coupon)} · Expires {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : "—"}</span></div><div><AdminStatusBadge status={coupon.effectiveStatus} /><button type="button" onClick={() => setEditing(coupon)}>Edit</button>{coupon.effectiveStatus === "ACTIVE" && <button type="button" onClick={() => setStatusAction({ type: "disable", coupon })}>Disable</button>}{coupon.effectiveStatus === "DISABLED" && canEnableCoupon(coupon) && <button type="button" onClick={() => setStatusAction({ type: "enable", coupon })}>Enable</button>}</div></li>)}</ul>}
    <AdminModalPortal isOpen={Boolean(editing)}><CouponFormModal isOpen={Boolean(editing)} mode="edit" coupon={editing} isProcessing={processing} errorMessage={error} onSubmit={submitEdit} onCancel={() => !processing && setEditing(null)} /></AdminModalPortal>
    <AdminModalPortal isOpen={Boolean(statusAction)}><AdminConfirmModal isOpen={Boolean(statusAction)} title={`${statusAction?.type === "enable" ? "Enable" : "Disable"} coupon ${statusAction?.coupon?.couponCode || ""}?`} message={statusAction?.type === "enable" ? "The coupon will become available again only after the service confirms its expiry date is valid." : "The coupon will no longer be available after the service confirms the operation."} confirmLabel={`${statusAction?.type === "enable" ? "Enable" : "Disable"} Coupon`} variant={statusAction?.type === "enable" ? "success" : "warning"} isProcessing={processing} onConfirm={confirmStatusChange} onCancel={() => !processing && setStatusAction(null)} /></AdminModalPortal>
  </section>;
}

export default AdminCouponManager;
