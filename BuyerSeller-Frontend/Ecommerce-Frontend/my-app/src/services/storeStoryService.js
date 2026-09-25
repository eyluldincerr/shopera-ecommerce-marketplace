import { listHomeStoreStories } from "./storeMediaService.js";

export const loadStoreStories = async ({ requestStories = listHomeStoreStories } = {}) => {
  const stories = await requestStories();

  if (!Array.isArray(stories)) {
    const error = new Error("Store Stories response must be an array.");
    error.code = "STORE_STORIES_RESPONSE_INVALID";
    throw error;
  }

  return stories;
};

export const getStoreStories = (options = {}) =>
  loadStoreStories({ requestStories: () => listHomeStoreStories(options) });

export const getStoriesByStoreId = async (storeId, options = {}) =>
  (await getStoreStories(options)).filter(
    (story) => String(story.storeId) === String(storeId)
  );

export const getStoryById = async (storyId, options = {}) =>
  (await getStoreStories(options)).find(
    (story) => String(story.storeMediaId) === String(storyId)
  ) || null;
