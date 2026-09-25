import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "details > summary:first-of-type",
  "[contenteditable='true']",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const overlayStack = [];
const inertRecords = new Map();
let bodyLockCount = 0;
let originalBodyOverflow = "";
let keydownListenerAttached = false;

const isFocusableAndVisible = (element) => {
  if (
    element.closest("[inert]") ||
    element.closest('[aria-hidden="true"]') ||
    element.getAttribute("aria-disabled") === "true"
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
};

const getFocusableElements = (overlay) =>
  [...overlay.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    isFocusableAndVisible
  );

const handleOverlayKeyDown = (event) => {
  const activeOverlay = overlayStack.at(-1);
  const overlay = activeOverlay?.overlay;

  if (!overlay?.isConnected) {
    return;
  }

  if (event.key === "Escape") {
    if (!activeOverlay.preventCloseRef.current) {
      event.preventDefault();
      event.stopPropagation();
      activeOverlay.closeRef.current?.();
    }
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = getFocusableElements(overlay);

  if (focusableElements.length === 0) {
    event.preventDefault();
    overlay.focus();
    return;
  }

  const first = focusableElements[0];
  const last = focusableElements.at(-1);
  const focusIsOutside = !overlay.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || focusIsOutside)
  ) {
    event.preventDefault();
    first.focus();
  }
};

const attachKeydownListener = () => {
  if (keydownListenerAttached) {
    return;
  }

  document.addEventListener("keydown", handleOverlayKeyDown, true);
  keydownListenerAttached = true;
};

const detachKeydownListener = () => {
  if (!keydownListenerAttached || overlayStack.length > 0) {
    return;
  }

  document.removeEventListener("keydown", handleOverlayKeyDown, true);
  keydownListenerAttached = false;
};

const setBackgroundInert = (overlay) => {
  const affectedElements = new Set();
  let currentElement = overlay;

  while (
    currentElement?.parentElement &&
    currentElement.parentElement !== document.body
  ) {
    [...currentElement.parentElement.children].forEach((sibling) => {
      if (sibling !== currentElement) {
        affectedElements.add(sibling);
      }
    });
    currentElement = currentElement.parentElement;
  }

  if (currentElement?.parentElement === document.body) {
    [...document.body.children].forEach((sibling) => {
      if (sibling !== currentElement) {
        affectedElements.add(sibling);
      }
    });
  }

  affectedElements.forEach((element) => {
    const record = inertRecords.get(element);

    if (record) {
      record.count += 1;
      return;
    }

    inertRecords.set(element, {
      count: 1,
      wasInert: element.inert,
    });
    element.inert = true;
  });

  return [...affectedElements];
};

const restoreBackground = (affectedElements) => {
  affectedElements.forEach((element) => {
    const record = inertRecords.get(element);

    if (!record) {
      return;
    }

    record.count -= 1;
    if (record.count > 0) {
      return;
    }

    element.inert = record.wasInert;
    inertRecords.delete(element);
  });
};

const lockBodyScroll = () => {
  if (bodyLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;
};

const unlockBodyScroll = () => {
  bodyLockCount = Math.max(0, bodyLockCount - 1);

  if (bodyLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    originalBodyOverflow = "";
  }
};

export default function useOverlayAccessibility({
  isOpen,
  onClose,
  preventClose = false,
}) {
  const overlayRef = useRef(null);
  const initialFocusRef = useRef(null);
  const closeRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);

  closeRef.current = onClose;
  preventCloseRef.current = preventClose;

  useEffect(() => {
    const overlay = overlayRef.current;

    if (!isOpen || !overlay) {
      return undefined;
    }

    const opener = document.activeElement;
    const affectedElements = setBackgroundInert(overlay);
    const entry = {
      closeRef,
      overlay,
      preventCloseRef,
    };

    overlayStack.push(entry);
    lockBodyScroll();
    attachKeydownListener();

    const focusFrame = requestAnimationFrame(() => {
      const focusTarget =
        initialFocusRef.current ||
        getFocusableElements(overlay)[0] ||
        overlay;
      focusTarget?.focus();
    });

    return () => {
      cancelAnimationFrame(focusFrame);

      const entryIndex = overlayStack.indexOf(entry);
      if (entryIndex >= 0) {
        overlayStack.splice(entryIndex, 1);
      }

      restoreBackground(affectedElements);
      unlockBodyScroll();
      detachKeydownListener();

      requestAnimationFrame(() => {
        if (
          opener?.isConnected &&
          !opener.closest("[inert]") &&
          !opener.closest('[aria-hidden="true"]') &&
          isFocusableAndVisible(opener)
        ) {
          opener.focus();
        }
      });
    };
  }, [isOpen]);

  return { initialFocusRef, overlayRef };
}
