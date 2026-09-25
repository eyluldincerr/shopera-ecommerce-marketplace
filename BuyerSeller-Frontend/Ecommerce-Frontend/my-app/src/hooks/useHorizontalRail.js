import { useCallback, useEffect, useRef, useState } from "react";

const EDGE_TOLERANCE = 4;

export default function useHorizontalRail(itemCount = 0) {
  const railRef = useRef(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;

    if (!rail) {
      setCanScrollBack(false);
      setCanScrollForward(false);
      return;
    }

    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);

    setCanScrollBack(rail.scrollLeft > EDGE_TOLERANCE);
    setCanScrollForward(
      maxScrollLeft > EDGE_TOLERANCE &&
        rail.scrollLeft < maxScrollLeft - EDGE_TOLERANCE
    );
  }, []);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(updateScrollState);
    const handleResize = () => updateScrollState();

    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", handleResize);
    };
  }, [itemCount, updateScrollState]);

  const scrollByPage = useCallback((direction) => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const distance = Math.max(240, rail.clientWidth * 0.86);
    rail.scrollBy({
      left: direction * distance,
      behavior: "smooth",
    });
  }, []);

  return {
    railRef,
    canScrollBack,
    canScrollForward,
    scrollBack: () => scrollByPage(-1),
    scrollForward: () => scrollByPage(1),
  };
}
