// The July 2026 SQL model has no Collection table or Product relationship.
// Keep this route-facing service so existing links fail honestly while a future
// database decision is made; it must not invent a collection endpoint.
export const getCollectionBySlug = async () => null;

export const getCollectionProducts = async () => ({
  items: [],
  page: 1,
  pageSize: 0,
  totalCount: 0,
  totalPages: 0,
  hasMore: false,
  nextCursor: null,
  filterOptions: {},
});
