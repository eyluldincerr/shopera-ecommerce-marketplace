import { useEffect } from "react";
import { createPortal } from "react-dom";

function AdminModalPortal({ isOpen, children }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export default AdminModalPortal;
