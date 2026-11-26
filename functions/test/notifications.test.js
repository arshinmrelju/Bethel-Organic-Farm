import test from "node:test";
import assert from "node:assert/strict";
import { buildNotificationOutboxRecord, NOTIFICATION_EVENTS, validateNotificationPreferences } from "../notifications.js";

test("notification preferences default every event off and require a supported locale", () => {
  const preferences = validateNotificationPreferences({ locale: "ml" });
  assert.equal(preferences.events.booking_confirmed, false);
  assert.deepEqual(preferences.channels, {});
  assert.equal(Object.keys(preferences.events).length, NOTIFICATION_EVENTS.length);
  assert.throws(() => validateNotificationPreferences({ locale: "en", channels: { whatsapp: true } }), /not available/);
  assert.throws(() => validateNotificationPreferences({ locale: "en", channels: { email: true } }), /channel or consent/);
  assert.throws(() => validateNotificationPreferences({ locale: "en", events: { booking_confirmed: "yes" } }), /explicit true or false/);
  assert.throws(() => validateNotificationPreferences({ locale: "xx" }), /supported notification language/);
});

test("notification outbox uses stable deduplication and keeps delivery inactive", () => {
  const input = { recipientUid: "guest_123", bookingId: "booking_123", eventType: "booking_confirmed", eventKey: "payment_event_123", locale: "ta" };
  const first = buildNotificationOutboxRecord(input);
  const second = buildNotificationOutboxRecord(input);
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.status, "held_for_channel_setup");
  assert.equal(first.channel, null);
  assert.deepEqual(first.messageData, { bookingId: "booking_123" });
  assert.equal(Object.hasOwn(first.messageData, "upiReference"), false);
});
