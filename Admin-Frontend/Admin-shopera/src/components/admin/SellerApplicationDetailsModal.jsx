import {
  CalendarDays,
  Globe,
  Mail,
  Phone,
  RotateCcw,
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

function SellerApplicationDetailsModal({
  isOpen,
  application,
  onClose,
  onRequestApprove,
  onRequestReject,
  onRequestReturnToPending,
}) {
  if (!isOpen || !application) {
    return null;
  }

  const isPending =
    application.approvalStatus === "PENDING";

  const brandOwnerUserId =
    application.sellerUserId ||
    application.userId ||
    null;

  const ownerRegistrationDate = formatDate(
    application.registrationDate
  );

  const brandCreatedDate = formatDate(
    application.createdDate
  );

  const lastUpdatedDate = formatDate(
    application.updatedDate
  );

  const canOperate =
    application.approvalStatus === "APPROVED" &&
    application.storeStatus === "ACTIVE";

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-seller-application-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-application-modal-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="admin-seller-application-header">
          <div className="admin-seller-application-avatar">
            {application.initials}
          </div>

          <div>
            <h2 id="seller-application-modal-title">
              {application.storeName}
            </h2>

            <p>
              Brand Owner:{" "}
              {application.fullName ||
                "Unknown brand owner"}
            </p>

            <div className="admin-user-modal-badges">
              <AdminStatusBadge
                status={application.approvalStatus}
              />

              <AdminStatusBadge
                status={application.storeStatus}
              />

              <AdminStatusBadge
                status={application.accountStatus}
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

        <div className="admin-seller-application-grid">
          <div className="admin-seller-detail-item">
            <Store size={18} />

            <div>
              <span>Brand ID</span>

              <strong>
                #{application.storeId}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
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

          <div className="admin-seller-detail-item">
            <ShieldCheck size={18} />

            <div>
              <span>Account Role</span>

              <strong>
                {formatRole(application.role)}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <Globe size={18} />

            <div>
              <span>Brand Slug</span>

              <strong>
                {application.storeSlug ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <Mail size={18} />

            <div>
              <span>Brand Owner Email</span>

              <strong>
                {application.email ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <Phone size={18} />

            <div>
              <span>Brand Owner Phone</span>

              <strong>
                {application.phoneNumber ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <Mail size={18} />

            <div>
              <span>Support Email</span>

              <strong>
                {application.supportEmail ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <Phone size={18} />

            <div>
              <span>Support Phone</span>

              <strong>
                {application.supportPhone ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <CalendarDays size={18} />

            <div>
              <span>Brand Created Date</span>

              <strong>{brandCreatedDate}</strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <CalendarDays size={18} />

            <div>
              <span>Owner Registration Date</span>

              <strong>
                {ownerRegistrationDate}
              </strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <CalendarDays size={18} />

            <div>
              <span>Last Updated Date</span>

              <strong>{lastUpdatedDate}</strong>
            </div>
          </div>

          <div className="admin-seller-detail-item">
            <ShieldCheck size={18} />

            <div>
              <span>Reviewed By Admin</span>

              <strong>
                {application
                  .approvedByAdminUserId
                  ? `Admin #${application.approvedByAdminUserId}`
                  : "Not reviewed yet"}
              </strong>
            </div>
          </div>
        </div>

        <section className="admin-seller-store-description">
          <div>
            <Store size={18} />
            <h3>Brand Description</h3>
          </div>

          <p>
            {application.storeDescription ||
              "No brand description was provided."}
          </p>
        </section>

        <section className="admin-seller-store-description">
          <div>
            <RotateCcw size={18} />
            <h3>Return Policy</h3>
          </div>

          <p>
            {application.returnPolicy ||
              "No return policy was provided."}
          </p>
        </section>

        <section className="admin-seller-store-description">
          <div>
            <Phone size={18} />
            <h3>Support Policy</h3>
          </div>

          <p>
            {application.supportPolicy ||
              "No support policy was provided."}
          </p>
        </section>

        <div className="admin-seller-application-actions">
          {isPending ? (
            <>
              <button
                type="button"
                className="admin-seller-reject-button"
                onClick={() =>
                  onRequestReject(application)
                }
              >
                Reject Brand Application
              </button>

              <button
                type="button"
                className="admin-seller-approve-button"
                onClick={() =>
                  onRequestApprove(application)
                }
              >
                Approve Brand Application
              </button>
            </>
          ) : (
            <button
              type="button"
              className="admin-return-pending-button"
              onClick={() =>
                onRequestReturnToPending(
                  application
                )
              }
            >
              <RotateCcw size={16} />
              Return to Pending
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SellerApplicationDetailsModal;