import { EyeOff, GripVertical } from "lucide-react";

function DashboardWidgetShell({
  children,
  id,
  size,
  title,
  onHide,
}) {
  return (
    <div
      className={`admin-dashboard-widget admin-dashboard-widget-${size}`}
    >
      <div className="admin-dashboard-widget-controls">
        <button
          type="button"
          className="admin-widget-control admin-widget-drag-handle"
          aria-label={`Drag to reorder ${title}`}
          title={`Drag to reorder ${title}`}
        >
          <GripVertical size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="admin-widget-control"
          aria-label={`Hide ${title}`}
          title={`Hide ${title}`}
          onClick={() => onHide(id)}
        >
          <EyeOff size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="admin-dashboard-widget-content">
        {children}
      </div>
    </div>
  );
}

export default DashboardWidgetShell;
