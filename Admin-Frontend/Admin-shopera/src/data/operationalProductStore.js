import {
  adminProductImagesData,
  adminProductInfoData,
  adminProductsData,
  adminProductVariantsData,
} from "./adminProductsData";

export const operationalProducts = structuredClone(adminProductsData);
export const operationalProductVariants = structuredClone(adminProductVariantsData);
export const operationalProductImages = structuredClone(adminProductImagesData);
export const operationalProductInfo = structuredClone(adminProductInfoData);

export const advanceRowVersion = (rowVersion) => {
  const current =
    Number.parseInt(String(rowVersion || "0").replace(/^0x/i, ""), 16) || 0;
  return `0x${(current + 1).toString(16).toUpperCase().padStart(16, "0")}`;
};
