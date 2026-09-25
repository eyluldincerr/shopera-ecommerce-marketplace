import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("hero banner plan management stays internal to Admin UX", async () => {
  const [routes, page, form] = await Promise.all([
    read("src/routes/AppRoutes.jsx"),
    read("src/pages/admin/ManagePromotionsPage.jsx"),
    read("src/components/admin/PromotionForm.jsx"),
  ]);

  assert.match(routes, /\/admin\/promotions\/plans[\s\S]*Navigate to="\/admin\/promotions"/);
  assert.doesNotMatch(page, />\s*Banner plans\s*</);
  assert.doesNotMatch(form, /<label htmlFor="promotionPlanID">Banner plan<\/label>/);
  assert.match(form, /homepage hero banner/);
});

test("hero banner duration remains simple and relative", async () => {
  const form = await read("src/components/admin/PromotionForm.jsx");

  assert.match(form, /HERO_DURATION_OPTIONS/);
  assert.doesNotMatch(form, /type="date"/);
  assert.doesNotMatch(form, /type="datetime-local"/);
  assert.match(form, /Starts immediately/);
  assert.match(form, /1600 × 520 px/);
});
