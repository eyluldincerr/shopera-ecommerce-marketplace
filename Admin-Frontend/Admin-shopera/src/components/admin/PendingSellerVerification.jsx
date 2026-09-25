import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminConfirmModal from "./AdminConfirmModal";
import SellerApplicationDetailsModal from "./SellerApplicationDetailsModal";
import SellerRejectionModal from "./SellerRejectionModal";
import AdminModalPortal from "./AdminModalPortal";
import { approveAdminStoreApplication, getAdminStoreApplications, rejectAdminStoreApplication } from "../../api/adminStoreService";

const formatDate = value => { if (!value) return "—"; const date=new Date(value); return Number.isNaN(date.getTime())?"—":date.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}); };

function PendingSellerVerification() {
  const navigate=useNavigate();
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[success,setSuccess]=useState(""),[selected,setSelected]=useState(null),[approving,setApproving]=useState(null),[rejecting,setRejecting]=useState(null),[processing,setProcessing]=useState(false);
  const load=useCallback(async()=>{try{setLoading(true);setError("");const records=await getAdminStoreApplications();setItems(records.filter(item=>!item.approvalStatus||item.approvalStatus==="PENDING").slice(0,5));}catch(e){setError(e.message||"Brand applications could not be loaded.");}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const approve=async()=>{try{setProcessing(true);setError("");setSuccess("");await approveAdminStoreApplication(approving.storeId);setSuccess(`${approving.storeName} was approved.`);setApproving(null);await load();window.dispatchEvent(new Event("admin-data-updated"));}catch(e){setError(e.message||"Application could not be approved.");}finally{setProcessing(false);}};
  const reject=async reason=>{try{setProcessing(true);setError("");setSuccess("");await rejectAdminStoreApplication(rejecting.storeId,undefined,reason);setSuccess(`${rejecting.storeName} was rejected.`);setRejecting(null);await load();window.dispatchEvent(new Event("admin-data-updated"));}catch(e){setError(e.message||"Application could not be rejected.");}finally{setProcessing(false);}};
  return <article className="admin-panel"><div className="admin-panel-header admin-widget-header"><div className="admin-widget-header-copy"><h3>Pending Brand Applications</h3><small>{items.length} pending {items.length===1?"application":"applications"}</small></div><div className="admin-widget-header-actions"><button type="button" onClick={()=>navigate("/admin/seller-verification")}>View All</button></div></div>
    {success&&<p className="admin-widget-notice success" role="status">{success}</p>}{error&&<p className="admin-widget-notice error" role="alert">{error} <button type="button" onClick={load}>Retry</button></p>}
    {loading?<p className="admin-widget-state">Loading brand applications...</p>:items.length===0?<p className="admin-widget-state">No pending brand applications.</p>:<ul className="admin-compact-list">{items.map(item=><li key={item.storeId}><div><strong>{item.storeName}</strong><span>{item.fullName||item.ownerName||"—"} · Applied {formatDate(item.createdDate)}</span></div><div><button type="button" onClick={()=>setSelected(item)}>View Details</button><button type="button" onClick={()=>setApproving(item)}>Approve</button><button type="button" onClick={()=>setRejecting(item)}>Reject</button></div></li>)}</ul>}
    <AdminModalPortal isOpen={Boolean(selected)}><SellerApplicationDetailsModal isOpen={Boolean(selected)} application={selected} onClose={()=>setSelected(null)} onRequestApprove={item=>{setSelected(null);setApproving(item);}} onRequestReject={item=>{setSelected(null);setRejecting(item);}} /></AdminModalPortal>
    <AdminModalPortal isOpen={Boolean(rejecting)}><SellerRejectionModal isOpen={Boolean(rejecting)} application={rejecting} isProcessing={processing} onSubmit={reject} onCancel={()=>!processing&&setRejecting(null)}/></AdminModalPortal>
    <AdminModalPortal isOpen={Boolean(approving)}><AdminConfirmModal isOpen={Boolean(approving)} title="Approve brand application?" message={approving?`${approving.storeName} will be approved only after the service confirms the operation.`:""} confirmLabel="Approve Application" variant="success" isProcessing={processing} onConfirm={approve} onCancel={()=>!processing&&setApproving(null)}/></AdminModalPortal>
  </article>;
}
export default PendingSellerVerification;
