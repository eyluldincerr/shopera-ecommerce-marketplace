import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("support page is localized and does not expose fake chat or ticket workflows", async () => {
  const [page, service, enText, trText] = await Promise.all([
    source("../src/pages/buyer/SupportPage.jsx"),
    source("../src/services/supportService.js"),
    source("../src/locales/en.json"),
    source("../src/locales/tr.json"),
  ]);

  assert.match(page, /useTranslation/);
  assert.match(page, /buyer\.support\./);
  assert.doesNotMatch(page, /24\/7|Live Chat|Create Ticket|Previous Support Tickets/);
  assert.doesNotMatch(service, /localStorage|supportTickets|createSupportTicket|getMySupportTickets/);

  const en = JSON.parse(enText);
  const tr = JSON.parse(trText);
  assert.equal(en.buyer.support.hero.badge, "Help center");
  assert.equal(tr.buyer.support.hero.badge, "Yardım merkezi");
  assert.match(en.buyer.support.faqs.returnPolicy.answer, /does not currently provide an automated return-request workflow/i);
  assert.match(en.buyer.support.faqs.payment.answer, /saved payment cards are not available/i);
  assert.match(en.buyer.support.faqs.contactSeller.answer, /live chat and support tickets are not currently provided/i);
});

test("buyer production deployment keeps API configurable and supports SPA deep links", async () => {
  const [client, vercel] = await Promise.all([
    source("../src/services/axiosClient.js"),
    source("../vercel.json"),
  ]);

  assert.match(client, /VITE_API_BASE_URL/);
  const config = JSON.parse(vercel);
  assert.deepEqual(config.rewrites, [
    { source: "/(.*)", destination: "/index.html" },
  ]);
});
