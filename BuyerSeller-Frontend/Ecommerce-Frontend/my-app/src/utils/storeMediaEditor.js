export const STORE_MEDIA_URL_MAX_LENGTH = 1000;

const STORE_MEDIA_FIELDS = {
  banner: "bannerUrl",
  logo: "logoUrl",
};

export const isValidStoreMediaUrl = (value) => {
  const candidate = String(value || "").trim();

  if (
    !candidate ||
    candidate.length > STORE_MEDIA_URL_MAX_LENGTH ||
    !/^https?:\/\//i.test(candidate)
  ) {
    return false;
  }

  try {
    const url = new URL(candidate);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
};

export const isValidStoreMediaUrlOrEmpty = (
  value
) => {
  const candidate = String(value || "").trim();

  return (
    candidate === "" ||
    isValidStoreMediaUrl(candidate)
  );
};

export const createStoreMediaEditor = (
  type,
  formData
) => {
  const field = STORE_MEDIA_FIELDS[type];

  if (!field) {
    throw new Error("INVALID_STORE_MEDIA_TYPE");
  }

  const currentUrl = String(
    formData?.[field] || ""
  );

  return {
    type,
    draftUrl: currentUrl,
    originalUrl: currentUrl,
  };
};

export const resolveStoreMediaEdit = (
  formData,
  editor,
  action
) => {
  const field = STORE_MEDIA_FIELDS[editor?.type];

  if (!field) {
    throw new Error("INVALID_STORE_MEDIA_TYPE");
  }

  if (action === "cancel") {
    return formData;
  }

  if (action === "remove") {
    return {
      ...formData,
      [field]: "",
    };
  }

  if (
    action !== "apply" ||
    !isValidStoreMediaUrl(editor.draftUrl)
  ) {
    throw new Error("INVALID_STORE_MEDIA_URL");
  }

  return {
    ...formData,
    [field]: editor.draftUrl.trim(),
  };
};
