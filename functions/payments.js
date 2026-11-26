import { SERVICE_TYPES } from "./domain.js";

export function validateRefundPolicy(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Refund policy configuration is required.");
  const policyVersion = typeof input.policyVersion === "string" ? input.policyVersion.trim() : "";
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(policyVersion)) throw new TypeError("Refund policy version is required.");
  if (input.currency !== "INR") throw new TypeError("Refund policy currency must match INR bookings.");
  if (input.timeZone !== "Asia/Kolkata") throw new TypeError("Refund policy timezone must be Asia/Kolkata.");
  if (!input.rulesByServiceType || typeof input.rulesByServiceType !== "object" || Array.isArray(input.rulesByServiceType)) {
    throw new TypeError("Refund rules by service type are required.");
  }
  if (Object.keys(input.rulesByServiceType).length === 0) throw new TypeError("Refund rules need at least one service type.");

  const rulesByServiceType = {};
  for (const [serviceType, rawTiers] of Object.entries(input.rulesByServiceType)) {
    if (!SERVICE_TYPES.has(serviceType)) throw new TypeError(`Unsupported refund service type: ${serviceType}.`);
    if (!Array.isArray(rawTiers) || rawTiers.length < 1 || rawTiers.length > 30) throw new TypeError(`Refund tiers for ${serviceType} are required.`);
    const tiers = rawTiers.map((tier) => {
      if (!tier || !Number.isSafeInteger(tier.minHoursBefore) || tier.minHoursBefore < 0) throw new TypeError("Refund tier threshold must be non-negative whole hours before service.");
      if (!Number.isSafeInteger(tier.refundBps) || tier.refundBps < 0 || tier.refundBps > 10000) throw new TypeError("Refund percentage must be 0 to 10000 basis points.");
      return { minHoursBefore: tier.minHoursBefore, refundBps: tier.refundBps };
    }).sort((a, b) => a.minHoursBefore - b.minHoursBefore);
    if (tiers[0].minHoursBefore !== 0) throw new TypeError(`Refund tiers for ${serviceType} must define a zero-hour outcome.`);
    if (new Set(tiers.map((tier) => tier.minHoursBefore)).size !== tiers.length) throw new TypeError(`Refund tier thresholds for ${serviceType} must be unique.`);
    rulesByServiceType[serviceType] = tiers;
  }
  return { policyVersion, currency: input.currency, timeZone: input.timeZone, rulesByServiceType };
}

function paise(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer number of paise.`);
  return value;
}

function epochMillis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (Number.isSafeInteger(value)) return value;
  throw new TypeError("Service start time must be configured.");
}

export function calculateRefundBreakdown(reservations, policyInput, requestedAtMillis) {
  const policy = validateRefundPolicy(policyInput);
  if (!Array.isArray(reservations) || reservations.length === 0) throw new TypeError("Reservation lines are required to calculate a refund.");
  if (!Number.isSafeInteger(requestedAtMillis)) throw new TypeError("Cancellation request time is invalid.");
  const lines = reservations.map((reservation) => {
    const tiers = policy.rulesByServiceType[reservation.serviceType];
    if (!tiers) throw new TypeError(`No refund policy is configured for ${reservation.serviceType}.`);
    const amountPaise = paise(reservation.totalPaise, "Paid line amount");
    const startMillis = epochMillis(reservation.serviceStartAt);
    const hoursBefore = (startMillis - requestedAtMillis) / 3_600_000;
    const applicableTier = tiers.filter((tier) => hoursBefore >= tier.minHoursBefore).at(-1) ?? tiers[0];
    const refundPaise = Number((BigInt(amountPaise) * BigInt(applicableTier.refundBps) + 5000n) / 10000n);
    if (!Number.isSafeInteger(refundPaise)) throw new RangeError("Refund amount is outside the safe integer range.");
    return {
      serviceType: reservation.serviceType,
      itemId: reservation.itemId,
      paidPaise: amountPaise,
      refundBps: applicableTier.refundBps,
      refundPaise,
    };
  });
  const totalRefundPaise = lines.reduce((total, line) => total + line.refundPaise, 0);
  if (!Number.isSafeInteger(totalRefundPaise)) throw new RangeError("Combined refund is outside the safe integer range.");
  return { currency: policy.currency, policyVersion: policy.policyVersion, totalRefundPaise, lines };
}

export function validatePaymentInstructions(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Payment instructions are required.");
  if (typeof input.enabled !== "boolean") throw new TypeError("Payment instructions need an explicit enabled setting.");
  if (input.enabled !== true) return { enabled: false, currency: "INR", showHoldExpiry: input.showHoldExpiry === true };
  const upiVpa = typeof input.upiVpa === "string" ? input.upiVpa.trim() : "";
  const payeeName = typeof input.payeeName === "string" ? input.payeeName.trim().replace(/\s+/g, " ") : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,99}@[A-Za-z0-9.-]{2,64}$/.test(upiVpa)) throw new TypeError("Enter the farm's verified UPI ID.");
  if (payeeName.length < 2 || payeeName.length > 100) throw new TypeError("Enter the verified UPI payee name.");
  if (input.currency !== "INR") throw new TypeError("UPI instructions must use INR.");
  let paymentDeadlineMinutes = null;
  if (input.paymentDeadlineMinutes !== null && input.paymentDeadlineMinutes !== undefined) {
    if (!Number.isSafeInteger(input.paymentDeadlineMinutes) || input.paymentDeadlineMinutes < 1) throw new TypeError("Payment deadline must be configured in whole minutes.");
    paymentDeadlineMinutes = input.paymentDeadlineMinutes;
  }
  return {
    enabled: true,
    upiVpa,
    payeeName,
    currency: "INR",
    paymentDeadlineMinutes,
    showHoldExpiry: input.showHoldExpiry === true,
  };
}

export function formatRupeesFromPaise(amountPaise) {
  paise(amountPaise, "Amount");
  return `${Math.floor(amountPaise / 100)}.${String(amountPaise % 100).padStart(2, "0")}`;
}
