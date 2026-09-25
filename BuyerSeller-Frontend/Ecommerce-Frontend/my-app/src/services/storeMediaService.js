import axiosClient from "./axiosClient.js";

const ENDPOINTS = Object.freeze({
  homeStories: "/api/stores/stories",
  showcase: (storeId) => `/api/stores/${encodeURIComponent(storeId)}/showcase`,
  sellerMedia: "/api/seller/store/media",
  sellerMediaItem: (storeMediaId) =>
    `/api/seller/store/media/${encodeURIComponent(storeMediaId)}`,
});

const read = (value, camel, pascal) => value?.[camel] ?? value?.[pascal];
const unwrap = (response) => response?.data ?? response;

const normalizePlacement = (value) => String(value || "").trim().toUpperCase();
const normalizePlatform = (value) => String(value || "").trim().toUpperCase();

export const STORE_MEDIA_PLACEMENTS = Object.freeze({
  HOME_STORY: "HOME_STORY",
  STORE_SHOWCASE: "STORE_SHOWCASE",
});

export const STORE_MEDIA_PLATFORMS = Object.freeze({
  YOUTUBE: "YOUTUBE",
  TIKTOK: "TIKTOK",
});

const mapStoreMedia = (dto = {}) => ({
  storeMediaId: Number(read(dto, "storeMediaId", "StoreMediaId")) || null,
  storeId: Number(read(dto, "storeId", "StoreId")) || null,
  storeName: String(read(dto, "storeName", "StoreName") || ""),
  storeSlug: read(dto, "storeSlug", "StoreSlug") || null,
  storeLogoUrl: read(dto, "storeLogoUrl", "StoreLogoUrl") || null,
  storeBannerUrl: read(dto, "storeBannerUrl", "StoreBannerUrl") || null,
  title: String(read(dto, "title", "Title") || ""),
  placement: normalizePlacement(read(dto, "placement", "Placement")),
  platform: normalizePlatform(read(dto, "platform", "Platform")),
  externalUrl: read(dto, "externalUrl", "ExternalUrl") || "",
  thumbnailUrl: read(dto, "thumbnailUrl", "ThumbnailUrl") || null,
  embedUrl: read(dto, "embedUrl", "EmbedUrl") || null,
  createdDate: read(dto, "createdDate", "CreatedDate") || null,
  expiresAt: read(dto, "expiresAt", "ExpiresAt") || null,
});

const mapList = (body) => {
  const items = Array.isArray(body)
    ? body
    : Array.isArray(body?.items)
      ? body.items
      : [];

  return items.map(mapStoreMedia);
};

const parseYouTubeId = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(segments[0])) {
        return segments[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const detectStoreVideoPlatform = (rawUrl) => {
  const candidate = String(rawUrl || "").trim();

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") {
      return null;
    }

    const host = parsed.hostname.toLowerCase();

    if (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com")
    ) {
      return parseYouTubeId(candidate) ? STORE_MEDIA_PLATFORMS.YOUTUBE : null;
    }

    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      return STORE_MEDIA_PLATFORMS.TIKTOK;
    }
  } catch {
    return null;
  }

  return null;
};

export const createStoreVideoPreview = (rawUrl, fallbackImage = null) => {
  const platform = detectStoreVideoPlatform(rawUrl);

  if (platform === STORE_MEDIA_PLATFORMS.YOUTUBE) {
    const videoId = parseYouTubeId(rawUrl);
    return {
      platform,
      thumbnailUrl: videoId
        ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
        : fallbackImage,
    };
  }

  if (platform === STORE_MEDIA_PLATFORMS.TIKTOK) {
    return {
      platform,
      thumbnailUrl: fallbackImage,
    };
  }

  return {
    platform: null,
    thumbnailUrl: fallbackImage,
  };
};

export const listHomeStoreStories = async (options = {}) => {
  const response = await axiosClient.get(ENDPOINTS.homeStories, {
    signal: options.signal,
  });
  return mapList(unwrap(response));
};

export const listStoreShowcase = async (storeId, options = {}) => {
  const response = await axiosClient.get(ENDPOINTS.showcase(storeId), {
    signal: options.signal,
  });
  return mapList(unwrap(response));
};

export const listSellerStoreMedia = async (options = {}) => {
  const response = await axiosClient.get(ENDPOINTS.sellerMedia, {
    signal: options.signal,
  });
  return mapList(unwrap(response));
};

export const createSellerStoreMedia = async (payload, options = {}) => {
  const response = await axiosClient.post(
    ENDPOINTS.sellerMedia,
    {
      title: String(payload?.title || "").trim(),
      videoUrl: String(payload?.videoUrl || "").trim(),
      placement: normalizePlacement(payload?.placement),
    },
    { signal: options.signal }
  );

  return mapStoreMedia(unwrap(response));
};

export const removeSellerStoreMedia = async (storeMediaId, options = {}) => {
  await axiosClient.delete(ENDPOINTS.sellerMediaItem(storeMediaId), {
    signal: options.signal,
  });
};
