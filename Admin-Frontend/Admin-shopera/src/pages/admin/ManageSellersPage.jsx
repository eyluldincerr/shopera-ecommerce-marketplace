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
  Store,
} from "lucide-react";

import AdminConfirmModal from "../../components/admin/AdminConfirmModal";
import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import SellerDetailsModal from "../../components/admin/SellerDetailsModal";

import {
  getAdminStores,
  updateAdminStoreStatus,
} from "../../api/adminStoreService";


const initialConfirmationState = {
  isOpen: false,
  action: "",
  seller: null,
  targetStatus: "",
  title: "",
  message: "",
  confirmLabel: "Confirm",
  variant: "warning",
};

function ManageSellersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sellers, setSellers] =
    useState([]);

  const [searchValue, setSearchValue] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [
    selectedSeller,
    setSelectedSeller,
  ] = useState(null);

  const [
    confirmation,
    setConfirmation,
  ] = useState(initialConfirmationState);

  const [isLoading, setIsLoading] =
    useState(true);

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
    const loadStores = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const loadedStores =
          await getAdminStores();

        setSellers(
          Array.isArray(loadedStores)
            ? loadedStores
            : []
        );
      } catch (error) {
        console.error(
          "Brands could not be loaded:",
          error
        );

        setErrorMessage(
          error.message ||
            "Brands could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      !location.state
    ) {
      return;
    }

    const selectedStoreId = Number(
      location.state.selectedStoreId
    );

    const selectedSellerId = Number(
      location.state.selectedSellerId
    );

    if (
      !selectedStoreId &&
      !selectedSellerId
    ) {
      navigate(location.pathname, {
        replace: true,
        state: null,
      });

      return;
    }

    const matchingStore =
      sellers.find((seller) => {
        if (selectedStoreId) {
          return (
            Number(seller.storeId) ===
            selectedStoreId
          );
        }

        return (
          Number(seller.sellerUserId) ===
          selectedSellerId
        );
      });

    if (matchingStore) {
      setSearchValue("");
      setStatusFilter("ALL");
      setSelectedSeller(
        matchingStore
      );
    } else {
      const missingIdentifier =
        selectedStoreId
          ? `Brand #${selectedStoreId}`
          : `Brand owner account #${selectedSellerId}`;

      setErrorMessage(
        `${missingIdentifier} could not be found among approved or suspended brands.`
      );
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [
    sellers,
    isLoading,
    location.pathname,
    location.state,
    navigate,
  ]);

  const filteredSellers =
    useMemo(() => {
      const normalizedSearch =
        searchValue
          .trim()
          .toLowerCase();

      return sellers.filter(
        (seller) => {
          const storeName =
            String(
              seller.storeName || ""
            ).toLowerCase();

          const storeSlug =
            String(
              seller.storeSlug || ""
            ).toLowerCase();

          const fullName =
            String(
              seller.fullName || ""
            ).toLowerCase();

          const email =
            String(
              seller.email || ""
            ).toLowerCase();

          const supportEmail =
            String(
              seller.supportEmail || ""
            ).toLowerCase();

          const matchesSearch =
            normalizedSearch === "" ||
            storeName.includes(
              normalizedSearch
            ) ||
            storeSlug.includes(
              normalizedSearch
            ) ||
            fullName.includes(
              normalizedSearch
            ) ||
            email.includes(
              normalizedSearch
            ) ||
            supportEmail.includes(
              normalizedSearch
            ) ||
            String(
              seller.storeId
            ).includes(
              normalizedSearch
            ) ||
            String(
              seller.sellerUserId
            ).includes(
              normalizedSearch
            );

          const matchesStatus =
            statusFilter === "ALL" ||
            seller.storeStatus ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      sellers,
      searchValue,
      statusFilter,
    ]);

  const sellerCounts =
    useMemo(() => {
      return {
        total: sellers.length,

        active:
          sellers.filter(
            (seller) =>
              seller.storeStatus ===
                "ACTIVE" &&
              seller.approvalStatus ===
                "APPROVED"
          ).length,

        suspended:
          sellers.filter(
            (seller) =>
              seller.storeStatus ===
                "SUSPENDED"
          ).length,

        inactive:
          sellers.filter(
            (seller) =>
              seller.storeStatus ===
                "INACTIVE"
          ).length,

        closed:
          sellers.filter(
            (seller) =>
              seller.storeStatus ===
                "CLOSED"
          ).length,
      };
    }, [sellers]);

  const closeConfirmation = () => {
    if (!isProcessing) {
      setConfirmation(initialConfirmationState);
    }
  };

  const requestSellerAction = (action, seller) => {
    setSelectedSeller(null);
    setSuccessMessage("");
    setErrorMessage("");

    const configurations = {
      activate: {
        targetStatus: "ACTIVE",
        title: "Activate Store?",
        message: `${seller.storeName} will become operational if its owner account is ACTIVE.`,
        confirmLabel: "Activate Store",
        variant: "success",
      },
      deactivate: {
        targetStatus: "INACTIVE",
        title: "Deactivate Store?",
        message: `${seller.storeName} will be hidden from normal public Store discovery until it is activated again. Historical commerce data is preserved.`,
        confirmLabel: "Deactivate Store",
        variant: "warning",
      },
      suspend: {
        targetStatus: "SUSPENDED",
        title: "Suspend Store?",
        message: `${seller.storeName} will be administratively suspended and prevented from operating on Shopera.`,
        confirmLabel: "Suspend Store",
        variant: "danger",
      },
      close: {
        targetStatus: "CLOSED",
        title: "Close Store?",
        message: `${seller.storeName} will receive CLOSED status. Products and historical orders remain preserved.`,
        confirmLabel: "Close Store",
        variant: "danger",
      },
      restore: {
        targetStatus: "INACTIVE",
        title: "Restore Store?",
        message: `${seller.storeName} will be restored to APPROVED / INACTIVE so it can be reviewed before becoming active again.`,
        confirmLabel: "Restore Store",
        variant: "success",
      },
    };

    const configuration = configurations[action];
    if (!configuration) {
      setErrorMessage("Unsupported Store action.");
      return;
    }

    setConfirmation({
      isOpen: true,
      action,
      seller,
      ...configuration,
    });
  };

  const confirmSellerAction = async () => {
    if (!confirmation.seller || !confirmation.targetStatus) {
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const updatedSeller = await updateAdminStoreStatus(
        confirmation.seller.storeId,
        confirmation.targetStatus
      );

      setSellers((currentSellers) =>
        currentSellers.map((seller) =>
          Number(seller.storeId) === Number(updatedSeller.storeId)
            ? { ...seller, ...updatedSeller }
            : seller
        )
      );

      setSuccessMessage(
        `${updatedSeller.storeName} is now ${updatedSeller.storeStatus}.`
      );
      setConfirmation(initialConfirmationState);
      window.dispatchEvent(new Event("admin-data-updated"));
    } catch (error) {
      console.error("Store status could not be updated:", error);
      setErrorMessage(
        error.message || "Store status could not be updated."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFilters = () => {
    setSearchValue("");
    setStatusFilter("ALL");
  };

  const formatDate = (
    dateValue
  ) => {
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
      key: "store",
      header: "Brand",

      render: (seller) => (
        <div className="admin-seller-table-profile">
          <div className="admin-seller-table-avatar">
            {seller.initials}
          </div>

          <div>
            <strong>
              {seller.storeName}
            </strong>

            <span>
              {seller.fullName}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "storeId",
      header: "Brand ID",

      render: (seller) =>
        `#${seller.storeId}`,
    },
    {
      key: "sellerUserId",
      header:
        "Brand Owner User ID",

      render: (seller) =>
        `#${seller.sellerUserId}`,
    },
    {
      key: "supportEmail",
      header: "Support Email",

      render: (seller) =>
        seller.supportEmail ||
        "Not provided",
    },
    {
      key: "createdDate",
      header:
        "Brand Created Date",

      render: (seller) =>
        formatDate(
          seller.createdDate
        ),
    },
    {
      key: "approvalStatus",
      header:
        "Approval Status",

      render: (seller) => (
        <AdminStatusBadge
          status={
            seller.approvalStatus
          }
        />
      ),
    },
    {
      key: "accountStatus",
      header:
        "Account Status",

      render: (seller) => (
        <AdminStatusBadge
          status={
            seller.accountStatus
          }
        />
      ),
    },
    {
      key: "storeStatus",
      header: "Brand Status",

      render: (seller) => (
        <AdminStatusBadge
          status={
            seller.storeStatus
          }
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className:
        "admin-table-actions-column",

      render: (seller) => (
        <button
          type="button"
          className="admin-table-view-button"
          onClick={() =>
            setSelectedSeller(
              seller
            )
          }
        >
          <Eye size={16} />
          Manage
        </button>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Brand Management"
        description="Review Store approval and moderate Store operational status without deleting historical commerce data."
      />

      <section className="admin-user-summary-grid">
        <article className="admin-user-summary-card">
          <span>
            Total Managed Brands
          </span>

          <strong>
            {sellerCounts.total}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Operational Brands
          </span>

          <strong>
            {sellerCounts.active}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Suspended Brands
          </span>

          <strong>
            {sellerCounts.suspended}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Inactive Brands
          </span>

          <strong>
            {sellerCounts.inactive}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Closed Brands
          </span>

          <strong>
            {sellerCounts.closed}
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

      <section className="admin-users-panel">
        <div className="admin-sellers-toolbar">
          <div className="admin-users-search">
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value
                )
              }
              placeholder="Search brand, slug, owner, support email, brand ID or owner user ID..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            aria-label="Filter brands by brand status"
          >
            <option value="ALL">
              All brand statuses
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

            <option value="CLOSED">
              CLOSED
            </option>
          </select>

          <button
            type="button"
            className="admin-reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div className="admin-users-results-heading">
          <div>
            <Store size={18} />

            <strong>
              {filteredSellers.length}{" "}
              managed brands found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading brands...
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredSellers}
            rowKey="storeId"
            emptyMessage="No brands match the selected filters."
          />
        )}
      </section>

      <SellerDetailsModal
        isOpen={Boolean(
          selectedSeller
        )}
        seller={selectedSeller}
        onClose={() =>
          setSelectedSeller(null)
        }
        onRequestAction={requestSellerAction}
      />

      <AdminConfirmModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmLabel={confirmation.confirmLabel}
        variant={confirmation.variant}
        isProcessing={isProcessing}
        onConfirm={confirmSellerAction}
        onCancel={closeConfirmation}
      />

    </AdminPageLayout>
  );
}

export default ManageSellersPage;
