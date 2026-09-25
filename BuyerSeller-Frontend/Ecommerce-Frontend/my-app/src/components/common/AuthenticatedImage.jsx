import { useEffect, useMemo, useState } from "react";

import axiosClient, { resolveApiUrl } from "../../services/axiosClient.js";

const requiresAuthenticatedFetch = (value) => {
  const resolved = resolveApiUrl(value);

  try {
    const parsed = new URL(resolved, window.location.origin);
    return parsed.pathname.startsWith("/api/seller/");
  } catch {
    return String(resolved || "").includes("/api/seller/");
  }
};

function AuthenticatedImage({ src, alt, fallback = null, onLoad, onError, ...props }) {
  const normalizedSrc = useMemo(() => resolveApiUrl(src), [src]);
  const [displaySrc, setDisplaySrc] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl = "";
    const controller = new AbortController();

    setHasError(false);
    setDisplaySrc("");

    if (!normalizedSrc) {
      return () => controller.abort();
    }

    if (!requiresAuthenticatedFetch(normalizedSrc)) {
      setDisplaySrc(normalizedSrc);
      return () => controller.abort();
    }

    axiosClient
      .get(normalizedSrc, {
        responseType: "blob",
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!(data instanceof Blob)) {
          throw new TypeError("Image response was not binary data.");
        }

        objectUrl = URL.createObjectURL(data);
        setDisplaySrc(objectUrl);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setHasError(true);
          onError?.(error);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [normalizedSrc, onError]);

  if (!displaySrc || hasError) {
    return fallback;
  }

  return (
    <img
      {...props}
      src={displaySrc}
      alt={alt}
      onLoad={onLoad}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
}

export default AuthenticatedImage;
