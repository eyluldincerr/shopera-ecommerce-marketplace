import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  Pencil,
  Search,
  Ticket,
} from "lucide-react";

import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import CouponFormModal from "../../components/admin/CouponFormModal";

import {
  createAdminCoupon,
  getAdminCoupons,
  setAdminCouponStatus,
  updateAdminCoupon,
} from "../../api/adminCouponService";
import { canEnableCoupon } from "../../utils/couponUtils";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const initialFormState = {
  isOpen: false,
  mode: "create",
  coupon: null,
};

const formatExpiryDate = (dateValue) => {
  if (!dateValue) {
    return "No expiry date";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid expiry date";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDiscountValue = (coupon) => {
  if (coupon.discountType === "PERCENTAGE") {
    return `${Number(coupon.discountValue || 0)}%`;
  }

  return numberFormatter.format(
    Number(coupon.discountValue || 0)
  );
};

function ManageCouponsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [coupons, setCoupons] = useState([]);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [
    discountTypeFilter,
    setDiscountTypeFilter,
  ] = useState("ALL");

  const [formState, setFormState] =
    useState(initialFormState);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadCoupons = useCallback(
    async ({ showLoading = true } = {}) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const loadedCoupons =
          await getAdminCoupons();

        setCoupons(
          Array.isArray(loadedCoupons)
            ? loadedCoupons
            : []
        );
      } catch (error) {
        console.error(
          "Coupons could not be loaded:",
          error
        );

        setErrorMessage(
          error.message ||
            "Coupons could not be loaded."
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const filteredCoupons = useMemo(() => {
    const normalizedSearch = searchValue
      .trim()
      .toLowerCase();

    return coupons.filter((coupon) => {
      const matchesSearch =
        normalizedSearch === "" ||
        String(coupon.couponCode || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(coupon.discountType || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(coupon.couponId).includes(
          normalizedSearch
        );

      const matchesStatus =
        statusFilter === "ALL" ||
        coupon.effectiveStatus === statusFilter;

      const matchesDiscountType =
        discountTypeFilter === "ALL" ||
        coupon.discountType === discountTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDiscountType
      );
    });
  }, [
    coupons,
    searchValue,
    statusFilter,
    discountTypeFilter,
  ]);

  const couponCounts = useMemo(() => {
    return {
      total: coupons.length,

      active: coupons.filter(
        (coupon) =>
          coupon.effectiveStatus === "ACTIVE"
      ).length,

      expired: coupons.filter(
        (coupon) =>
          coupon.effectiveStatus === "EXPIRED"
      ).length,

      disabled: coupons.filter(
        (coupon) =>
          coupon.effectiveStatus === "DISABLED"
      ).length,
    };
  }, [coupons]);

  const openCreateModal = () => {
    setSuccessMessage("");
    setErrorMessage("");

    setFormState({
      isOpen: true,
      mode: "create",
      coupon: null,
    });
  };

  useEffect(() => {
    if (searchParams.get("action") !== "create") return;

    openCreateModal();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("action");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const openEditModal = (coupon) => {
    setSuccessMessage("");
    setErrorMessage("");

    setFormState({
      isOpen: true,
      mode: "edit",
      coupon,
    });
  };

  const closeFormModal = () => {
    if (!isProcessing) {
      setFormState(initialFormState);
    }
  };

  const submitCouponForm = async (formValues) => {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      setSuccessMessage("");

      let savedCoupon;

      if (
        formState.mode === "edit" &&
        formState.coupon
      ) {
        savedCoupon = await updateAdminCoupon(
          formState.coupon.couponId,
          formValues
        );

        setSuccessMessage(
          `${savedCoupon.couponCode} was updated successfully.`
        );
      } else {
        savedCoupon = await createAdminCoupon(
          formValues
        );

        setSuccessMessage(
          `${savedCoupon.couponCode} was created successfully.`
        );
      }

      setFormState(initialFormState);

      await loadCoupons({
        showLoading: false,
      });

      window.dispatchEvent(
        new Event("admin-data-updated")
      );
    } catch (error) {
      console.error(
        "Coupon could not be saved:",
        error
      );

      /*
        The modal remains open so entered values
        are not lost after a validation error.
      */
      setErrorMessage(
        error.message ||
          "Coupon could not be saved."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const changeCouponStatus = async (coupon) => {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const nextStatus = coupon.effectiveStatus === "ACTIVE"
        ? "DISABLED"
        : canEnableCoupon(coupon)
          ? "ACTIVE"
          : null;

      if (!nextStatus) {
        openEditModal(coupon);
        setErrorMessage("Update the coupon expiry date before enabling it.");
        return;
      }

      const updatedCoupon =
        await setAdminCouponStatus(
          coupon.couponId,
          nextStatus
        );

      setCoupons((currentCoupons) =>
        currentCoupons.map((currentCoupon) =>
          currentCoupon.couponId ===
          updatedCoupon.couponId
            ? updatedCoupon
            : currentCoupon
        )
      );

      setSuccessMessage(
        `${updatedCoupon.couponCode} was ${
          nextStatus === "ACTIVE"
            ? "enabled"
            : "disabled"
        }.`
      );

      window.dispatchEvent(
        new Event("admin-data-updated")
      );
    } catch (error) {
      console.error(
        "Coupon status could not be updated:",
        error
      );

      setErrorMessage(
        error.message ||
          "Coupon status could not be updated."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFilters = () => {
    setSearchValue("");
    setStatusFilter("ALL");
    setDiscountTypeFilter("ALL");
  };

  const columns = [
    {
      key: "coupon",
      header: "Coupon",

      render: (coupon) => (
        <div className="admin-coupon-code-cell">
          <div className="admin-coupon-code-icon">
            <Ticket size={18} />
          </div>

          <div>
            <strong>
              {coupon.couponCode}
            </strong>

            <span>
              Coupon ID: #{coupon.couponId}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "discountType",
      header: "Discount Type",

      render: (coupon) => (
        <span className="admin-coupon-type-badge">
          {coupon.discountType === "PERCENTAGE"
            ? "Percentage"
            : "Fixed Amount"}
        </span>
      ),
    },
    {
      key: "discountValue",
      header: "Discount",

      render: (coupon) => (
        <strong className="admin-coupon-discount-value">
          {formatDiscountValue(coupon)}
        </strong>
      ),
    },
    {
      key: "minPurchaseAmount",
      header: "Minimum Purchase",

      render: (coupon) =>
        numberFormatter.format(
          Number(coupon.minPurchaseAmount || 0)
        ),
    },
    {
      key: "usage",
      header: "Usage Limit",

      render: (coupon) => (
        <div className="admin-coupon-usage-cell">
          <strong>
            {coupon.usageLimit ?? "Unlimited"}
          </strong>

          <span>
            Configuration only
          </span>
        </div>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry Date",

      render: (coupon) => (
        <span className="admin-coupon-expiry-date">
          {formatExpiryDate(
            coupon.expiryDate
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Effective Status",

      render: (coupon) => (
        <AdminStatusBadge
          status={coupon.effectiveStatus}
        />
      ),
    },
    {
      key: "storedStatus",
      header: "Configured Status",
      render: (coupon) => (
        <AdminStatusBadge status={coupon.status} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "admin-table-actions-column",

      render: (coupon) => {
        return (
          <div className="admin-coupon-actions">
            <button
              type="button"
              className="admin-coupon-edit-button"
              title="Edit coupon"
              onClick={() =>
                openEditModal(coupon)
              }
            >
              <Pencil size={15} />
              Edit
            </button>

            {coupon.effectiveStatus === "ACTIVE" && <button type="button" className="admin-coupon-delete-button" disabled={isProcessing} onClick={() => changeCouponStatus(coupon)}>Disable</button>}
            {coupon.effectiveStatus === "DISABLED" && canEnableCoupon(coupon) && <button type="button" className="admin-coupon-delete-button" disabled={isProcessing} onClick={() => changeCouponStatus(coupon)}>Enable</button>}
          </div>
        );
      },
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Coupon Management"
        description="Manage coupon definitions. Usage limits are configuration-only until coupon usage tracking exists."
      >
        <button
          type="button"
          className="admin-create-coupon-button"
          onClick={openCreateModal}
        >
          <Ticket size={17} />
          Create Coupon
        </button>
      </AdminPageHeader>

      <section className="admin-coupon-overview-grid">
        <article className="admin-coupon-overview-card">
          <span>Total Coupons</span>
          <strong>
            {couponCounts.total}
          </strong>
        </article>

        <article className="admin-coupon-overview-card">
          <span>Active</span>
          <strong>
            {couponCounts.active}
          </strong>
        </article>

        <article className="admin-coupon-overview-card">
          <span>Expired</span>
          <strong>
            {couponCounts.expired}
          </strong>
        </article>

        <article className="admin-coupon-overview-card">
          <span>Disabled</span>
          <strong>
            {couponCounts.disabled}
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

      <section className="admin-coupons-panel">
        <div className="admin-coupons-toolbar">
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
              placeholder="Search coupon code, type or ID..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            aria-label="Filter coupons by effective status"
          >
            <option value="ALL">
              All statuses
            </option>

            <option value="ACTIVE">
              ACTIVE
            </option>

            <option value="EXPIRED">
              EXPIRED
            </option>

            <option value="DISABLED">
              DISABLED
            </option>
          </select>

          <select
            value={discountTypeFilter}
            onChange={(event) =>
              setDiscountTypeFilter(
                event.target.value
              )
            }
            aria-label="Filter coupons by discount type"
          >
            <option value="ALL">
              All discount types
            </option>

            <option value="PERCENTAGE">
              Percentage
            </option>

            <option value="FIXED_AMOUNT">
              Fixed Amount
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
            <Ticket size={18} />

            <strong>
              {filteredCoupons.length} coupons found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading coupons...
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredCoupons}
            rowKey="couponId"
            emptyMessage="No coupons match the selected filters."
          />
        )}
      </section>

      <CouponFormModal
        isOpen={formState.isOpen}
        mode={formState.mode}
        coupon={formState.coupon}
        isProcessing={isProcessing}
        onSubmit={submitCouponForm}
        onCancel={closeFormModal}
      />

    </AdminPageLayout>
  );
}

export default ManageCouponsPage;
