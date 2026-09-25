import {
  DASHBOARD_BREAKPOINT_NAMES,
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_MAP,
} from "../config/adminDashboardWidgets.js";

export const ADMIN_DASHBOARD_SCHEMA_VERSION = 2;
export const ADMIN_DASHBOARD_STORAGE_PREFIX = "shopera.adminDashboardLayout.v2.";
const LEGACY_STORAGE_PREFIX = "shopera.adminDashboardLayout.v1.";

const cloneLayouts = (layouts = {}) => Object.fromEntries(
  DASHBOARD_BREAKPOINT_NAMES.map((breakpoint) => [
    breakpoint,
    (layouts[breakpoint] || []).map((item) => ({ ...item })),
  ]),
);

const itemsCollide = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

export const packLayout = (layout, columnCount) => {
  const placed = [];

  for (const item of layout) {
    let position;

    for (let y = 0; !position; y += 1) {
      for (let x = 0; x <= columnCount - item.w; x += 1) {
        const candidate = { ...item, x, y };
        if (!placed.some((other) => itemsCollide(candidate, other))) {
          position = candidate;
          break;
        }
      }
    }
    placed.push(position);
  }

  return placed.sort((a, b) => a.y - b.y || a.x - b.x);
};

export const reorderWidget = (orderedIds, widgetId, destinationIndex) => {
  const uniqueIds = [...new Set(orderedIds)];
  const currentIndex = uniqueIds.indexOf(widgetId);
  if (currentIndex < 0) return uniqueIds;

  uniqueIds.splice(currentIndex, 1);
  uniqueIds.splice(
    Math.max(0, Math.min(destinationIndex, uniqueIds.length)),
    0,
    widgetId,
  );
  return uniqueIds;
};

export const moveWidgetInOrder = (orderedIds, widgetId, direction) => {
  const currentIndex = orderedIds.indexOf(widgetId);
  const destinationIndex = currentIndex + direction;
  if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= orderedIds.length) {
    return [...orderedIds];
  }
  return reorderWidget(orderedIds, widgetId, destinationIndex);
};

export const getOperationalDropIndex = ({
  droppedX,
  droppedY,
  breakpoint,
  operationalStartY,
  operationalHeight,
  visibleCount,
  columnCount,
}) => {
  if (visibleCount <= 0) return 0;
  const widgetsPerRow = breakpoint === "lg" || breakpoint === "md" ? 2 : 1;
  const rowIndex = Math.max(
    0,
    Math.round((droppedY - operationalStartY) / operationalHeight),
  );
  const columnIndex = widgetsPerRow === 2 && droppedX >= columnCount / 2 ? 1 : 0;
  return Math.min(visibleCount - 1, rowIndex * widgetsPerRow + columnIndex);
};

export const placeOperationalWidgetsInCanonicalSlots = (
  orderedWidgetIds,
  breakpoint,
  startY,
  widgetDefinitions,
) => {
  const widgetsPerRow = breakpoint === "lg" || breakpoint === "md" ? 2 : 1;

  return orderedWidgetIds.map((widgetId, index) => {
    const widget = widgetDefinitions.get(widgetId);
    const width = widget.widths[breakpoint];
    const height = widget.heights[breakpoint];

    return {
      i: widgetId,
      x: (index % widgetsPerRow) * width,
      y: startY + Math.floor(index / widgetsPerRow) * height,
      w: width,
      h: height,
    };
  });
};

export const isCanonicalOperationalLayout = (items, breakpoint, startY) => {
  const expected = placeOperationalWidgetsInCanonicalSlots(
    items.map((item) => item.i),
    breakpoint,
    startY,
    DASHBOARD_WIDGET_MAP,
  );

  return items.length === new Set(items.map((item) => item.i)).size &&
    items.every((item, index) =>
      item.i === expected[index].i &&
      item.x === expected[index].x &&
      item.y === expected[index].y &&
      item.w === expected[index].w &&
      item.h === expected[index].h
    );
};

const normalizeItem = (item, widget, breakpoint, columns) => ({
  i: widget.id,
  x: Math.max(0, Math.min(Number.isFinite(item?.x) ? Math.floor(item.x) : 0, columns - widget.widths[breakpoint])),
  y: Math.max(0, Number.isFinite(item?.y) ? Math.floor(item.y) : 0),
  w: widget.widths[breakpoint],
  h: widget.heights[breakpoint],
});

export const createDefaultAdminDashboardLayout = (defaultLayouts) => ({
  schemaVersion: ADMIN_DASHBOARD_SCHEMA_VERSION,
  layouts: cloneLayouts(defaultLayouts),
  hiddenWidgetIds: [],
  lastKnownLayouts: {},
});

export const normalizeAdminDashboardLayout = (
  layout,
  defaultLayouts,
  columnCounts,
) => {
  if (!layout || layout.schemaVersion !== ADMIN_DASHBOARD_SCHEMA_VERSION) {
    return createDefaultAdminDashboardLayout(defaultLayouts);
  }

  const knownIds = new Set(DASHBOARD_WIDGETS.map((widget) => widget.id));
  const hiddenWidgetIds = [...new Set(Array.isArray(layout.hiddenWidgetIds)
    ? layout.hiddenWidgetIds.filter((id) => knownIds.has(id))
    : [])];
  const hiddenIds = new Set(hiddenWidgetIds);
  const layouts = {};

  for (const breakpoint of DASHBOARD_BREAKPOINT_NAMES) {
    const seen = new Set();
    const savedById = new Map();
    const savedItems = Array.isArray(layout.layouts?.[breakpoint])
      ? layout.layouts[breakpoint]
      : [];

    const orderedSavedItems = savedItems
      .map((item, index) => ({ item, index }))
      .sort((first, second) =>
        (first.item?.y ?? 0) - (second.item?.y ?? 0) ||
        (first.item?.x ?? 0) - (second.item?.x ?? 0) ||
        first.index - second.index
      )
      .map(({ item }) => item);

    for (const savedItem of orderedSavedItems) {
      if (!knownIds.has(savedItem?.i) || hiddenIds.has(savedItem.i) || seen.has(savedItem.i)) continue;
      seen.add(savedItem.i);
      savedById.set(
        savedItem.i,
        normalizeItem(savedItem, DASHBOARD_WIDGET_MAP.get(savedItem.i), breakpoint, columnCounts[breakpoint]),
      );
    }

    for (const defaultItem of defaultLayouts[breakpoint] || []) {
      if (hiddenIds.has(defaultItem.i) || seen.has(defaultItem.i)) continue;
      seen.add(defaultItem.i);
      savedById.set(
        defaultItem.i,
        normalizeItem(defaultItem, DASHBOARD_WIDGET_MAP.get(defaultItem.i), breakpoint, columnCounts[breakpoint]),
      );
    }

    const repaired = [];
    for (const savedItem of savedById.values()) {
      let item = { ...savedItem };
      while (repaired.some((other) => itemsCollide(item, other))) {
        item = { ...item, y: item.y + 1 };
      }
      repaired.push(item);
    }
    layouts[breakpoint] = repaired.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  const lastKnownLayouts = {};
  for (const [widgetId, savedByBreakpoint] of Object.entries(layout.lastKnownLayouts || {})) {
    const widget = DASHBOARD_WIDGET_MAP.get(widgetId);
    if (!widget || !savedByBreakpoint) continue;
    for (const breakpoint of DASHBOARD_BREAKPOINT_NAMES) {
      if (!savedByBreakpoint[breakpoint]) continue;
      lastKnownLayouts[widgetId] ||= {};
      lastKnownLayouts[widgetId][breakpoint] = normalizeItem(
        savedByBreakpoint[breakpoint], widget, breakpoint, columnCounts[breakpoint],
      );
    }
  }

  return { schemaVersion: ADMIN_DASHBOARD_SCHEMA_VERSION, layouts, hiddenWidgetIds, lastKnownLayouts };
};

export const getAdminDashboardStorageKey = (adminUserId) => {
  if (!adminUserId) throw new Error("An authenticated Admin ID is required.");
  return `${ADMIN_DASHBOARD_STORAGE_PREFIX}${adminUserId}`;
};

const migrateLegacyLayout = (legacyLayout, defaultLayouts, columnCounts) => {
  const widgetIds = DASHBOARD_WIDGETS.map((widget) => widget.id);
  const hiddenWidgetIds = [...new Set(Array.isArray(legacyLayout?.hiddenWidgetIds)
    ? legacyLayout.hiddenWidgetIds.filter((id) => widgetIds.includes(id)) : [])];
  const savedOrder = Array.isArray(legacyLayout?.widgetOrder) ? legacyLayout.widgetOrder : [];
  const orderedIds = [
    ...savedOrder.filter((id, index) => widgetIds.includes(id) && savedOrder.indexOf(id) === index),
    ...widgetIds.filter((id) => !savedOrder.includes(id)),
  ].filter((id) => !hiddenWidgetIds.includes(id));
  const layouts = {};

  for (const breakpoint of DASHBOARD_BREAKPOINT_NAMES) {
    const defaults = defaultLayouts[breakpoint] || [];
    const defaultMap = new Map(defaults.map((item) => [item.i, item]));
    const slots = defaults.filter((item) => !hiddenWidgetIds.includes(item.i))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    layouts[breakpoint] = orderedIds.map((id, index) => ({
      ...defaultMap.get(id),
      x: slots[index]?.x ?? defaultMap.get(id).x,
      y: slots[index]?.y ?? defaultMap.get(id).y,
    }));
  }

  return normalizeAdminDashboardLayout({
    schemaVersion: ADMIN_DASHBOARD_SCHEMA_VERSION,
    layouts,
    hiddenWidgetIds,
    lastKnownLayouts: {},
  }, defaultLayouts, columnCounts);
};

export const getAdminDashboardLayout = (
  adminUserId,
  defaultLayouts,
  columnCounts,
  storage = window.localStorage,
) => {
  const defaults = createDefaultAdminDashboardLayout(defaultLayouts);
  try {
    const storageKey = getAdminDashboardStorageKey(adminUserId);
    const saved = storage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.schemaVersion === ADMIN_DASHBOARD_SCHEMA_VERSION) {
        const normalized = normalizeAdminDashboardLayout(
          parsed,
          defaultLayouts,
          columnCounts,
        );
        storage.setItem(storageKey, JSON.stringify(normalized));
        return normalized;
      }
    }

    const legacy = storage.getItem(`${LEGACY_STORAGE_PREFIX}${adminUserId}`);
    if (!legacy) return defaults;
    const migrated = migrateLegacyLayout(JSON.parse(legacy), defaultLayouts, columnCounts);
    storage.setItem(storageKey, JSON.stringify(migrated));
    return migrated;
  } catch (error) {
    console.error("Admin dashboard layout could not be loaded:", error);
    return defaults;
  }
};

export const saveAdminDashboardLayout = (
  adminUserId,
  layout,
  defaultLayouts,
  columnCounts,
  storage = window.localStorage,
) => {
  const normalized = normalizeAdminDashboardLayout(layout, defaultLayouts, columnCounts);
  storage.setItem(getAdminDashboardStorageKey(adminUserId), JSON.stringify(normalized));
  return normalized;
};

export const resetAdminDashboardLayout = (
  adminUserId,
  defaultLayouts,
  storage = window.localStorage,
) => {
  const defaults = createDefaultAdminDashboardLayout(defaultLayouts);
  storage.setItem(getAdminDashboardStorageKey(adminUserId), JSON.stringify(defaults));
  return defaults;
};
