import { SERVICE_TYPES } from "./domain.js";

const ITEM_ID = /^[A-Za-z0-9_-]{1,80}$/;
const SLOT_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function validateServiceConfiguration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Service configuration is required.");
  if (!SERVICE_TYPES.has(input.serviceType)) throw new TypeError("Unsupported service type.");
  if (typeof input.itemId !== "string" || !ITEM_ID.test(input.itemId)) throw new TypeError("Invalid service item identifier.");
  if (typeof input.isBookable !== "boolean") throw new TypeError("Bookable status must be set explicitly.");
  if (input.currency !== "INR") throw new TypeError("Service currency must be INR.");
  if (!Number.isSafeInteger(input.unitPricePaise) || input.unitPricePaise < 0) throw new TypeError("Service rate must be configured as integer paise.");
  if (!Number.isSafeInteger(input.feePaisePerUnit) || input.feePaisePerUnit < 0) throw new TypeError("Fee must be configured as integer paise.");
  if (!Number.isSafeInteger(input.taxRateBps) || input.taxRateBps < 0 || input.taxRateBps > 10000) throw new TypeError("Tax rate must be configured in basis points.");
  const displayName = typeof input.displayName === "string" ? input.displayName.trim().replace(/\s+/g, " ") : "";
  if (displayName.length < 2 || displayName.length > 120) throw new TypeError("Service name must be between 2 and 120 characters.");
  return {
    serviceType: input.serviceType,
    itemId: input.itemId,
    displayName,
    isBookable: input.isBookable,
    currency: "INR",
    unitPricePaise: input.unitPricePaise,
    feePaisePerUnit: input.feePaisePerUnit,
    taxRateBps: input.taxRateBps,
  };
}

export function validateAvailabilityConfiguration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Availability configuration is required.");
  if (!SERVICE_TYPES.has(input.serviceType)) throw new TypeError("Unsupported service type.");
  if (typeof input.itemId !== "string" || !ITEM_ID.test(input.itemId)) throw new TypeError("Invalid service item identifier.");
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new TypeError("Date must use YYYY-MM-DD.");
  const parsedDate = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.date) throw new TypeError("Invalid calendar date.");
  if (typeof input.slotId !== "string" || !SLOT_ID.test(input.slotId)) throw new TypeError("Invalid time slot identifier.");
  if (!Number.isSafeInteger(input.capacity) || input.capacity < 0) throw new TypeError("Capacity must be a non-negative whole number.");
  if (typeof input.serviceStartAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.serviceStartAt) || Number.isNaN(Date.parse(input.serviceStartAt))) throw new TypeError("Service start time must be supplied as an ISO date and time with timezone.");
  const serviceStartAt = new Date(input.serviceStartAt);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(serviceStartAt);
  const day = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  if (`${day.year}-${day.month}-${day.day}` !== input.date) throw new TypeError("Service start time must fall on the configured farm-local date.");
  return { serviceType: input.serviceType, itemId: input.itemId, date: input.date, slotId: input.slotId, capacity: input.capacity, serviceStartAt };
}
