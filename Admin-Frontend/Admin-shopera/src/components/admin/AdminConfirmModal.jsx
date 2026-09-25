import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

function AdminConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="admin-modal-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="admin-confirm-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-modal-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onCancel}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div
          className={`admin-confirm-icon admin-confirm-icon-${variant}`}
        >
          <AlertTriangle size={25} />
        </div>

        <h2 id="admin-confirm-modal-title">{title}</h2>

        <p>{message}</p>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-modal-cancel-button"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={`admin-modal-confirm-button admin-modal-confirm-${variant}`}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminConfirmModal;