import { createHash } from "node:crypto";

export const SUPPORTED_LANGUAGES = Object.freeze(["en", "ml", "ta", "hi"]);
export const NOTIFICATION_EVENTS = Object.freeze([
  "booking_request_received",
  "payment_evidence_submitted",
  "payment_verified",
  "payment_rejected",
  "booking_confirmed",
  "booking_cancelled",
  "arrival_reminder",
  "experience_food_update",
  "refund_status_update",
]);
const CHANNELS = new Set(["email", "sms", "push"]);

export function validateNotificationPreferences(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Notification preferences are required.");
  if (!SUPPORTED_LANGUAGES.includes(input.locale)) throw new TypeError("Choose a supported notification language.");
  const channels = input.channels ?? {};
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) throw new TypeError("Channel preferences must be an object.");
  const normalizedChannels = {};
  for (const [channel, enabled] of Object.entries(channels)) {
    if (!CHANNELS.has(channel)) throw new TypeError("This notification channel is not available for setup.");
    if (typeof enabled !== "boolean") throw new TypeError("Channel preferences must be explicit true or false values.");
    if (enabled) throw new TypeError("No notification channel or consent process has been approved yet.");
    normalizedChannels[channel] = enabled;
  }
  const events = input.events ?? {};
  if (!events || typeof events !== "object" || Array.isArray(events)) throw new TypeError("Event preferences must be an object.");
  for (const [event, enabled] of Object.entries(events)) {
    if (!NOTIFICATION_EVENTS.includes(event)) throw new TypeError(`Unsupported notification event: ${event}.`);
    if (typeof enabled !== "boolean") throw new TypeError("Event preferences must be explicit true or false values.");
  }
  const normalizedEvents = Object.fromEntries(NOTIFICATION_EVENTS.map((event) => [event, events[event] === true]));
  return { locale: input.locale, channels: normalizedChannels, events: normalizedEvents };
}

export function buildNotificationOutboxRecord({ recipientUid, bookingId, eventType, eventKey, locale = "en" }) {
  if (typeof recipientUid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(recipientUid)) throw new TypeError("A signed-in recipient ID is required before notification delivery can be considered.");
  if (typeof bookingId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) throw new TypeError("A booking reference is required.");
  if (!NOTIFICATION_EVENTS.includes(eventType)) throw new TypeError("Unsupported notification event.");
  if (typeof eventKey !== "string" || eventKey.trim().length < 8 || eventKey.length > 160) throw new TypeError("A stable event key is required for duplicate prevention.");
  if (!SUPPORTED_LANGUAGES.includes(locale)) throw new TypeError("Choose a supported notification language.");
  const idempotencyKey = createHash("sha256").update(`${recipientUid}|${bookingId}|${eventType}|${eventKey}`).digest("hex");
  return {
    recipientUid,
    bookingId,
    eventType,
    templateKey: eventType,
    locale,
    channel: null,
    status: "held_for_channel_setup",
    idempotencyKey,
    attempts: 0,
    lastErrorCode: null,
    lastErrorAt: null,
    messageData: { bookingId },
  };
}
