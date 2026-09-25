import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  Hash,
  Percent,
  Ticket,
  X,
} from "lucide-react";
import {
  COUPON_DISCOUNT_TYPES,
  normalizeCouponCode,
} from "../../utils/couponUtils";

const convertToDateTimeLocal = (
  dateValue
) => {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
};

function CouponFormModal({
  isOpen,
  mode = "create",
  coupon = null,
  isProcessing = false,
  onSubmit,
  onCancel,
  errorMessage = "",
}) {
  const [
    couponCode,
    setCouponCode,
  ] = useState("");

  const [
    discountType,
    setDiscountType,
  ] = useState("PERCENTAGE");

  const [
    discountValue,
    setDiscountValue,
  ] = useState("");

  const [
    expiryDate,
    setExpiryDate,
  ] = useState("");

  const [
    minPurchaseAmount,
    setMinPurchaseAmount,
  ] = useState("0");

  const [
    usageLimit,
    setUsageLimit,
  ] = useState("");

  const [
    validationMessage,
    setValidationMessage,
  ] = useState("");

  const isEditMode =
    mode === "edit";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCouponCode(
      coupon?.couponCode || ""
    );

    setDiscountType(
      COUPON_DISCOUNT_TYPES.includes(
        coupon?.discountType
      )
        ? coupon.discountType
        : "PERCENTAGE"
    );

    setDiscountValue(
      coupon?.discountValue ===
          null ||
        coupon?.discountValue ===
          undefined
        ? ""
        : String(
            coupon.discountValue
          )
    );

    setExpiryDate(
      convertToDateTimeLocal(
        coupon?.expiryDate
      )
    );

    setMinPurchaseAmount(
      coupon?.minPurchaseAmount ===
          null ||
        coupon?.minPurchaseAmount ===
          undefined
        ? "0"
        : String(
            coupon.minPurchaseAmount
          )
    );

    setUsageLimit(
      coupon?.usageLimit === null ||
        coupon?.usageLimit ===
          undefined
        ? ""
        : String(
            coupon.usageLimit
          )
    );

    setValidationMessage("");
  }, [
    isOpen,
    coupon,
    mode,
  ]);

  if (!isOpen) {
    return null;
  }

  const clearValidation = () => {
    setValidationMessage("");
  };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    if (
      typeof onSubmit !==
      "function"
    ) {
      setValidationMessage(
        "The coupon form could not be submitted."
      );

      return;
    }

    const normalizedCouponCode =
      normalizeCouponCode(couponCode);

    if (!normalizedCouponCode) {
      setValidationMessage(
        "Coupon code is required."
      );

      return;
    }

    if (
      normalizedCouponCode.length >
      50
    ) {
      setValidationMessage(
        "Coupon code cannot exceed 50 characters."
      );

      return;
    }

    if (
      !COUPON_DISCOUNT_TYPES.includes(
        discountType
      )
    ) {
      setValidationMessage(
        "A valid discount type is required."
      );

      return;
    }

    const numericDiscountValue =
      Number(discountValue);

    if (
      !Number.isFinite(
        numericDiscountValue
      ) ||
      numericDiscountValue <= 0
    ) {
      setValidationMessage(
        "Discount value must be greater than zero."
      );

      return;
    }

    if (
      discountType ===
        "PERCENTAGE" &&
      numericDiscountValue > 100
    ) {
      setValidationMessage(
        "Percentage discount cannot exceed 100."
      );

      return;
    }

    if (!expiryDate) {
      setValidationMessage(
        "A valid expiry date is required."
      );

      return;
    }

    const expiryTimestamp =
      new Date(
        expiryDate
      ).getTime();

    if (
      Number.isNaN(
        expiryTimestamp
      )
    ) {
      setValidationMessage(
        "A valid expiry date is required."
      );

      return;
    }

    const numericMinPurchaseAmount =
      minPurchaseAmount === ""
        ? 0
        : Number(
            minPurchaseAmount
          );

    if (
      !Number.isFinite(
        numericMinPurchaseAmount
      ) ||
      numericMinPurchaseAmount <
        0
    ) {
      setValidationMessage(
        "Minimum purchase amount cannot be negative."
      );

      return;
    }

    let normalizedUsageLimit =
      null;

    if (
      usageLimit.trim() !== ""
    ) {
      normalizedUsageLimit =
        Number(usageLimit);

      if (
        !Number.isInteger(
          normalizedUsageLimit
        ) ||
        normalizedUsageLimit <= 0
      ) {
        setValidationMessage(
          "Usage limit must be a positive whole number."
        );

        return;
      }
    }

    onSubmit({
      couponCode:
        normalizedCouponCode,

      discountType,

      discountValue: Number(
        numericDiscountValue.toFixed(
          2
        )
      ),

      expiryDate,

      minPurchaseAmount: Number(
        numericMinPurchaseAmount.toFixed(
          2
        )
      ),

      usageLimit:
        normalizedUsageLimit,
    });
  };

  const handleOverlayClick = () => {
    if (
      !isProcessing &&
      typeof onCancel ===
        "function"
    ) {
      onCancel();
    }
  };

  const handleCancel = () => {
    if (
      !isProcessing &&
      typeof onCancel ===
        "function"
    ) {
      onCancel();
    }
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={
        handleOverlayClick
      }
      role="presentation"
    >
      <form
        className="admin-coupon-form-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-coupon-form-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={handleCancel}
          disabled={isProcessing}
          aria-label="Close coupon form"
        >
          <X size={19} />
        </button>

        <div className="admin-coupon-form-icon">
          <Ticket size={26} />
        </div>

        <h2 id="admin-coupon-form-title">
          {isEditMode
            ? "Edit Coupon"
            : "Create Coupon"}
        </h2>

        <p className="admin-coupon-form-description">
          {isEditMode
            ? "Update the coupon fields stored in the coupon record."
            : "Create a percentage or fixed amount discount coupon."}
        </p>

        <div className="admin-coupon-form-fields">
          <label htmlFor="admin-coupon-code">
            Coupon code
          </label>

          <div className="admin-coupon-input-wrapper">
            <Ticket size={17} />

            <input
              id="admin-coupon-code"
              type="text"
              value={couponCode}
              maxLength={50}
              disabled={
                isProcessing
              }
              placeholder="Example: SUMMER20"
              autoComplete="off"
              onChange={(event) => {
                setCouponCode(
                  event.target.value.toUpperCase()
                );

                clearValidation();
              }}
            />
          </div>

          <div className="admin-coupon-character-count">
            {couponCode.length}/50
          </div>

          <div className="admin-coupon-form-row">
            <div>
              <label htmlFor="admin-discount-type">
                Discount type
              </label>

              <div className="admin-coupon-input-wrapper">
                {discountType ===
                "PERCENTAGE" ? (
                  <Percent size={17} />
                ) : (
                  <Hash size={17} />
                )}

                <select
                  id="admin-discount-type"
                  value={discountType}
                  disabled={
                    isProcessing
                  }
                  onChange={(event) => {
                    setDiscountType(
                      event.target.value
                    );

                    clearValidation();
                  }}
                >
                  <option value="PERCENTAGE">
                    Percentage
                  </option>

                  <option value="FIXED_AMOUNT">
                    Fixed Amount
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="admin-discount-value">
                Discount value
              </label>

              <div className="admin-coupon-input-wrapper">
                {discountType ===
                "PERCENTAGE" ? (
                  <Percent size={17} />
                ) : (
                  <Hash size={17} />
                )}

                <input
                  id="admin-discount-value"
                  type="number"
                  value={discountValue}
                  min="0.01"
                  max={
                    discountType ===
                    "PERCENTAGE"
                      ? "100"
                      : undefined
                  }
                  step="0.01"
                  disabled={
                    isProcessing
                  }
                  placeholder={
                    discountType ===
                    "PERCENTAGE"
                      ? "10"
                      : "15.00"
                  }
                  onChange={(event) => {
                    setDiscountValue(
                      event.target.value
                    );

                    clearValidation();
                  }}
                />
              </div>
            </div>
          </div>

          <label htmlFor="admin-coupon-expiry">
            Expiry date
          </label>

          <div className="admin-coupon-input-wrapper">
            <CalendarDays
              size={17}
            />

            <input
              id="admin-coupon-expiry"
              type="datetime-local"
              value={expiryDate}
              disabled={
                isProcessing
              }
              onChange={(event) => {
                setExpiryDate(
                  event.target.value
                );

                clearValidation();
              }}
            />
          </div>

          <div className="admin-coupon-form-row admin-coupon-last-row">
            <div>
              <label htmlFor="admin-min-purchase">
                Minimum purchase amount
              </label>

              <div className="admin-coupon-input-wrapper">
                <Hash
                  size={17}
                />

                <input
                  id="admin-min-purchase"
                  type="number"
                  value={
                    minPurchaseAmount
                  }
                  min="0"
                  step="0.01"
                  disabled={
                    isProcessing
                  }
                  placeholder="0.00"
                  onChange={(event) => {
                    setMinPurchaseAmount(
                      event.target.value
                    );

                    clearValidation();
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-usage-limit">
                Usage limit
              </label>

              <div className="admin-coupon-input-wrapper">
                <Hash size={17} />

                <input
                  id="admin-usage-limit"
                  type="number"
                  value={usageLimit}
                  min="1"
                  step="1"
                  disabled={
                    isProcessing
                  }
                  placeholder="Unlimited"
                  onChange={(event) => {
                    setUsageLimit(
                      event.target.value
                    );

                    clearValidation();
                  }}
                />
              </div>
            </div>
          </div>

          <p className="admin-coupon-usage-note">
            Leave the usage limit empty
            for unlimited configuration.
            Enforcement is deferred until
            coupon usage tracking exists.
          </p>

          <div
            className="admin-coupon-validation"
            role={
              validationMessage || errorMessage
                ? "alert"
                : undefined
            }
          >
            {validationMessage || errorMessage}
          </div>
        </div>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-modal-cancel-button"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="admin-modal-confirm-button admin-modal-confirm-success"
            disabled={
              isProcessing
            }
          >
            {isProcessing
              ? "Saving..."
              : isEditMode
              ? "Save Changes"
              : "Create Coupon"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CouponFormModal;
