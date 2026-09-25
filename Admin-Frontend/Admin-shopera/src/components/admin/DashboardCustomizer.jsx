import { ArrowDown, ArrowUp, EyeOff, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function DashboardCustomizer({
  hiddenWidgets,
  visibleWidgets,
  isOpen,
  onClose,
  onReset,
  onRestore,
  onHide,
  onMoveWidget,
}) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingReset(false);
      return undefined;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (!focusableElements?.length) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="admin-dashboard-customizer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="admin-dashboard-customizer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-customizer-title"
      >
        <div className="admin-dashboard-customizer-header">
          <div>
            <h2 id="dashboard-customizer-title">Customize Dashboard</h2>
            <p>{hiddenWidgets.length} hidden widgets</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="admin-customizer-icon-button"
            aria-label="Close dashboard customizer"
            title="Close"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="admin-dashboard-customizer-lists">
          <section className="admin-dashboard-visible-list" aria-labelledby="visible-widgets-title">
            <h3 id="visible-widgets-title">Visible widgets</h3>
            {visibleWidgets.map((widget, index) => (
              <div className="admin-dashboard-visible-item" key={widget.id}>
                <span>{widget.title}</span>
                <div>
                  <button
                    type="button"
                    className="admin-customizer-icon-button"
                    aria-label={`Move ${widget.title} up`}
                    title={`Move ${widget.title} up`}
                    disabled={index === 0}
                    onClick={() => onMoveWidget(widget.id, -1)}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="admin-customizer-icon-button"
                    aria-label={`Move ${widget.title} down`}
                    title={`Move ${widget.title} down`}
                    disabled={index === visibleWidgets.length - 1}
                    onClick={() => onMoveWidget(widget.id, 1)}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="admin-customizer-icon-button"
                    aria-label={`Hide ${widget.title}`}
                    title={`Hide ${widget.title}`}
                    onClick={() => onHide(widget.id)}
                  >
                    <EyeOff size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="admin-dashboard-hidden-list">
            <h3>Hidden widgets</h3>
            {hiddenWidgets.length === 0 ? (
              <p className="admin-dashboard-hidden-empty">
                All dashboard widgets are visible.
              </p>
            ) : (
              hiddenWidgets.map((widget) => (
                <div className="admin-dashboard-hidden-item" key={widget.id}>
                  <span>{widget.title}</span>
                  <button
                    type="button"
                    className="admin-customizer-icon-button"
                    aria-label={`Restore ${widget.title}`}
                    title={`Restore ${widget.title}`}
                    onClick={() => onRestore(widget.id)}
                  >
                    <Plus size={17} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </section>
        </div>

        <div className="admin-dashboard-customizer-footer">
          {isConfirmingReset ? (
            <div className="admin-dashboard-reset-confirmation">
              <span>Restore every widget and the default order?</span>
              <button type="button" onClick={onReset}>Yes, reset</button>
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="admin-dashboard-reset-button"
              onClick={() => setIsConfirmingReset(true)}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset to Default Layout
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardCustomizer;
