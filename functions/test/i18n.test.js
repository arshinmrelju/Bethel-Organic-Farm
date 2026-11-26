import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatFarmDate, formatPaise, MESSAGES, SUPPORTED_LOCALES, translate } from "../../public/js/i18n.js";

test("each supported UI locale has the same stable key coverage and English fallback", () => {
  const englishKeys = Object.keys(MESSAGES.en).sort();
  for (const locale of Object.keys(SUPPORTED_LOCALES)) assert.deepEqual(Object.keys(MESSAGES[locale]).sort(), englishKeys, `${locale} translation keys`);
  assert.equal(translate("not.a.real.key", "ml"), "not.a.real.key");
  assert.equal(translate("nav.farm", "unknown"), MESSAGES.en["nav.farm"]);
});

test("public and booking pages use only registered stable translation keys", () => {
  const root = resolve(import.meta.dirname, "../..");
  const html = ["public/index.html", "public/booking.html"].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(keys.length > 0);
  for (const key of keys) assert.ok(Object.hasOwn(MESSAGES.en, key), `missing English key ${key}`);
});

test("currency and date presentation use the visitor locale while INR stays locale-neutral in storage", () => {
  assert.match(formatPaise(125050, "en"), /1,250\.50/);
  assert.doesNotThrow(() => formatPaise(125050, "ml"));
  assert.equal(formatPaise(Number.MAX_SAFE_INTEGER, "en").endsWith(".91"), true);
  assert.doesNotThrow(() => formatFarmDate("2027-03-04", "ta"));
  assert.throws(() => formatPaise(12.5, "hi"), /integer paise/);
});
