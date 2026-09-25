import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminStatusBadge from "./AdminStatusBadge";
import ProductDetailsModal from "./ProductDetailsModal";
import AdminModalPortal from "./AdminModalPortal";
import { getAdminProductById, getAdminProducts } from "../../api/adminProductService";

function AdminProductOversightQueue() {
  const [items,setItems]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState(""), [selected,setSelected]=useState(null), [detailId,setDetailId]=useState(null);
  const load=useCallback(async()=>{try{setLoading(true);setError("");setItems(await getAdminProducts());}catch(e){setError(e.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const view=async p=>{try{setDetailId(p.productId);setError("");setSelected(await getAdminProductById(p.productId));}catch(e){setError(e.message);}finally{setDetailId(null);}};
  return <section className="admin-operational-widget" aria-labelledby="product-oversight-title"><div className="admin-operational-heading admin-widget-header"><div className="admin-widget-header-copy"><h2 id="product-oversight-title">Product Oversight</h2><p>Read-only product and sale availability summary.</p></div><div className="admin-widget-header-actions"><Link to="/admin/products">View All</Link></div></div>
    {error && <p className="admin-widget-notice error" role="alert">{error} <button type="button" onClick={load}>Retry</button></p>}
    {loading?<p className="admin-widget-state">Loading products...</p>:items.length===0?<p className="admin-widget-state">No products found.</p>:<ul className="admin-compact-list">{items.slice(0,5).map(p=><li key={p.productId}><div><strong>{p.productName}</strong><span>{[p.storeName || p.brand, p.categoryName].filter(Boolean).join(" · ") || "—"}{Number(p.totalStock)===0?" · Out of stock":""}</span></div><div>{p.status&&<AdminStatusBadge status={p.status}/>}<button type="button" disabled={detailId===p.productId} onClick={()=>view(p)}>View Product</button>{p.storeId&&<Link to="/admin/sellers" state={{selectedStoreId:p.storeId}}>View Brand</Link>}</div></li>)}</ul>}
    <AdminModalPortal isOpen={Boolean(selected)}><ProductDetailsModal isOpen={Boolean(selected)} product={selected} onClose={()=>setSelected(null)}/></AdminModalPortal>
  </section>;
}
export default AdminProductOversightQueue;
