import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminConfirmModal from "./AdminConfirmModal";
import CategoryFormModal from "./CategoryFormModal";
import AdminModalPortal from "./AdminModalPortal";
import { createAdminCategory, deleteAdminCategory, getAdminCategories, updateAdminCategory } from "../../api/adminCategoryService";

function AdminQuickCategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ open: false, mode: "create", category: null });
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => { try { setLoading(true); setError(""); setCategories(await getAdminCategories()); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const refresh = () => load(); window.addEventListener("admin-data-updated", refresh); return () => window.removeEventListener("admin-data-updated", refresh); }, [load]);

  const submit = async (values) => {
    try {
      setProcessing(true); setError(""); setSuccess("");
      const saved = form.mode === "edit" ? await updateAdminCategory(form.category.categoryId, values) : await createAdminCategory(values);
      setForm({ open: false, mode: "create", category: null });
      setSuccess(`${saved.categoryName} was ${form.mode === "edit" ? "updated" : "created"}.`);
      await load(); window.dispatchEvent(new Event("admin-data-updated"));
    } catch (e) { setError(e.message || "Category could not be saved."); } finally { setProcessing(false); }
  };
  const confirmDelete = async () => {
    try { setProcessing(true); setError(""); setSuccess(""); await deleteAdminCategory(deleting.categoryId); setSuccess(`${deleting.categoryName} was deleted.`); setDeleting(null); await load(); window.dispatchEvent(new Event("admin-data-updated")); }
    catch (e) { setError(e.message || "Category could not be deleted."); }
    finally { setProcessing(false); }
  };
  const canDelete = (c) => c.canDelete !== false && Number(c.productCount || 0) === 0 && Number(c.childCount || 0) === 0;

  return <section className="admin-operational-widget" aria-labelledby="category-manager-title">
    <div className="admin-operational-heading admin-widget-header"><div className="admin-widget-header-copy"><h2 id="category-manager-title">Quick Category Manager</h2><p>Recent categories and safe shortcuts.</p></div><div className="admin-widget-header-actions"><button type="button" onClick={() => setForm({ open: true, mode: "create", category: null })}>Add Category</button><Link to="/admin/categories">View All</Link></div></div>
    {success && <p className="admin-widget-notice success" role="status">{success}</p>}
    {error && <p className="admin-widget-notice error" role="alert">{error} <button type="button" onClick={load}>Retry</button></p>}
    {loading ? <p className="admin-widget-state">Loading categories...</p> : categories.length === 0 ? <p className="admin-widget-state">No categories are available.</p> : <ul className="admin-compact-list">{categories.slice(0,5).map(c => <li key={c.categoryId}><div><strong>{c.categoryName}</strong><span>{c.parentCategoryName || "Main category"} · {Number(c.productCount || 0)} products · {Number(c.childCount || 0)} children</span></div><div><button type="button" onClick={() => setForm({ open: true, mode: "edit", category: c })}>Edit</button><button type="button" onClick={() => setForm({ open: true, mode: "create", category: { parentCategoryId: c.categoryId } })}>Add Subcategory</button><button type="button" disabled={!canDelete(c)} title={!canDelete(c) ? "Referenced categories cannot be deleted." : undefined} onClick={() => setDeleting(c)}>Delete</button></div></li>)}</ul>}
    <AdminModalPortal isOpen={form.open}><CategoryFormModal isOpen={form.open} mode={form.mode} category={form.category} categories={categories} isProcessing={processing} onSubmit={submit} onCancel={() => !processing && setForm({ open:false, mode:"create", category:null })} /></AdminModalPortal>
    <AdminModalPortal isOpen={Boolean(deleting)}><AdminConfirmModal isOpen={Boolean(deleting)} title="Delete category?" message={deleting ? `${deleting.categoryName} will be permanently deleted if the service allows it.` : ""} confirmLabel="Delete Category" variant="danger" isProcessing={processing} onConfirm={confirmDelete} onCancel={() => !processing && setDeleting(null)} /></AdminModalPortal>
  </section>;
}
export default AdminQuickCategoryManager;
