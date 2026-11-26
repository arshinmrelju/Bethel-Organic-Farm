import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRefundBreakdown,
  formatRupeesFromPaise,
  validatePaymentInstructions,
  validateRefundPolicy,
} from "../payments.js";

const policy = {
  policyVersion: "owner-version-1",
  currency: "INR",
  timeZone: "Asia/Kolkata",
  rulesByServiceType: {
    accommodation: [
      { minHoursBefore: 0, refundBps: 0 },
      { minHoursBefore: 24, refundBps: 5000 },
      { minHoursBefore: 72, refundBps: 10000 },
    ],
    experience: [{ minHoursBefore: 0, refundBps: 0 }],
  },
};

test("refund rules require explicit, bounded service-specific tiers", () => {
  assert.equal(validateRefundPolicy(policy).policyVersion, "owner-version-1");
  assert.throws(() => validateRefundPolicy({ ...policy, rulesByServiceType: {} }), /at least one|Refund rules/);
  assert.throws(() => validateRefundPolicy({
    ...policy,
    rulesByServiceType: { experience: [{ minHoursBefore: 0, refundBps: 10001 }] },
  }), /basis points/);
});

test("refund calculation uses the booking's service start and owner policy snapshot", () => {
  const now = Date.UTC(2027, 0, 1, 0, 0, 0);
  const result = calculateRefundBreakdown([
    { serviceType: "accommodation", itemId: "stay", totalPaise: 10001, serviceStartAt: now + 80 * 3_600_000 },
    { serviceType: "experience", itemId: "walk", totalPaise: 499, serviceStartAt: now + 12 * 3_600_000 },
  ], policy, now);
  assert.equal(result.totalRefundPaise, 10001);
  assert.deepEqual(result.lines.map((line) => line.refundBps), [10000, 0]);
  assert.throws(() => calculateRefundBreakdown([
    { serviceType: "accommodation", itemId: "stay", totalPaise: 100, serviceStartAt: null },
  ], policy, now), /Service start time/);
});

test("payment instructions stay off until enabled with verified VPA and payee", () => {
  assert.deepEqual(validatePaymentInstructions({ enabled: false }), { enabled: false, currency: "INR", showHoldExpiry: false });
  assert.deepEqual(validatePaymentInstructions({
    enabled: true,
    upiVpa: "bethel@examplebank",
    payeeName: "Bethel Organic Farm",
    currency: "INR",
    paymentDeadlineMinutes: 45,
    showHoldExpiry: true,
  }), {
    enabled: true,
    upiVpa: "bethel@examplebank",
    payeeName: "Bethel Organic Farm",
    currency: "INR",
    paymentDeadlineMinutes: 45,
    showHoldExpiry: true,
  });
  assert.throws(() => validatePaymentInstructions({ enabled: true, upiVpa: "", payeeName: "Farm", currency: "INR" }), /verified UPI ID/);
});

test("rupee display is formatted from integer paise without float conversion", () => {
  assert.equal(formatRupeesFromPaise(12050), "120.50");
  assert.equal(formatRupeesFromPaise(7), "0.07");
});
