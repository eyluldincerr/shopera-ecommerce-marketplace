import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminConfirmModal from "./AdminConfirmModal";
import AdminModalPortal from "./AdminModalPortal";
import AdminStatusBadge from "./AdminStatusBadge";
import UserDetailsModal from "./UserDetailsModal";
import SellerDetailsModal from "./SellerDetailsModal";
import {
  activateAdminUser,
  deactivateAdminUser,
  getAdminUsers,
  suspendAdminUser,
} from "../../api/adminAccountService";
import { getAdminStores } from "../../api/adminStoreService";

function AdminAccountAlerts() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [loadedUsers, loadedStores] = await Promise.all([
        getAdminUsers(),
        getAdminStores(),
      ]);
      setUsers(loadedUsers);
      setStores(loadedStores);
    } catch (loadError) {
      setError(loadError.message || "Account alerts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userAlertStatuses = new Set(["INACTIVE", "SUSPENDED"]);
  const storeAlertStatuses = new Set(["INACTIVE", "SUSPENDED", "CLOSED"]);

  const prioritizedUsers = users
    .filter((user) => userAlertStatuses.has(String(user.status || "").toUpperCase()))
    .slice(0, 5);

  const prioritizedStores = stores
    .filter((store) =>
      storeAlertStatuses.has(String(store.storeStatus || "").toUpperCase()),
    )
    .slice(0, 5);

  const requestUserAction = (type, record) => {
    setSuccess("");
    setError("");
    setSelected(null);
    setAction({ type, record });
  };

  const confirmUserAction = async () => {
    if (!action?.record) return;

    try {
      setProcessing(true);
      setError("");

      const userId = action.record.userId;
      const updated =
        action.type === "activate"
          ? await activateAdminUser(userId)
          : action.type === "suspend"
            ? await suspendAdminUser(userId)
            : await deactivateAdminUser(userId);

      setSuccess(`${updated.fullName} was updated.`);
      setAction(null);
      await load();
      window.dispatchEvent(new Event("admin-data-updated"));
    } catch (actionError) {
      setError(actionError.message || "Account status could not be updated.");
    } finally {
      setProcessing(false);
    }
  };

  const list = tab === "users" ? prioritizedUsers : prioritizedStores;

  return (
    <section className="admin-operational-widget" aria-labelledby="account-alerts-title">
      <div className="admin-operational-heading admin-widget-header">
        <div className="admin-widget-header-copy">
          <h2 id="account-alerts-title">User &amp; Store Account Alerts</h2>
          <p>
            User account status is Admin-managed. Store operational status is
            displayed for awareness and remains Seller-controlled.
          </p>
        </div>
        <div className="admin-widget-header-actions">
          <Link to={tab === "users" ? "/admin/users" : "/admin/sellers"}>
            View All
          </Link>
        </div>
      </div>

      <div className="admin-segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "users"}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stores"}
          onClick={() => setTab("stores")}
        >
          Stores
        </button>
      </div>

      {success && (
        <p className="admin-widget-notice success" role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="admin-widget-notice error" role="alert">
          {error} <button type="button" onClick={load}>Retry</button>
        </p>
      )}

      {loading ? (
        <p className="admin-widget-state">Loading account alerts...</p>
      ) : list.length === 0 ? (
        <p className="admin-widget-state">No {tab} currently require attention.</p>
      ) : (
        <ul className="admin-compact-list">
          {list.map((record) => {
            const isUser = tab === "users";
            const status = isUser ? record.status : record.storeStatus;
            return (
              <li key={isUser ? record.userId : record.storeId}>
                <div>
                  <strong>{isUser ? record.fullName : record.storeName}</strong>
                  <span>{isUser ? record.role : record.fullName || "—"}</span>
                </div>
                <div>
                  <AdminStatusBadge status={status} />
                  <button type="button" onClick={() => setSelected(record)}>
                    View
                  </button>
                  {isUser && (
                    <button
                      type="button"
                      onClick={() => requestUserAction("activate", record)}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminModalPortal isOpen={Boolean(selected)}>
        {tab === "users" ? (
          <UserDetailsModal
            isOpen
            user={selected}
            onClose={() => setSelected(null)}
            onRequestAction={requestUserAction}
          />
        ) : (
          <SellerDetailsModal
            isOpen
            seller={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AdminModalPortal>

      <AdminModalPortal isOpen={Boolean(action)}>
        <AdminConfirmModal
          isOpen={Boolean(action)}
          title={`${action?.type || "Update"} account?`}
          message="The user account status will change only after the backend confirms the operation."
          confirmLabel="Confirm Status Change"
          variant={action?.type === "activate" ? "success" : "warning"}
          isProcessing={processing}
          onConfirm={confirmUserAction}
          onCancel={() => !processing && setAction(null)}
        />
      </AdminModalPortal>
    </section>
  );
}

export default AdminAccountAlerts;
