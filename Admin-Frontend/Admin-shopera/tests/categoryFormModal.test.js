import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { deleteCategoryAndRefresh } from "../src/api/adminCategoryDeleteWorkflow.js";

test("CategoryFormModal renders in create mode without an Admin identity prop", async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const { default: CategoryFormModal } = await vite.ssrLoadModule(
      "/src/components/admin/CategoryFormModal.jsx",
    );
    const markup = renderToStaticMarkup(React.createElement(CategoryFormModal, {
      isOpen: true,
      categories: [],
      onSubmit: () => {},
      onCancel: () => {},
    }));

    assert.match(markup, /Create Category/);
    assert.match(markup, /admin-category-name/);
    assert.match(markup, /admin-parent-category/);
    assert.match(markup, /admin-category-description/);
    assert.match(markup, /Close category form/);
    assert.doesNotMatch(markup, /managingAdminUserId|adminUserId|actingAdminUserId/);
  } finally {
    await vite.close();
  }
});

test("category delete exposes a 409 and still permits a successful leaf DELETE", async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const auth = await vite.ssrLoadModule("/src/auth/authSession.js");
    const { deleteAdminCategory } = await vite.ssrLoadModule(
      "/src/api/adminCategoryService.js",
    );
    auth.setAuthenticatedSession({
      token: "jwt", userId: 1, email: "admin@test", role: "ADMIN",
    });

    const visibleCategories = [
      { categoryId: 1, categoryName: "Electronics", childCount: 1 },
      { categoryId: 2, categoryName: "Phones", childCount: 0 },
    ];
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url: String(url), options });
      if (requests.length === 1) {
        return new Response(JSON.stringify({
          title: "Conflict",
          detail: "Move child categories and products before deleting this category.",
        }), { status: 409, headers: { "content-type": "application/problem+json" } });
      }
      return new Response(null, { status: 204 });
    };

    await assert.rejects(
      deleteAdminCategory(1),
      (error) => error.status === 409 &&
        error.message === "Move child categories and products before deleting this category.",
    );
    assert.equal(visibleCategories.length, 2);

    assert.equal(await deleteAdminCategory(2), null);
    assert.equal(requests[1].options.method, "DELETE");
    assert.match(requests[1].url, /\/api\/Admin\/categories\/2$/);
  } finally {
    await vite.close();
  }
});

test("category deletion refreshes only after confirmed backend success", async () => {
  const protectedCategories = [{ categoryId: 1, categoryName: "Electronics" }];
  let refreshCount = 0;
  let notificationCount = 0;

  await assert.rejects(deleteCategoryAndRefresh({
    category: protectedCategories[0],
    deleteCategory: async () => {
      const error = new Error("Move child categories before deleting this category.");
      error.status = 409;
      throw error;
    },
    loadCategories: async () => { refreshCount += 1; },
    notifyUpdated: () => { notificationCount += 1; },
  }), (error) => error.status === 409);
  assert.equal(protectedCategories.length, 1);
  assert.equal(refreshCount, 0);
  assert.equal(notificationCount, 0);

  const events = [];
  const deletedName = await deleteCategoryAndRefresh({
    category: { categoryId: 2, categoryName: "Phones" },
    deleteCategory: async (categoryId) => { events.push(`delete:${categoryId}`); },
    loadCategories: async ({ showLoading }) => { events.push(`refresh:${showLoading}`); },
    notifyUpdated: () => { events.push("notify"); },
  });
  assert.equal(deletedName, "Phones");
  assert.deepEqual(events, ["delete:2", "refresh:false", "notify"]);
});
