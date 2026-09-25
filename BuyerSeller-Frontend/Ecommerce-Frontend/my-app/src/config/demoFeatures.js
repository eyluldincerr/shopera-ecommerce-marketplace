const isEnabled = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "true";

export const resolveDemoFeatures = (env = {}) => Object.freeze({
  storeStories:
    env.VITE_ENABLE_DEMO_STORE_STORIES === undefined
      ? false
      : isEnabled(env.VITE_ENABLE_DEMO_STORE_STORIES),
});

export const DEMO_FEATURES = resolveDemoFeatures(import.meta.env || {});
