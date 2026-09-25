import {
  CalendarDays,
  Globe,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";

import AdminStatusBadge from "./AdminStatusBadge";

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatRole = (role) => {
  if (role === "SELLER") {
    return "Brand";
  }

  if (role === "BUYER") {
    return "Customer";
  }

  if (role === "ADMIN") {
    return "Administrator";
  }

  return role || "Not available";
};

function SellerDetailsModal({
  isOpen,
  seller,
  onClose,
  onRequestAction,
}) {
  if (!isOpen || !seller) {
    return null;
  }

  const brandOwnerUserId =
    seller.sellerUserId ||
    seller.userId ||
    null;

  const brandCreatedDate = formatDate(
    seller.createdDate
  );

  const ownerRegistrationDate = formatDate(
    seller.registrationDate
  );

  const lastUpdatedDate = formatDate(
    seller.updatedDate
  );

  const storeStatus =
    seller.storeStatus || "INACTIVE";

  const approvalStatus =
    seller.approvalStatus || "PENDING";

  const canOperate =
    approvalStatus === "APPROVED" &&
    storeStatus === "ACTIVE";

  const canModerate =
    approvalStatus === "APPROVED" ||
    approvalStatus === "SUSPENDED";

  const isSuspended =
    storeStatus === "SUSPENDED" ||
    approvalStatus === "SUSPENDED";

  const isClosed =
    storeStatus === "CLOSED";

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-seller-details-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-seller-details-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="admin-seller-details-header">
          <div className="admin-seller-details-avatar">
            {seller.initials}
          </div>

          <div>
            <h2 id="admin-seller-details-title">
              {seller.storeName}
            </h2>

            <p>
              Brand Owner:{" "}
              {seller.fullName ||
                "Unknown brand owner"}
            </p>

            <div className="admin-seller-details-badges">
              <AdminStatusBadge
                status={seller.storeStatus}
              />

              <AdminStatusBadge
                status={seller.approvalStatus}
              />

              <AdminStatusBadge
                status={seller.accountStatus}
              />

              <AdminStatusBadge
                status={
                  canOperate
                    ? "OPERATIONAL"
                    : "NOT_OPERATIONAL"
                }
              />
            </div>
          </div>
        </div>

        <section className="admin-seller-information-grid">
          <div className="admin-seller-information-item">
            <Store size={18} />

            <div>
              <span>Brand ID</span>

              <strong>
                {seller.storeId
                  ? `#${seller.storeId}`
                  : "Not available"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <UserRound size={18} />

            <div>
              <span>Brand Owner User ID</span>

              <strong>
                {brandOwnerUserId
                  ? `#${brandOwnerUserId}`
                  : "Not available"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <ShieldCheck size={18} />

            <div>
              <span>Account Role</span>

              <strong>
                {formatRole(seller.role)}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <Globe size={18} />

            <div>
              <span>Brand Slug</span>

              <strong>
                {seller.storeSlug ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <Mail size={18} />

            <div>
              <span>Brand Owner Email</span>

              <strong>
                {seller.email ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <Phone size={18} />

            <div>
              <span>Brand Owner Phone</span>

              <strong>
                {seller.phoneNumber ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <Mail size={18} />

            <div>
              <span>Support Email</span>

              <strong>
                {seller.supportEmail ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <Phone size={18} />

            <div>
              <span>Support Phone</span>

              <strong>
                {seller.supportPhone ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <CalendarDays size={18} />

            <div>
              <span>Brand Created Date</span>
              <strong>{brandCreatedDate}</strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <CalendarDays size={18} />

            <div>
              <span>Owner Registration Date</span>
              <strong>
                {ownerRegistrationDate}
              </strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <CalendarDays size={18} />

            <div>
              <span>Last Updated Date</span>
              <strong>{lastUpdatedDate}</strong>
            </div>
          </div>

          <div className="admin-seller-information-item">
            <ShieldCheck size={18} />

            <div>
              <span>Approved By Admin</span>

              <strong>
                {seller.approvedByAdminUserId
                  ? `Admin #${seller.approvedByAdminUserId}`
                  : "Not available"}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-seller-store-description">
          <div>
            <Store size={18} />
            <h3>Brand Description</h3>
          </div>

          <p>
            {seller.storeDescription ||
              "No brand description was provided."}
          </p>
        </section>

        <section className="admin-seller-store-description">
          <div>
            <Store size={18} />
            <h3>Return Policy</h3>
          </div>

          <p>
            {seller.returnPolicy ||
              "No return policy was provided."}
          </p>
        </section>

        <section className="admin-seller-store-description">
          <div>
            <Phone size={18} />
            <h3>Support Policy</h3>
          </div>

          <p>
            {seller.supportPolicy ||
              "No support policy was provided."}
          </p>
        </section>

        <section className="admin-seller-store-description">
          <div>
            <ShieldCheck size={18} />
            <h3>Store Moderation</h3>
          </div>
          <p>
            Admin can activate, deactivate, suspend, close, or restore an approved
            Store. Deactivate is an operational pause that an approved Seller may
            later reactivate; Suspend and Close are Admin-enforced blocks. Historical
            products, orders, and financial records are preserved.
          </p>
        </section>

        {canModerate && onRequestAction && (
          <div className="admin-seller-details-actions">
            {(isSuspended || isClosed) ? (
              <button
                type="button"
                className="admin-seller-activate-button"
                onClick={() =>
                  onRequestAction("restore", seller)
                }
              >
                Restore Store
              </button>
            ) : (
              <>
                {storeStatus === "ACTIVE" ? (
                  <button
                    type="button"
                    className="admin-seller-review-button"
                    onClick={() =>
                      onRequestAction("deactivate", seller)
                    }
                  >
                    Deactivate Store
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-seller-activate-button"
                    onClick={() =>
                      onRequestAction("activate", seller)
                    }
                  >
                    Activate Store
                  </button>
                )}

                <button
                  type="button"
                  className="admin-seller-suspend-button"
                  onClick={() =>
                    onRequestAction("suspend", seller)
                  }
                >
                  Suspend Store
                </button>

                <button
                  type="button"
                  className="admin-seller-suspend-button"
                  onClick={() =>
                    onRequestAction("close", seller)
                  }
                >
                  Close Store
                </button>
              </>
            )}
          </div>
        )}

        {!canModerate && (
          <p className="admin-protected-account-message">
            Pending or rejected Stores must be handled through the approval workflow
            before operational moderation is available.
          </p>
        )}
      </div>
    </div>
  );
}

export default SellerDetailsModal;