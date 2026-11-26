export const SERVICE_TYPES = new Set(["accommodation", "camping", "restaurant", "experience"]);

export const TRANSITIONS = Object.freeze({
  booking: Object.freeze({
    draft: ["awaiting_payment", "cancelled"],
    awaiting_payment: ["payment_review", "expired", "cancellation_requested"],
    payment_review: ["confirmed", "awaiting_payment", "cancellation_requested"],
    confirmed: ["cancellation_requested"],
    cancellation_requested: ["cancelled", "confirmed"],
    expired: [],
    cancelled: [],
  }),
  payment: Object.freeze({
    awaiting_payment: ["submitted", "expired", "cancelled"],
    submitted: ["verified", "rejected"],
    rejected: ["submitted", "cancelled"],
    verified: [],
    expired: [],
    cancelled: [],
  }),
  refund: Object.freeze({
    none: ["requested", "not_eligible"],
    requested: ["approved", "rejected"],
    approved: ["processing", "rejected"],
    processing: ["completed", "failed"],
    failed: ["processing"],
    completed: [],
    rejected: [],
    not_eligible: [],
  }),
});

export function assertPaise(value, { allowZero = true } = {}) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TypeError("Money must be a non-negative integer number of paise.");
  }
  return value;
}

export function calculateTotalPaise(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new TypeError("At least one priced line is required.");
  return lines.reduce((total, line) => {
    const price = assertPaise(line.unitPricePaise);
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new TypeError("Quantity must be a positive integer.");
    const lineTotal = price * line.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) throw new RangeError("Reservation total is outside the safe integer range.");
    return total + lineTotal;
  }, 0);
}

export function calculatePriceBreakdown(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new TypeError("At least one priced line is required.");
  return lines.reduce((totals, line) => {
    const price = assertPaise(line.unitPricePaise);
    const fee = assertPaise(line.feePaisePerUnit);
    if (!Number.isSafeInteger(line.taxRateBps) || line.taxRateBps < 0 || line.taxRateBps > 10000) throw new TypeError("Tax rate must be configured in basis points.");
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new TypeError("Quantity must be a positive integer.");
    const subtotal = price * line.quantity;
    const taxBig = (BigInt(subtotal) * BigInt(line.taxRateBps) + 5000n) / 10000n;
    const tax = Number(taxBig);
    const fees = fee * line.quantity;
    for (const amount of [subtotal, tax, fees, totals.subtotalPaise + subtotal, totals.taxPaise + tax, totals.feesPaise + fees, totals.totalPaise + subtotal + tax + fees]) {
      if (!Number.isSafeInteger(amount)) throw new RangeError("Reservation total is outside the safe integer range.");
    }
    return {
      subtotalPaise: totals.subtotalPaise + subtotal,
      taxPaise: totals.taxPaise + tax,
      feesPaise: totals.feesPaise + fees,
      totalPaise: totals.totalPaise + subtotal + tax + fees,
    };
  }, { subtotalPaise: 0, taxPaise: 0, feesPaise: 0, totalPaise: 0 });
}

export function validateReservationItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new TypeError("Choose between 1 and 20 reservation items.");
  const combined = new Map();
  for (const raw of items) {
    if (!raw || !SERVICE_TYPES.has(raw.serviceType)) throw new TypeError("Unsupported service type.");
    if (typeof raw.itemId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(raw.itemId)) throw new TypeError("Invalid service item identifier.");
    if (typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) throw new TypeError("Date must use YYYY-MM-DD.");
    const parsed = new Date(`${raw.date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw.date) throw new TypeError("Invalid calendar date.");
    if (!Number.isSafeInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 100) throw new TypeError("Quantity is outside the allowed range.");
    const slotId = raw.slotId ?? "day";
    if (typeof slotId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(slotId)) throw new TypeError("Invalid time slot identifier.");
    const key = `${raw.serviceType}|${raw.itemId}|${raw.date}|${slotId}`;
    const quantity = (combined.get(key)?.quantity ?? 0) + raw.quantity;
    if (quantity > 100) throw new TypeError("Combined quantity is outside the allowed range.");
    combined.set(key, { serviceType: raw.serviceType, itemId: raw.itemId, date: raw.date, slotId, quantity });
  }
  return [...combined.values()];
}

export function normalizeGuest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Guest details are required.");
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (name.length < 2 || name.length > 100) throw new TypeError("Name must be between 2 and 100 characters.");
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new TypeError("Enter a valid email address.");
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone.length > 30 || (phone && (phoneDigits.length < 7 || phoneDigits.length > 15))) throw new TypeError("Enter a valid phone number.");
  if (!email && !phone) throw new TypeError("Provide an email address or phone number.");
  return { name, email: email || null, phone: phone || null };
}

export function transitionState(machine, current, next) {
  const allowed = TRANSITIONS[machine]?.[current];
  if (!allowed || !allowed.includes(next)) throw new TypeError(`Invalid ${machine} transition: ${current} -> ${next}.`);
  return next;
}

export function assertCounter(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer.`);
  return value;
}
