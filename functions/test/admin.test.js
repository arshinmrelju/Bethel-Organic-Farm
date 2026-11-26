import test from "node:test";
import assert from "node:assert/strict";
import { validateAvailabilityConfiguration, validateServiceConfiguration } from "../admin.js";

test("service catalog configuration requires explicit INR integer-paise pricing", () => {
  const valid = validateServiceConfiguration({ serviceType: "accommodation", itemId: "cottage", displayName: " Garden Cottage ", isBookable: true, currency: "INR", unitPricePaise: 125000, feePaisePerUnit: 0, taxRateBps: 0 });
  assert.equal(valid.displayName, "Garden Cottage");
  assert.equal(valid.unitPricePaise, 125000);
  assert.throws(() => validateServiceConfiguration({ ...valid, unitPricePaise: 12.5 }), /integer paise/);
  assert.throws(() => validateServiceConfiguration({ ...valid, taxRateBps: 10001 }), /basis points/);
});

test("availability configuration binds capacity and start time to farm-local date", () => {
  const input = { serviceType: "experience", itemId: "farm-walk", date: "2027-03-04", slotId: "morning", capacity: 18, serviceStartAt: "2027-03-04T03:30:00.000Z" };
  const valid = validateAvailabilityConfiguration(input);
  assert.equal(valid.serviceStartAt.toISOString(), "2027-03-04T03:30:00.000Z");
  assert.throws(() => validateAvailabilityConfiguration({ ...input, serviceStartAt: "2027-03-03T18:00:00.000Z" }), /farm-local date/);
  assert.throws(() => validateAvailabilityConfiguration({ ...input, capacity: -1 }), /non-negative/);
});
