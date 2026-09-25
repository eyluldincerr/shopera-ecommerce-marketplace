const statusLabelMap = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",

  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",

  OPERATIONAL: "Operational",
  NOT_OPERATIONAL: "Not Operational",

  DRAFT: "Draft",
  OUT_OF_STOCK: "Out of Stock",
  DELETED: "Deleted",

  NEW: "New",
  USED_LIKE_NEW: "Used - Like New",
  USED_GOOD: "Used - Good",
  USED_FAIR: "Used - Fair",
  REFURBISHED: "Refurbished",

  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",

  AUTHORIZED: "Authorized",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED:
    "Partially Refunded",

  PACKED: "Packed",
  IN_TRANSIT: "In Transit",

  CONVERTED: "Converted",
  ABANDONED: "Abandoned",

  EXPIRED: "Expired",
  DISABLED: "Disabled",

  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",

  SHIPPING: "Shipping",
  BILLING: "Billing",

  CARD: "Card",
  CASH_ON_DELIVERY:
    "Cash on Delivery",
  BANK_TRANSFER:
    "Bank Transfer",
  WALLET: "Wallet",

  NO_PAYMENT: "No Payment",
  NO_SHIPMENT: "No Shipment",
};

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
};

const createStatusClass = (
  normalizedStatus
) => {
  return normalizedStatus
    .toLowerCase()
    .replaceAll("_", "-");
};

const createFallbackLabel = (
  normalizedStatus
) => {
  if (!normalizedStatus) {
    return "Unknown";
  }

  return normalizedStatus
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

function AdminStatusBadge({ status }) {
  const normalizedStatus =
    normalizeStatus(status);

  const statusClass =
    createStatusClass(
      normalizedStatus || "UNKNOWN"
    );

  const statusLabel =
    statusLabelMap[normalizedStatus] ||
    createFallbackLabel(
      normalizedStatus
    );

  return (
    <span
      className={`admin-status-badge admin-status-badge-${statusClass}`}
      aria-label={`Status: ${statusLabel}`}
      title={statusLabel}
    >
      {statusLabel}
    </span>
  );
}

export default AdminStatusBadge;