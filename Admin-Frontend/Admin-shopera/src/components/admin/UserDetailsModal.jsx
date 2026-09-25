import {
  CalendarDays,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import AdminStatusBadge from "./AdminStatusBadge";

function UserDetailsModal({
  isOpen,
  user,
  onClose,
  onRequestAction,
}) {
  if (!isOpen || !user) {
    return null;
  }

  const isAdministrator = user.role === "Administrator";
  const normalizedAccountStatus = String(
    user.accountStatus || user.status || ""
  )
    .trim()
    .toUpperCase();
  const isSuspended = normalizedAccountStatus === "SUSPENDED";
  const isInactive = normalizedAccountStatus === "INACTIVE";
  const canReactivate = isSuspended || isInactive;

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-user-details-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-details-title"
      >
        <div className="admin-user-modal-header">
          <div className="admin-user-modal-avatar">
            {user.initials}
          </div>

          <div>
            <h2 id="admin-user-details-title">
              {user.fullName}
            </h2>

            <div className="admin-user-modal-badges">
              <span className="admin-role-badge">
                {user.role}
              </span>

              <AdminStatusBadge status={user.status} />
            </div>
          </div>

          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <div className="admin-user-details-grid">
          <div className="admin-user-detail-item">
            <Mail size={18} />

            <div>
              <span>Email Address</span>
              <strong>{user.email}</strong>
            </div>
          </div>

          <div className="admin-user-detail-item">
            <Phone size={18} />

            <div>
              <span>Phone Number</span>
              <strong>{user.phone}</strong>
            </div>
          </div>

          <div className="admin-user-detail-item">
            <ShieldCheck size={18} />

            <div>
              <span>Assigned Role</span>
              <strong>{user.role}</strong>
            </div>
          </div>

          <div className="admin-user-detail-item">
            <CalendarDays size={18} />

            <div>
              <span>Joined Date</span>
              <strong>{user.joinedDate}</strong>
            </div>
          </div>

          <div className="admin-user-detail-item">
            <Clock3 size={18} />

            <div>
              <span>Last Login</span>
              <strong>{user.lastLogin}</strong>
            </div>
          </div>

          <div className="admin-user-detail-item">
            <ShoppingBag size={18} />

            <div>
              <span>Total Orders</span>
              <strong>{user.orderCount}</strong>
            </div>
          </div>
        </div>

        <div className="admin-user-id-row">
          <UserRound size={17} />
          <span>User ID: #{user.id}</span>
        </div>

        {!isAdministrator && (
          <div className="admin-user-modal-actions">
            {canReactivate && (
              <button
                type="button"
                className="admin-user-action-button admin-user-action-activate"
                onClick={() =>
                  onRequestAction("activate", user)
                }
              >
                Reactivate Account
              </button>
            )}

            {!canReactivate && (
              <button
                type="button"
                className="admin-user-action-button admin-user-action-suspend"
                onClick={() =>
                  onRequestAction("suspend", user)
                }
              >
                Suspend Account
              </button>
            )}

            {!isInactive && (
              <button
                type="button"
                className="admin-user-action-button admin-user-action-deactivate"
                onClick={() =>
                  onRequestAction("deactivate", user)
                }
              >
                Deactivate Account
              </button>
            )}
          </div>
        )}

        {isAdministrator && (
          <p className="admin-protected-account-message">
            Administrator accounts cannot be managed from this page.
          </p>
        )}
      </div>
    </div>
  );
}

export default UserDetailsModal;