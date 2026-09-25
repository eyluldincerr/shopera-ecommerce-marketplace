import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  Search,
  ShieldCheck,
} from "lucide-react";

import AdminConfirmModal from "../../components/admin/AdminConfirmModal";
import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import SellerApplicationDetailsModal from "../../components/admin/SellerApplicationDetailsModal";
import SellerRejectionModal from "../../components/admin/SellerRejectionModal";

import {
  approveAdminStoreApplication,
  getAdminStoreApplications,
  rejectAdminStoreApplication,
} from "../../api/adminStoreService";

import { getAuthenticatedUserId } from "../../auth/authSession";

const initialConfirmationState = {
  isOpen: false,
  action: "",
  application: null,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  variant: "warning",
};

function SellerVerificationPage() {
  const currentAdminUserId = getAuthenticatedUserId();
  const location = useLocation();
  const navigate = useNavigate();

  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    approvalFilter,
    setApprovalFilter,
  ] = useState("ALL");

  const [
    accountStatusFilter,
    setAccountStatusFilter,
  ] = useState("ALL");

  const [
    selectedApplication,
    setSelectedApplication,
  ] = useState(null);

  const [
    rejectionApplication,
    setRejectionApplication,
  ] = useState(null);

  const [
    confirmation,
    setConfirmation,
  ] = useState(
    initialConfirmationState
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    const loadApplications =
      async () => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const loadedApplications =
            await getAdminStoreApplications();

          setApplications(
            Array.isArray(
              loadedApplications
            )
              ? loadedApplications
              : []
          );
        } catch (error) {
          console.error(
            "Brand applications could not be loaded:",
            error
          );

          setErrorMessage(
            error.message ||
              "Brand applications could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadApplications();
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      !location.state
    ) {
      return;
    }

    const selectedStoreId =
      Number(
        location.state
          .selectedStoreId
      );

    const selectedSellerId =
      Number(
        location.state
          .selectedSellerId
      );

    const notificationApprovalFilter =
      location.state
        .approvalFilter;

    if (
      notificationApprovalFilter
    ) {
      setSearchValue("");

      setApprovalFilter(
        notificationApprovalFilter
      );

      setAccountStatusFilter(
        "ALL"
      );
    }

    if (
      selectedStoreId ||
      selectedSellerId
    ) {
      const matchingApplication =
        applications.find(
          (application) => {
            if (
              selectedStoreId
            ) {
              return (
                Number(
                  application.storeId
                ) ===
                selectedStoreId
              );
            }

            return (
              Number(
                application
                  .sellerUserId
              ) ===
              selectedSellerId
            );
          }
        );

      if (
        matchingApplication
      ) {
        setSearchValue("");
        setApprovalFilter("ALL");
        setAccountStatusFilter(
          "ALL"
        );

        setSelectedApplication(
          matchingApplication
        );
      } else {
        const missingIdentifier =
          selectedStoreId
            ? `Brand #${selectedStoreId}`
            : `Brand owner account #${selectedSellerId}`;

        setErrorMessage(
          `${missingIdentifier} could not be found.`
        );
      }
    }

    navigate(
      location.pathname,
      {
        replace: true,
        state: null,
      }
    );
  }, [
    applications,
    isLoading,
    location.pathname,
    location.state,
    navigate,
  ]);

  const filteredApplications =
    useMemo(() => {
      const normalizedSearch =
        searchValue
          .trim()
          .toLowerCase();

      return applications.filter(
        (application) => {
          const storeName =
            String(
              application.storeName ||
                ""
            ).toLowerCase();

          const ownerName =
            String(
              application.fullName ||
                ""
            ).toLowerCase();

          const email =
            String(
              application.email ||
                ""
            ).toLowerCase();

          const matchesSearch =
            normalizedSearch ===
              "" ||
            storeName.includes(
              normalizedSearch
            ) ||
            ownerName.includes(
              normalizedSearch
            ) ||
            email.includes(
              normalizedSearch
            ) ||
            String(
              application
                .sellerUserId
            ).includes(
              normalizedSearch
            ) ||
            String(
              application.storeId
            ).includes(
              normalizedSearch
            );

          const matchesApprovalStatus =
            approvalFilter ===
              "ALL" ||
            application.approvalStatus ===
              approvalFilter;

          const matchesAccountStatus =
            accountStatusFilter ===
              "ALL" ||
            application.accountStatus ===
              accountStatusFilter;

          return (
            matchesSearch &&
            matchesApprovalStatus &&
            matchesAccountStatus
          );
        }
      );
    }, [
      applications,
      searchValue,
      approvalFilter,
      accountStatusFilter,
    ]);

  const applicationCounts =
    useMemo(() => {
      return {
        total:
          applications.length,

        pending:
          applications.filter(
            (application) =>
              application.approvalStatus ===
              "PENDING"
          ).length,

        approved:
          applications.filter(
            (application) =>
              application.approvalStatus ===
              "APPROVED"
          ).length,

        rejected:
          applications.filter(
            (application) =>
              application.approvalStatus ===
              "REJECTED"
          ).length,

        suspended:
          applications.filter(
            (application) =>
              application.approvalStatus ===
              "SUSPENDED"
          ).length,
      };
    }, [applications]);

  const updateApplicationInState =
    (updatedApplication) => {
      setApplications(
        (
          currentApplications
        ) =>
          currentApplications.map(
            (application) =>
              Number(
                application.storeId
              ) ===
              Number(
                updatedApplication.storeId
              )
                ? updatedApplication
                : application
          )
      );
    };

  const finishApplicationUpdate =
    (updatedApplication) => {
      updateApplicationInState(
        updatedApplication
      );

      setSuccessMessage(
        `${updatedApplication.storeName}'s approval status was updated to ${updatedApplication.approvalStatus}.`
      );

      window.dispatchEvent(
        new Event(
          "admin-data-updated"
        )
      );

      window.dispatchEvent(
        new Event(
          "admin-notifications-updated"
        )
      );
    };

  const requestApprove = (
    application
  ) => {
    setSelectedApplication(
      null
    );

    setRejectionApplication(
      null
    );

    setSuccessMessage("");
    setErrorMessage("");

    setConfirmation({
      isOpen: true,
      action: "approve",
      application,
      title:
        "Approve brand application?",
      message:
        `${application.storeName} will receive APPROVED approval status. The Seller remains responsible for the Store operational status.`,
      confirmLabel:
        "Approve Brand",
      variant: "success",
    });
  };

  const requestReject = (
    application
  ) => {
    setSelectedApplication(
      null
    );

    setConfirmation(
      initialConfirmationState
    );

    setSuccessMessage("");
    setErrorMessage("");

    setRejectionApplication(
      application
    );
  };

  const closeConfirmation =
    () => {
      if (!isProcessing) {
        setConfirmation(
          initialConfirmationState
        );
      }
    };

  const closeRejectionModal =
    () => {
      if (!isProcessing) {
        setRejectionApplication(
          null
        );
      }
    };

  const confirmApplicationAction =
    async () => {
      if (
        !confirmation.application
      ) {
        return;
      }

      try {
        setIsProcessing(true);
        setErrorMessage("");
        setSuccessMessage("");

        let updatedApplication =
          null;

        if (
          confirmation.action ===
          "approve"
        ) {
          updatedApplication =
            await approveAdminStoreApplication(
              confirmation
                .application
                .storeId,
              currentAdminUserId,
              "The brand application was approved after administrator verification."
            );
        }

        if (
          !updatedApplication
        ) {
          throw new Error(
            "Unsupported brand application action."
          );
        }

        finishApplicationUpdate(
          updatedApplication
        );

        setConfirmation(
          initialConfirmationState
        );
      } catch (error) {
        console.error(
          "Brand application status could not be updated:",
          error
        );

        setErrorMessage(
          error.message ||
            "Brand application status could not be updated."
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const submitRejection =
    async (
      rejectionReason
    ) => {
      if (
        !rejectionApplication
      ) {
        return;
      }

      try {
        setIsProcessing(true);
        setErrorMessage("");
        setSuccessMessage("");

        const updatedApplication =
          await rejectAdminStoreApplication(
            rejectionApplication.storeId,
            currentAdminUserId,
            rejectionReason
          );

        finishApplicationUpdate(
          updatedApplication
        );

        setRejectionApplication(
          null
        );
      } catch (error) {
        console.error(
          "Brand application could not be rejected:",
          error
        );

        setErrorMessage(
          error.message ||
            "Brand application could not be rejected."
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const resetFilters = () => {
    setSearchValue("");
    setApprovalFilter("ALL");
    setAccountStatusFilter(
      "ALL"
    );
  };

  const formatRegistrationDate =
    (dateValue) => {
      if (!dateValue) {
        return "Not available";
      }

      const date =
        new Date(dateValue);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Not available";
      }

      return date.toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );
    };

  const columns = [
    {
      key: "seller",
      header: "Brand / Owner",

      render: (
        application
      ) => (
        <div className="admin-seller-table-profile">
          <div className="admin-seller-table-avatar">
            {
              application.initials
            }
          </div>

          <div>
            <strong>
              {
                application.storeName
              }
            </strong>

            <span>
              {
                application.fullName
              }
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "storeId",
      header: "Brand ID",

      render: (
        application
      ) =>
        `#${application.storeId}`,
    },
    {
      key: "sellerUserId",
      header:
        "Brand Owner User ID",

      render: (
        application
      ) =>
        `#${application.sellerUserId}`,
    },
    {
      key: "email",
      header:
        "Brand Owner Email",
    },
    {
      key: "createdDate",
      header:
        "Brand Created Date",

      render: (
        application
      ) =>
        formatRegistrationDate(
          application.createdDate
        ),
    },
    {
      key: "accountStatus",
      header:
        "Account Status",

      render: (
        application
      ) => (
        <AdminStatusBadge
          status={
            application.accountStatus
          }
        />
      ),
    },
    {
      key: "storeStatus",
      header: "Brand Status",

      render: (
        application
      ) => (
        <AdminStatusBadge
          status={
            application.storeStatus
          }
        />
      ),
    },
    {
      key: "approvalStatus",
      header:
        "Approval Status",

      render: (
        application
      ) => (
        <AdminStatusBadge
          status={
            application.approvalStatus
          }
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className:
        "admin-table-actions-column",

      render: (
        application
      ) => (
        <button
          type="button"
          className="admin-table-view-button"
          onClick={() =>
            setSelectedApplication(
              application
            )
          }
        >
          <Eye size={16} />
          Review
        </button>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Brand Applications"
        description="Review brand applications and update their approval status."
      />

      <section className="admin-verification-summary-grid">
        <article className="admin-verification-summary-card">
          <span>
            Total Brand Applications
          </span>

          <strong>
            {
              applicationCounts.total
            }
          </strong>
        </article>

        <article className="admin-verification-summary-card">
          <span>Pending</span>

          <strong>
            {
              applicationCounts.pending
            }
          </strong>
        </article>

        <article className="admin-verification-summary-card">
          <span>Approved</span>

          <strong>
            {
              applicationCounts.approved
            }
          </strong>
        </article>

        <article className="admin-verification-summary-card">
          <span>Rejected</span>

          <strong>
            {
              applicationCounts.rejected
            }
          </strong>
        </article>

        <article className="admin-verification-summary-card">
          <span>Suspended</span>

          <strong>
            {
              applicationCounts.suspended
            }
          </strong>
        </article>
      </section>

      {successMessage && (
        <div className="admin-page-notice admin-page-notice-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error">
          {errorMessage}
        </div>
      )}

      <section className="admin-verification-panel">
        <div className="admin-verification-toolbar">
          <div className="admin-users-search">
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(
                event
              ) =>
                setSearchValue(
                  event.target
                    .value
                )
              }
              placeholder="Search brand, owner, email, brand ID or brand owner user ID..."
            />
          </div>

          <select
            value={
              approvalFilter
            }
            onChange={(
              event
            ) =>
              setApprovalFilter(
                event.target
                  .value
              )
            }
            aria-label="Filter brand applications by approval status"
          >
            <option value="ALL">
              All approval
              statuses
            </option>

            <option value="PENDING">
              PENDING
            </option>

            <option value="APPROVED">
              APPROVED
            </option>

            <option value="REJECTED">
              REJECTED
            </option>

            <option value="SUSPENDED">
              SUSPENDED
            </option>
          </select>

          <select
            value={
              accountStatusFilter
            }
            onChange={(
              event
            ) =>
              setAccountStatusFilter(
                event.target
                  .value
              )
            }
            aria-label="Filter brand owners by account status"
          >
            <option value="ALL">
              All account
              statuses
            </option>

            <option value="ACTIVE">
              ACTIVE
            </option>

            <option value="INACTIVE">
              INACTIVE
            </option>

            <option value="SUSPENDED">
              SUSPENDED
            </option>
          </select>

          <button
            type="button"
            className="admin-reset-filters-button"
            onClick={
              resetFilters
            }
          >
            Reset filters
          </button>
        </div>

        <div className="admin-users-results-heading">
          <div>
            <ShieldCheck
              size={18}
            />

            <strong>
              {
                filteredApplications.length
              }{" "}
              brand applications
              found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading brand
            applications...
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={
              filteredApplications
            }
            rowKey="storeId"
            emptyMessage="No brand applications match the selected filters."
          />
        )}
      </section>

      <SellerApplicationDetailsModal
        isOpen={Boolean(
          selectedApplication
        )}
        application={
          selectedApplication
        }
        onClose={() =>
          setSelectedApplication(
            null
          )
        }
        onRequestApprove={
          requestApprove
        }
        onRequestReject={
          requestReject
        }
      />

      <SellerRejectionModal
        isOpen={Boolean(
          rejectionApplication
        )}
        application={
          rejectionApplication
        }
        isProcessing={
          isProcessing
        }
        onSubmit={
          submitRejection
        }
        onCancel={
          closeRejectionModal
        }
      />

      <AdminConfirmModal
        isOpen={
          confirmation.isOpen
        }
        title={
          confirmation.title
        }
        message={
          confirmation.message
        }
        confirmLabel={
          confirmation.confirmLabel
        }
        variant={
          confirmation.variant
        }
        isProcessing={
          isProcessing
        }
        onConfirm={
          confirmApplicationAction
        }
        onCancel={
          closeConfirmation
        }
      />
    </AdminPageLayout>
  );
}

export default SellerVerificationPage;
