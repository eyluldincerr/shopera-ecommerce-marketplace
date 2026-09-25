import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

function SellerRejectionModal({
  isOpen,
  application,
  isProcessing,
  onSubmit,
  onCancel,
}) {
  const [reason, setReason] = useState("");
  const [validationMessage, setValidationMessage] =
    useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setValidationMessage("");
    }
  }, [isOpen, application]);

  if (!isOpen || !application) {
    return null;
  }

  const handleSubmit = () => {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      setValidationMessage(
        "Please enter a reason for rejecting this application."
      );
      return;
    }

    onSubmit(normalizedReason);
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="admin-seller-rejection-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-rejection-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="admin-confirm-icon admin-confirm-icon-danger">
          <AlertTriangle size={25} />
        </div>

        <h2 id="seller-rejection-title">
          Reject Brand Application
        </h2>

        <p className="admin-seller-rejection-description">
          Explain why the brand application submitted by{" "}
          <strong>{application.storeName}</strong> is being
          rejected.
        </p>

        <label
          className="admin-rejection-label"
          htmlFor="seller-rejection-reason"
        >
          Rejection reason
        </label>

        <textarea
          id="seller-rejection-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setValidationMessage("");
          }}
          rows={5}
          maxLength={500}
          placeholder="Example: The submitted tax document is expired or unreadable."
        />

        <div className="admin-rejection-field-footer">
          <span className="admin-rejection-validation">
            {validationMessage}
          </span>

          <span>{reason.length}/500</span>
        </div>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-modal-cancel-button"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="admin-modal-confirm-button admin-modal-confirm-danger"
            onClick={handleSubmit}
            disabled={isProcessing}
          >
            {isProcessing
              ? "Rejecting..."
              : "Reject Brand Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SellerRejectionModal;