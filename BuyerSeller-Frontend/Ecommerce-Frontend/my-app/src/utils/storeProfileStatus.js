const STORE_STATUS_MODIFIERS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  ACTIVE: "active",
  INACTIVE: "inactive",
  CLOSED: "closed",
  NOT_SUBMITTED: "neutral",
  NOTSUBMITTED: "neutral",
};

const normalizeStoreStatus = (status) =>
  String(status || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

export const getStoreStatusModifier = (status) => {
  const normalizedStatus = normalizeStoreStatus(status);

  return (
    STORE_STATUS_MODIFIERS[normalizedStatus] ||
    "neutral"
  );
};

export const getStoreDecisionFeedback = (
  approvalStatus,
  latestDecisionNote
) => {
  const normalizedStatus = normalizeStoreStatus(
    approvalStatus
  );
  const note = String(latestDecisionNote || "").trim();

  return note &&
    (normalizedStatus === "REJECTED" ||
      normalizedStatus === "SUSPENDED")
    ? note
    : "";
};

export const getStoreStatusAction = (
  approvalStatus,
  storeStatus
) => {
  if (normalizeStoreStatus(approvalStatus) !== "APPROVED") {
    return null;
  }

  const normalizedStoreStatus = normalizeStoreStatus(
    storeStatus
  );

  if (normalizedStoreStatus === "ACTIVE") {
    return "INACTIVE";
  }

  if (normalizedStoreStatus === "INACTIVE") {
    return "ACTIVE";
  }

  return null;
};
