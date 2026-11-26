import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPaise,
  calculatePriceBreakdown,
  calculateTotalPaise,
  normalizeGuest,
  transitionState,
  validateReservationItems,
} from "../domain.js";

test("money is represented as integer paise and totals stay exact", () => {
  assert.equal(calculateTotalPaise([
    { unitPricePaise: 10001, quantity: 2 },
    { unitPricePaise: 499, quantity: 1 },
  ]), 20501);
  assert.throws(() => assertPaise(12.5), /integer/);
  assert.throws(() => calculateTotalPaise([{ unitPricePaise: 999999999999999, quantity: 100 }]), /safe integer/);
});

test("owner-configured tax and fee components remain integer paise", () => {
  assert.deepEqual(calculatePriceBreakdown([
    { unitPricePaise: 10000, feePaisePerUnit: 250, taxRateBps: 500, quantity: 2 },
  ]), { subtotalPaise: 20000, taxPaise: 1000, feesPaise: 500, totalPaise: 21500 });
  assert.throws(() => calculatePriceBreakdown([
    { unitPricePaise: 10000, feePaisePerUnit: 0, taxRateBps: 10001, quantity: 1 },
  ]), /basis points/);
});

test("reservation inputs validate and combine duplicate service lines", () => {
  const items = validateReservationItems([
    { serviceType: "experience", itemId: "walk", date: "2027-01-12", quantity: 1 },
    { serviceType: "experience", itemId: "walk", date: "2027-01-12", quantity: 2 },
  ]);
  assert.deepEqual(items, [{ serviceType: "experience", itemId: "walk", date: "2027-01-12", slotId: "day", quantity: 3 }]);
  assert.equal(validateReservationItems([
    { serviceType: "experience", itemId: "walk", date: "2027-01-12", slotId: "morning", quantity: 1 },
    { serviceType: "experience", itemId: "walk", date: "2027-01-12", slotId: "evening", quantity: 1 },
  ]).length, 2);
  assert.throws(() => validateReservationItems([{ serviceType: "experience", itemId: "walk", date: "2027-02-30", quantity: 1 }]), /calendar date/);
  assert.throws(() => validateReservationItems([{ serviceType: "unknown", itemId: "x", date: "2027-01-12", quantity: 1 }]), /Unsupported/);
});

test("guest checkout requires safe contact details and normalizes them", () => {
  assert.deepEqual(normalizeGuest({ name: "  Ada   Guest ", email: "ADA@example.com" }), {
    name: "Ada Guest", email: "ada@example.com", phone: null,
  });
  assert.throws(() => normalizeGuest({ name: "A Guest" }), /email address or phone/);
  assert.throws(() => normalizeGuest({ name: "A Guest", email: "bad" }), /valid email/);
});

test("state machines permit valid transitions and reject invalid ones", () => {
  assert.equal(transitionState("booking", "payment_review", "confirmed"), "confirmed");
  assert.equal(transitionState("payment", "submitted", "rejected"), "rejected");
  assert.equal(transitionState("refund", "processing", "completed"), "completed");
  assert.throws(() => transitionState("booking", "awaiting_payment", "confirmed"), /Invalid booking transition/);
  assert.throws(() => transitionState("payment", "verified", "rejected"), /Invalid payment transition/);
  assert.equal(transitionState("refund", "none", "requested"), "requested");
});
