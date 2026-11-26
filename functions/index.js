import { createHash, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/logger";
import { validateAvailabilityConfiguration, validateServiceConfiguration } from "./admin.js";
import { validateNotificationPreferences } from "./notifications.js";
import {
  calculateRefundBreakdown,
  formatRupeesFromPaise,
  validatePaymentInstructions,
  validateRefundPolicy,
} from "./payments.js";
import {
  assertCounter,
  assertPaise,
  calculatePriceBreakdown,
  normalizeGuest,
  transitionState,
  validateReservationItems,
} from "./domain.js";

initializeApp();
const db = getFirestore();
const CALLABLE_OPTIONS = { enforceAppCheck: true, maxInstances: 20 };
const VALID_STAFF_ROLES = new Set(["owner", "booking", "restaurant"]);

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeText(value, name, maxLength, { required = true } = {}) {
  if (typeof value !== "string") {
    if (!required && (value === null || value === undefined)) return "";
    throw new HttpsError("invalid-argument", `${name} is required.`);
  }
  const text = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  if ((required && text.length === 0) || text.length > maxLength) {
    throw new HttpsError("invalid-argument", `${name} must be 1 to ${maxLength} characters.`);
  }
  return text;
}

function safeDocumentId(value, name) {
  const id = safeText(value, name, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new HttpsError("invalid-argument", `${name} is invalid.`);
  return id;
}

function dateInFarmTimezone() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function dateInFarmTimezoneFromTimestamp(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp.toDate());
  const dateParts = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function constantTimeHashMatch(token, storedHash) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token) || typeof storedHash !== "string") return false;
  const actual = Buffer.from(hash(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function canManageBookings(request) {
  const role = request.auth?.token?.staffRole;
  return role === "owner" || role === "booking";
}

function isOwner(request) {
  return request.auth?.token?.staffRole === "owner";
}

async function assertBookingAccess(request, booking) {
  if (request.auth?.uid && booking.customerUid === request.auth.uid) return;
  if (constantTimeHashMatch(request.data?.guestAccessToken, booking.guestAccessHash)) return;
  throw new HttpsError("permission-denied", "You cannot access this booking.");
}

function recordAudit(transaction, { action, bookingId, request, previousState, nextState, reason = null }) {
  const ref = db.collection("auditLogs").doc();
  transaction.create(ref, {
    action,
    bookingId,
    actorUid: request.auth?.uid ?? null,
    actorRole: request.auth?.token?.staffRole ?? (request.auth ? "customer" : "guest"),
    previousState,
    nextState,
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function convertDomainError(error) {
  if (error instanceof HttpsError) return error;
  if (error instanceof TypeError || error instanceof RangeError) return new HttpsError("invalid-argument", error.message);
  logger.error("Trusted booking operation failed", error);
  return new HttpsError("internal", "The request could not be completed.");
}

function callable(handler) {
  return onCall(CALLABLE_OPTIONS, async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      throw convertDomainError(error);
    }
  });
}

function inventoryDocumentId(line) {
  return hash([line.serviceType, line.itemId, line.date, line.slotId].join("|"));
}

function parseConfiguredMoney(value, fieldName) {
  try {
    return assertPaise(value);
  } catch {
    throw new HttpsError("failed-precondition", `Owner setup required: configure ${fieldName} in integer paise.`);
  }
}

function parseConfiguredCounter(value, fieldName) {
  try {
    return assertCounter(value, fieldName);
  } catch {
    throw new HttpsError("failed-precondition", `Owner setup required: configure a valid ${fieldName} counter.`);
  }
}

function holdExpiryTimestamp(nowMillis, minutes) {
  if (!Number.isSafeInteger(minutes) || minutes < 1) throw new HttpsError("failed-precondition", "Owner setup required: configure the reservation hold duration.");
  const expiresAtMillis = nowMillis + minutes * 60_000;
  if (!Number.isSafeInteger(expiresAtMillis) || expiresAtMillis > 8_640_000_000_000_000) {
    throw new HttpsError("failed-precondition", "Configured reservation hold duration is outside the supported time range.");
  }
  return Timestamp.fromMillis(expiresAtMillis);
}

function jsonSafeRecord(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafeRecord);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafeRecord(item)]));
  return value;
}

export const createReservation = callable(async (request) => {
  const input = request.data ?? {};
  let normalizedItems;
  let guest;
  try {
    normalizedItems = validateReservationItems(input.items);
    guest = normalizeGuest(input.guest);
  } catch (error) {
    throw convertDomainError(error);
  }
  if (normalizedItems.some((line) => line.date < dateInFarmTimezone())) {
    throw new HttpsError("invalid-argument", "Choose a current or future date in the farm's local timezone.");
  }
  const idempotencyKey = safeText(input.idempotencyKey, "Idempotency key", 128);
  if (idempotencyKey.length < 16 || !/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
    throw new HttpsError("invalid-argument", "Idempotency key must contain at least 16 safe characters.");
  }

  const bookingRef = db.collection("bookings").doc();
  const paymentRef = db.collection("payments").doc(bookingRef.id);
  const holdRef = db.collection("holds").doc(bookingRef.id);
  const reservationCollection = bookingRef.collection("serviceReservations");
  const idempotencyScope = request.auth?.uid ?? "guest";
  const idempotencyRef = db.collection("idempotencyKeys").doc(hash(`${idempotencyScope}:${idempotencyKey}`));
  const guestAccessToken = request.auth ? null : safeText(input.guestAccessToken, "Guest access token", 43);
  if (guestAccessToken && !/^[A-Za-z0-9_-]{43}$/.test(guestAccessToken)) {
    throw new HttpsError("invalid-argument", "Guest access token must be a 32-byte base64url token generated with secure browser randomness.");
  }
  const guestAccessHash = guestAccessToken ? hash(guestAccessToken) : null;
  const settingsRef = db.collection("businessSettings").doc("booking");
  const refundPolicyRef = db.collection("businessSettings").doc("refunds");
  const now = Date.now();
  let expiresAtMillis;
  let amount;
  let duplicateResult = null;

  await db.runTransaction(async (transaction) => {
    const idempotencySnapshot = await transaction.get(idempotencyRef);
    if (idempotencySnapshot.exists) {
      const existingId = idempotencySnapshot.data().bookingId;
      const existingBookingRef = db.collection("bookings").doc(existingId);
      const [existingBookingSnapshot, existingPaymentSnapshot] = await Promise.all([
        transaction.get(existingBookingRef),
        transaction.get(db.collection("payments").doc(existingId)),
      ]);
      if (!existingBookingSnapshot.exists || !existingPaymentSnapshot.exists) throw new HttpsError("failed-precondition", "The original reservation record needs staff review.");
      const existing = existingBookingSnapshot.data();
      if (request.auth?.uid ? existing.customerUid !== request.auth.uid : !constantTimeHashMatch(guestAccessToken, existing.guestAccessHash)) {
        throw new HttpsError("permission-denied", "This request key is already in use.");
      }
      const holdSnapshot = existing.holdId ? await transaction.get(db.collection("holds").doc(existing.holdId)) : null;
      duplicateResult = {
        bookingId: existingId,
        guestAccessToken,
        currency: existing.currency,
        subtotalPaise: existing.subtotalPaise,
        taxPaise: existing.taxPaise,
        feesPaise: existing.feesPaise,
        totalPaise: existing.totalPaise,
        holdExpiresAt: holdSnapshot?.exists ? holdSnapshot.data().expiresAt.toDate().toISOString() : null,
        bookingStatus: existing.bookingStatus,
        paymentStatus: existing.paymentStatus,
        idempotent: true,
      };
      return;
    }

    const [settingsSnapshot, refundPolicySnapshot] = await Promise.all([transaction.get(settingsRef), transaction.get(refundPolicyRef)]);
    if (!settingsSnapshot.exists || settingsSnapshot.data().checkoutEnabled !== true) {
      throw new HttpsError("failed-precondition", "Online booking is not enabled by the farm yet.");
    }
    const settings = settingsSnapshot.data();
    if (!refundPolicySnapshot.exists || refundPolicySnapshot.data().isConfigured !== true) {
      throw new HttpsError("failed-precondition", "Owner setup required: configure cancellation and refund rules before accepting reservations.");
    }
    let refundPolicy;
    try {
      refundPolicy = validateRefundPolicy(refundPolicySnapshot.data());
    } catch (error) {
      throw new HttpsError("failed-precondition", `Owner refund policy configuration needs review: ${error.message}`);
    }
    if (!Number.isSafeInteger(settings.holdDurationMinutes) || settings.holdDurationMinutes < 1) throw new HttpsError("failed-precondition", "Owner setup required: configure the reservation hold duration.");
    if (settings.pricingConfigured !== true || settings.currency !== "INR") {
      throw new HttpsError("failed-precondition", "Owner setup required: configure authoritative prices and currency.");
    }
    const feePolicyConfigured = settings.feePolicyConfigured === true;
    if (!feePolicyConfigured) throw new HttpsError("failed-precondition", "Owner setup required: configure whether fees and taxes apply.");

    const catalogRefs = normalizedItems.map((line) => db.doc(`serviceCatalog/${line.serviceType}/items/${line.itemId}`));
    const inventoryRefs = normalizedItems.map((line) => db.collection("inventory").doc(inventoryDocumentId(line)));
    const [catalogSnapshots, inventorySnapshots] = await Promise.all([
      Promise.all(catalogRefs.map((ref) => transaction.get(ref))),
      Promise.all(inventoryRefs.map((ref) => transaction.get(ref))),
    ]);

    const pricedLines = normalizedItems.map((line, index) => {
      const catalogSnapshot = catalogSnapshots[index];
      const inventorySnapshot = inventorySnapshots[index];
      if (!catalogSnapshot.exists || catalogSnapshot.data().isBookable !== true) {
        throw new HttpsError("failed-precondition", "A selected service is not configured for booking.");
      }
      if (!inventorySnapshot.exists) throw new HttpsError("failed-precondition", "Availability has not been configured for a selected date.");
      const catalog = catalogSnapshot.data();
      const inventory = inventorySnapshot.data();
      if (!refundPolicy.rulesByServiceType[line.serviceType]) throw new HttpsError("failed-precondition", `Owner setup required: configure a cancellation policy for ${line.serviceType}.`);
      if (!inventory.serviceStartAt || typeof inventory.serviceStartAt.toMillis !== "function" || dateInFarmTimezoneFromTimestamp(inventory.serviceStartAt) !== line.date) {
        throw new HttpsError("failed-precondition", "Owner setup required: configure the service start time for this date and slot.");
      }
      if (catalog.currency !== settings.currency) throw new HttpsError("failed-precondition", "Service currency configuration does not match the booking settings.");
      const unitPricePaise = parseConfiguredMoney(catalog.unitPricePaise, "service price");
      const feePaisePerUnit = parseConfiguredMoney(catalog.feePaisePerUnit, "service fee policy");
      if (!Number.isSafeInteger(catalog.taxRateBps) || catalog.taxRateBps < 0 || catalog.taxRateBps > 10000) {
        throw new HttpsError("failed-precondition", "Owner setup required: configure the service tax rate in basis points.");
      }
      const capacity = parseConfiguredCounter(inventory.capacity, "capacity");
      const reserved = parseConfiguredCounter(inventory.reserved, "reserved inventory");
      const held = parseConfiguredCounter(inventory.held, "held inventory");
      if (!Number.isSafeInteger(reserved + held) || reserved + held > capacity || inventory.date !== line.date || inventory.slotId !== line.slotId || capacity - reserved - held < line.quantity) {
        throw new HttpsError("resource-exhausted", "The selected service is unavailable for that date or quantity.");
      }
      return {
        ...line,
        inventoryPath: inventoryRefs[index].path,
        unitPricePaise,
        feePaisePerUnit,
        taxRateBps: catalog.taxRateBps,
        currency: settings.currency,
      };
    });
    amount = calculatePriceBreakdown(pricedLines);
    if (amount.totalPaise < 1) throw new HttpsError("failed-precondition", "A positive configured amount is required for UPI checkout.");
    expiresAtMillis = holdExpiryTimestamp(now, settings.holdDurationMinutes).toMillis();

    const reservationRefs = pricedLines.map(() => reservationCollection.doc());
    transaction.create(bookingRef, {
      bookingStatus: "awaiting_payment",
      paymentStatus: "awaiting_payment",
      refundStatus: "none",
      refundPolicySnapshot: {
        policyVersion: refundPolicy.policyVersion,
        currency: refundPolicy.currency,
        timeZone: refundPolicy.timeZone,
        rulesByServiceType: Object.fromEntries([...new Set(pricedLines.map((line) => line.serviceType))].map((serviceType) => [serviceType, refundPolicy.rulesByServiceType[serviceType]])),
      },
      customerUid: request.auth?.uid ?? null,
      guestAccessHash,
      customer: guest,
      currency: settings.currency,
      subtotalPaise: amount.subtotalPaise,
      taxPaise: amount.taxPaise,
      feesPaise: amount.feesPaise,
      totalPaise: amount.totalPaise,
      holdId: holdRef.id,
      idempotencyHash: idempotencyRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(paymentRef, {
      bookingId: bookingRef.id,
      amountPaise: amount.totalPaise,
      currency: settings.currency,
      state: "awaiting_payment",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const holdInventory = [];
    for (let index = 0; index < pricedLines.length; index += 1) {
      const line = pricedLines[index];
      const inventorySnapshot = inventorySnapshots[index];
      const inventory = inventorySnapshot.data();
      const lineBreakdown = calculatePriceBreakdown([line]);
      transaction.update(inventoryRefs[index], {
        held: inventory.held + line.quantity,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(reservationRefs[index], {
        bookingId: bookingRef.id,
        serviceType: line.serviceType,
        itemId: line.itemId,
        date: line.date,
        slotId: line.slotId,
        serviceStartAt: inventory.serviceStartAt,
        quantity: line.quantity,
        currency: line.currency,
        subtotalPaise: lineBreakdown.subtotalPaise,
        taxPaise: lineBreakdown.taxPaise,
        feesPaise: lineBreakdown.feesPaise,
        totalPaise: lineBreakdown.totalPaise,
        inventoryPath: line.inventoryPath,
        reservationStatus: "held",
        createdAt: FieldValue.serverTimestamp(),
      });
      holdInventory.push({ inventoryPath: inventoryRefs[index].path, quantity: line.quantity });
    }
    transaction.create(holdRef, {
      bookingId: bookingRef.id,
      state: "held",
      inventory: holdInventory,
      expiresAt: Timestamp.fromMillis(expiresAtMillis),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(idempotencyRef, { bookingId: bookingRef.id, createdAt: FieldValue.serverTimestamp() });
    recordAudit(transaction, { action: "reservation.created", bookingId: bookingRef.id, request, previousState: null, nextState: "awaiting_payment" });
  });

  if (duplicateResult) return duplicateResult;

  return {
    bookingId: bookingRef.id,
    guestAccessToken,
    currency: "INR",
    ...amount,
    holdExpiresAt: new Date(expiresAtMillis).toISOString(),
    bookingStatus: "awaiting_payment",
    paymentStatus: "awaiting_payment",
  };
});

export const submitPaymentEvidence = callable(async (request) => {
  const bookingId = safeDocumentId(request.data?.bookingId, "Booking ID");
  const transactionReference = safeText(request.data?.transactionReference, "UPI transaction reference", 120);
  const bookingRef = db.collection("bookings").doc(bookingId);
  const paymentRef = db.collection("payments").doc(bookingId);
  const now = Date.now();

  const result = await db.runTransaction(async (transaction) => {
    const instructionsRef = db.collection("businessSettings").doc("payments");
    const [bookingSnapshot, paymentSnapshot, instructionsSnapshot] = await Promise.all([transaction.get(bookingRef), transaction.get(paymentRef), transaction.get(instructionsRef)]);
    if (!bookingSnapshot.exists || !paymentSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    const booking = bookingSnapshot.data();
    await assertBookingAccess(request, booking);
    if (!instructionsSnapshot.exists || instructionsSnapshot.data().enabled !== true) throw new HttpsError("failed-precondition", "The farm has not enabled verified UPI instructions yet.");
    const payment = paymentSnapshot.data();
    if (payment.state === "submitted" && payment.transactionReference === transactionReference) {
      return { bookingId, paymentStatus: "verification_pending", idempotent: true };
    }
    if (booking.bookingStatus !== "awaiting_payment" || !["awaiting_payment", "rejected"].includes(payment.state)) {
      throw new HttpsError("failed-precondition", "Payment evidence cannot be submitted in the current booking state.");
    }
    transitionState("payment", payment.state, "submitted");
    transitionState("booking", "awaiting_payment", "payment_review");
    const holdRef = db.collection("holds").doc(booking.holdId);
    const holdSnapshot = await transaction.get(holdRef);
    if (!holdSnapshot.exists || holdSnapshot.data().state !== "held" || holdSnapshot.data().expiresAt.toMillis() <= now) {
      throw new HttpsError("deadline-exceeded", "The reservation hold has expired. Contact the farm for help.");
    }
    transaction.update(bookingRef, { bookingStatus: "payment_review", paymentStatus: "verification_pending", updatedAt: FieldValue.serverTimestamp() });
    transaction.update(paymentRef, { state: "submitted", transactionReference, rejectionReason: FieldValue.delete(), submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    transaction.update(holdRef, { state: "payment_review", reviewStartedAt: FieldValue.serverTimestamp() });
    const eventRef = paymentRef.collection("events").doc();
    transaction.create(eventRef, { state: "submitted", submittedAt: FieldValue.serverTimestamp() });
    recordAudit(transaction, { action: "payment.evidence_submitted", bookingId, request, previousState: payment.state, nextState: "submitted" });
    return { bookingId, paymentStatus: "verification_pending", idempotent: false };
  });
  return result;
});

export const getBookingSummary = callable(async (request) => {
  const bookingId = safeDocumentId(request.data?.bookingId, "Booking ID");
  const bookingRef = db.collection("bookings").doc(bookingId);
  const paymentRef = db.collection("payments").doc(bookingId);
  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    const booking = bookingSnapshot.data();
    await assertBookingAccess(request, booking);
    const [paymentSnapshot, reservationsSnapshot] = await Promise.all([
      transaction.get(paymentRef),
      transaction.get(bookingRef.collection("serviceReservations")),
    ]);
    if (!paymentSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    return {
      bookingId,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      refundStatus: booking.refundStatus,
      currency: booking.currency,
      subtotalPaise: booking.subtotalPaise,
      taxPaise: booking.taxPaise,
      feesPaise: booking.feesPaise,
      totalPaise: booking.totalPaise,
      paymentAmountPaise: paymentSnapshot.data().amountPaise,
      reservations: reservationsSnapshot.docs.map((snapshot) => {
        const reservation = snapshot.data();
        return {
          serviceType: reservation.serviceType,
          itemId: reservation.itemId,
          date: reservation.date,
          slotId: reservation.slotId,
          quantity: reservation.quantity,
          reservationStatus: reservation.reservationStatus,
        };
      }),
    };
  });
});

export const getPaymentInstructions = callable(async (request) => {
  const bookingId = safeDocumentId(request.data?.bookingId, "Booking ID");
  const bookingRef = db.collection("bookings").doc(bookingId);
  const paymentRef = db.collection("payments").doc(bookingId);
  const holdRef = db.collection("holds").doc(bookingId);
  const instructionsRef = db.collection("businessSettings").doc("payments");
  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    const booking = bookingSnapshot.data();
    await assertBookingAccess(request, booking);
    const [paymentSnapshot, holdSnapshot, instructionsSnapshot] = await Promise.all([
      transaction.get(paymentRef),
      transaction.get(holdRef),
      transaction.get(instructionsRef),
    ]);
    if (!paymentSnapshot.exists || !holdSnapshot.exists) throw new HttpsError("not-found", "Payment instructions are unavailable for this booking.");
    if (!instructionsSnapshot.exists || instructionsSnapshot.data().enabled !== true) {
      throw new HttpsError("failed-precondition", "The farm has not enabled verified UPI instructions yet.");
    }
    if (booking.bookingStatus !== "awaiting_payment" || paymentSnapshot.data().state !== "awaiting_payment" || holdSnapshot.data().state !== "held") {
      throw new HttpsError("failed-precondition", "Payment instructions are unavailable in the current booking state.");
    }
    const settings = validatePaymentInstructions(instructionsSnapshot.data());
    const amountPaise = assertPaise(paymentSnapshot.data().amountPaise, "Payment amount");
    const nowMillis = Date.now();
    const holdExpiresAt = holdSnapshot.data().expiresAt;
    if (!holdExpiresAt || holdExpiresAt.toMillis() <= nowMillis) throw new HttpsError("deadline-exceeded", "The reservation hold has expired.");
    const configuredDeadline = settings.paymentDeadlineMinutes === null ? null : nowMillis + settings.paymentDeadlineMinutes * 60_000;
    const effectiveDeadline = configuredDeadline === null ? null : Math.min(configuredDeadline, holdExpiresAt.toMillis());
    const showHoldExpiry = settings.showHoldExpiry;
    const vpa = encodeURIComponent(settings.upiVpa);
    const payee = encodeURIComponent(settings.payeeName);
    const rupees = formatRupeesFromPaise(amountPaise);
    const paymentUri = `upi://pay?pa=${vpa}&pn=${payee}&am=${rupees}&cu=INR&tn=${encodeURIComponent(bookingId)}`;
    return {
      bookingId,
      amountPaise,
      currency: "INR",
      payeeName: settings.payeeName,
      upiVpa: settings.upiVpa,
      paymentUri,
      paymentDeadlineAt: effectiveDeadline === null ? null : new Date(effectiveDeadline).toISOString(),
      holdExpiresAt: showHoldExpiry ? holdExpiresAt.toDate().toISOString() : null,
      manualVerificationRequired: true,
      paymentStatus: "awaiting_payment",
    };
  });
});

export const setPaymentInstructions = callable(async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Only the owner can configure UPI instructions.");
  let instructions;
  try {
    instructions = validatePaymentInstructions(request.data?.instructions);
  } catch (error) {
    throw convertDomainError(error);
  }
  const settingsRef = db.collection("businessSettings").doc("payments");
  const auditRef = db.collection("auditLogs").doc();
  await db.runTransaction(async (transaction) => {
    const previous = await transaction.get(settingsRef);
    transaction.set(settingsRef, {
      ...instructions,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, {
      action: "payment.instructions_updated",
      actorUid: request.auth.uid,
      actorRole: "owner",
      previousState: previous.exists && previous.data().enabled === true ? "enabled" : "disabled",
      nextState: instructions.enabled ? "enabled" : "disabled",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { enabled: instructions.enabled };
});

export const setRefundPolicy = callable(async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Only the owner can configure cancellation and refund rules.");
  let policy;
  try {
    policy = validateRefundPolicy(request.data?.policy);
  } catch (error) {
    throw convertDomainError(error);
  }
  const settingsRef = db.collection("businessSettings").doc("refunds");
  const auditRef = db.collection("auditLogs").doc();
  await db.runTransaction(async (transaction) => {
    const previous = await transaction.get(settingsRef);
    transaction.set(settingsRef, {
      ...policy,
      isConfigured: true,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, {
      action: "refund.policy_updated",
      actorUid: request.auth.uid,
      actorRole: "owner",
      previousState: previous.exists ? previous.data().policyVersion ?? null : null,
      nextState: policy.policyVersion,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { policyVersion: policy.policyVersion };
});

export const decidePayment = callable(async (request) => {
  if (!canManageBookings(request)) throw new HttpsError("permission-denied", "Only the owner or booking staff can review payment evidence.");
  const bookingId = safeDocumentId(request.data?.bookingId, "Booking ID");
  const decision = request.data?.decision;
  if (!new Set(["verify", "reject"]).has(decision)) throw new HttpsError("invalid-argument", "Decision must be verify or reject.");
  const reason = decision === "reject" ? safeText(request.data?.reason, "Rejection reason", 500) : null;
  const bookingRef = db.collection("bookings").doc(bookingId);
  const paymentRef = db.collection("payments").doc(bookingId);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const [bookingSnapshot, paymentSnapshot] = await Promise.all([transaction.get(bookingRef), transaction.get(paymentRef)]);
    if (!bookingSnapshot.exists || !paymentSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    const booking = bookingSnapshot.data();
    const payment = paymentSnapshot.data();
    if (decision === "verify" && payment.state === "verified") return { bookingId, bookingStatus: "confirmed", idempotent: true };
    if (decision === "reject" && payment.state === "rejected") return { bookingId, paymentStatus: "rejected", idempotent: true };
    if (booking.bookingStatus !== "payment_review" || payment.state !== "submitted") {
      throw new HttpsError("failed-precondition", "Payment is not waiting for review.");
    }
    const holdRef = db.collection("holds").doc(booking.holdId);
    const holdSnapshot = await transaction.get(holdRef);
    if (!holdSnapshot.exists || holdSnapshot.data().state !== "payment_review") throw new HttpsError("failed-precondition", "The reservation hold is not in payment review.");
    const hold = holdSnapshot.data();
    const settingsRef = db.collection("businessSettings").doc("booking");
    const settingsSnapshot = decision === "reject" ? await transaction.get(settingsRef) : null;
    let reservationSnapshot;
    let inventoryRefs = [];
    let inventorySnapshots = [];
    if (decision === "verify") {
      reservationSnapshot = await transaction.get(bookingRef.collection("serviceReservations"));
      inventoryRefs = reservationSnapshot.docs.map((reservation) => db.doc(reservation.data().inventoryPath));
      inventorySnapshots = await Promise.all(inventoryRefs.map((ref) => transaction.get(ref)));
    }

    if (decision === "reject") {
      if (!settingsSnapshot.exists || !Number.isSafeInteger(settingsSnapshot.data().holdDurationMinutes) || settingsSnapshot.data().holdDurationMinutes < 1) {
        throw new HttpsError("failed-precondition", "Owner setup required: configure the hold period before payment rejection can reopen a reservation.");
      }
      const nextExpiry = holdExpiryTimestamp(now, settingsSnapshot.data().holdDurationMinutes);
      transitionState("payment", "submitted", "rejected");
      transitionState("booking", "payment_review", "awaiting_payment");
      transaction.update(paymentRef, { state: "rejected", rejectionReason: reason, reviewedBy: request.auth.uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.update(bookingRef, { bookingStatus: "awaiting_payment", paymentStatus: "rejected", updatedAt: FieldValue.serverTimestamp() });
      transaction.update(holdRef, { state: "held", expiresAt: nextExpiry, reviewStartedAt: FieldValue.delete() });
      const eventRef = paymentRef.collection("events").doc();
      transaction.create(eventRef, { state: "rejected", reason, actorUid: request.auth.uid, createdAt: FieldValue.serverTimestamp() });
      recordAudit(transaction, { action: "payment.rejected", bookingId, request, previousState: "submitted", nextState: "rejected", reason });
      return { bookingId, paymentStatus: "rejected", bookingStatus: "awaiting_payment", idempotent: false };
    }

    transitionState("payment", "submitted", "verified");
    transitionState("booking", "payment_review", "confirmed");
    for (let index = 0; index < reservationSnapshot.docs.length; index += 1) {
      const reservation = reservationSnapshot.docs[index];
      const inventory = inventorySnapshots[index];
      const quantity = reservation.data().quantity;
      if (!inventory.exists) throw new HttpsError("failed-precondition", "A held inventory record is missing.");
      const held = parseConfiguredCounter(inventory.data().held, "held inventory");
      const reserved = parseConfiguredCounter(inventory.data().reserved, "reserved inventory");
      if (held < quantity) throw new HttpsError("failed-precondition", "Held inventory does not match the reservation.");
      if (!Number.isSafeInteger(reserved + quantity)) throw new HttpsError("failed-precondition", "Reserved inventory is outside the supported range.");
      transaction.update(inventoryRefs[index], { held: held - quantity, reserved: reserved + quantity, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(reservation.ref, { reservationStatus: "confirmed", confirmedAt: FieldValue.serverTimestamp() });
    }
    transaction.update(holdRef, { state: "consumed", consumedAt: FieldValue.serverTimestamp() });
    transaction.update(paymentRef, { state: "verified", reviewedBy: request.auth.uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    transaction.update(bookingRef, { bookingStatus: "confirmed", paymentStatus: "verified", confirmedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    const eventRef = paymentRef.collection("events").doc();
    transaction.create(eventRef, { state: "verified", actorUid: request.auth.uid, createdAt: FieldValue.serverTimestamp() });
    recordAudit(transaction, { action: "payment.verified", bookingId, request, previousState: "payment_review", nextState: "confirmed" });
    return { bookingId, bookingStatus: "confirmed", paymentStatus: "verified", idempotent: false };
  });
});

export const requestCancellation = callable(async (request) => {
  const bookingId = safeDocumentId(request.data?.bookingId, "Booking ID");
  const reason = safeText(request.data?.reason, "Cancellation reason", 500);
  const bookingRef = db.collection("bookings").doc(bookingId);
  const paymentRef = db.collection("payments").doc(bookingId);
  return db.runTransaction(async (transaction) => {
    const [bookingSnapshot, paymentSnapshot] = await Promise.all([transaction.get(bookingRef), transaction.get(paymentRef)]);
    if (!bookingSnapshot.exists || !paymentSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    const booking = bookingSnapshot.data();
    await assertBookingAccess(request, booking);
    const payment = paymentSnapshot.data();
    if (booking.bookingStatus === "cancellation_requested") return { bookingId, cancellationStatus: "requested", idempotent: true };
    if (booking.bookingStatus === "payment_review") throw new HttpsError("failed-precondition", "Payment evidence must be reviewed by the farm before cancellation can be handled.");
    if (!["awaiting_payment", "confirmed"].includes(booking.bookingStatus)) throw new HttpsError("failed-precondition", "This booking cannot be cancelled in its current state.");
    transitionState("booking", booking.bookingStatus, "cancellation_requested");
    let refundStatus = booking.refundStatus;
    if (payment.state === "verified") {
      const reservationsSnapshot = await transaction.get(bookingRef.collection("serviceReservations"));
      let refund;
      try {
        refund = calculateRefundBreakdown(reservationsSnapshot.docs.map((snapshot) => snapshot.data()), booking.refundPolicySnapshot, Date.now());
      } catch (error) {
        throw new HttpsError("failed-precondition", `The saved refund rules need staff review: ${error.message}`);
      }
      refundStatus = refund.totalRefundPaise > 0 ? "requested" : "not_eligible";
      transitionState("refund", booking.refundStatus, refundStatus);
      if (refund.totalRefundPaise > 0) {
        const refundRef = db.collection("refunds").doc();
        transaction.create(refundRef, {
          bookingId,
          state: "requested",
          amountPaise: refund.totalRefundPaise,
          currency: refund.currency,
          policyVersion: refund.policyVersion,
          breakdown: refund.lines,
          reason,
          requestedByUid: request.auth?.uid ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    transaction.update(bookingRef, {
      bookingStatus: "cancellation_requested",
      cancellationReason: reason,
      cancellationRequestedAt: FieldValue.serverTimestamp(),
      refundStatus,
      ...(payment.state === "verified" ? { refundCalculatedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    recordAudit(transaction, { action: "booking.cancellation_requested", bookingId, request, previousState: booking.bookingStatus, nextState: "cancellation_requested", reason });
    return { bookingId, cancellationStatus: "requested", refundStatus, idempotent: false };
  });
});

export const updateRefundStatus = callable(async (request) => {
  if (!canManageBookings(request)) throw new HttpsError("permission-denied", "Only the owner or booking staff can update refund cases.");
  const refundId = safeDocumentId(request.data?.refundId, "Refund ID");
  const nextState = safeText(request.data?.nextState, "Refund state", 40);
  const note = safeText(request.data?.note, "Staff note", 500);
  const externalReference = safeText(request.data?.externalReference, "External refund reference", 120, { required: false });
  const refundRef = db.collection("refunds").doc(refundId);
  return db.runTransaction(async (transaction) => {
    const refundSnapshot = await transaction.get(refundRef);
    if (!refundSnapshot.exists) throw new HttpsError("not-found", "Refund case not found.");
    const refund = refundSnapshot.data();
    if (refund.amountPaise === null || refund.amountPaise === undefined) throw new HttpsError("failed-precondition", "The owner must configure and calculate the refund amount before processing.");
    if (refund.state === nextState) {
      if (nextState === "completed" && refund.externalReference !== externalReference) throw new HttpsError("already-exists", "This refund was completed with a different external reference.");
      return { refundId, refundStatus: nextState, idempotent: true };
    }
    transitionState("refund", refund.state, nextState);
    if (nextState === "completed" && !externalReference) throw new HttpsError("invalid-argument", "Record the external transaction reference before marking a refund completed.");
    const bookingRef = db.collection("bookings").doc(refund.bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) throw new HttpsError("not-found", "Related booking not found.");
    transaction.update(refundRef, {
      state: nextState,
      staffNote: note,
      externalReference: externalReference || null,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
      ...(nextState === "completed" ? { completedAt: FieldValue.serverTimestamp() } : {}),
    });
    transaction.update(bookingRef, { refundStatus: nextState, updatedAt: FieldValue.serverTimestamp() });
    recordAudit(transaction, { action: `refund.${nextState}`, bookingId: refund.bookingId, request, previousState: refund.state, nextState, reason: note });
    return { refundId, refundStatus: nextState };
  });
});

async function expireOneHold(holdRef, nowMillis) {
  return db.runTransaction(async (transaction) => {
    const holdSnapshot = await transaction.get(holdRef);
    if (!holdSnapshot.exists) return false;
    const hold = holdSnapshot.data();
    if (hold.state !== "held" || hold.expiresAt.toMillis() > nowMillis) return false;
    const bookingRef = db.collection("bookings").doc(hold.bookingId);
    const paymentRef = db.collection("payments").doc(hold.bookingId);
    const [bookingSnapshot, paymentSnapshot] = await Promise.all([transaction.get(bookingRef), transaction.get(paymentRef)]);
    if (!bookingSnapshot.exists || !paymentSnapshot.exists) throw new Error("Hold references a missing booking or payment record.");
    const booking = bookingSnapshot.data();
    const payment = paymentSnapshot.data();
    if (!["awaiting_payment", "cancellation_requested"].includes(booking.bookingStatus) || !["awaiting_payment", "rejected"].includes(payment.state)) return false;
    const inventoryRefs = (hold.inventory ?? []).map((item) => db.doc(item.inventoryPath));
    const reservationSnapshot = await transaction.get(bookingRef.collection("serviceReservations"));
    const inventorySnapshots = await Promise.all(inventoryRefs.map((ref) => transaction.get(ref)));
    const nextBookingState = booking.bookingStatus === "cancellation_requested" ? "cancelled" : "expired";
    for (let index = 0; index < inventoryRefs.length; index += 1) {
      const inventory = inventorySnapshots[index];
      const quantity = hold.inventory[index].quantity;
      if (!inventory.exists || parseConfiguredCounter(inventory.data().held, "held inventory") < quantity) throw new Error("Expired hold inventory counter mismatch.");
      transaction.update(inventoryRefs[index], { held: inventory.data().held - quantity, updatedAt: FieldValue.serverTimestamp() });
    }
    for (const reservation of reservationSnapshot.docs) transaction.update(reservation.ref, { reservationStatus: nextBookingState, closedAt: FieldValue.serverTimestamp() });
    transaction.update(holdRef, { state: nextBookingState, expiredAt: FieldValue.serverTimestamp() });
    transaction.update(bookingRef, { bookingStatus: nextBookingState, paymentStatus: nextBookingState, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(paymentRef, { state: nextBookingState, updatedAt: FieldValue.serverTimestamp() });
    recordAudit(transaction, { action: `booking.${nextBookingState}`, bookingId: hold.bookingId, request: { auth: null }, previousState: booking.bookingStatus, nextState: nextBookingState });
    return true;
  });
}

export const expireReservationHolds = onSchedule("every 5 minutes", async () => {
  const now = Timestamp.now();
  const expired = await db.collection("holds").where("state", "==", "held").where("expiresAt", "<=", now).limit(100).get();
  for (const hold of expired.docs) {
    try {
      await expireOneHold(hold.ref, now.toMillis());
    } catch (error) {
      logger.error("Could not safely expire a reservation hold", { holdId: hold.id, error });
    }
  }
});

export const getOperationsOverview = callable(async (request) => {
  const role = request.auth?.token?.staffRole;
  if (!new Set(["owner", "booking", "restaurant"]).has(role)) throw new HttpsError("permission-denied", "An authorised farm staff account is required.");
  if (role === "restaurant") {
    const reservations = await db.collectionGroup("serviceReservations").where("serviceType", "==", "restaurant").limit(100).get();
    return {
      role,
      scope: "restaurant service reservations only",
      restaurantReservations: reservations.docs.map((snapshot) => {
        const reservation = snapshot.data();
        return {
          bookingId: reservation.bookingId,
          reservationId: snapshot.id,
          itemId: reservation.itemId,
          date: reservation.date,
          slotId: reservation.slotId,
          quantity: reservation.quantity,
          status: reservation.reservationStatus,
        };
      }),
    };
  }

  const bookingSnapshots = await db.collection("bookings").orderBy("createdAt", "desc").limit(100).get();
  const bookings = await Promise.all(bookingSnapshots.docs.map(async (snapshot) => {
    const booking = snapshot.data();
    const [paymentSnapshot, reservationsSnapshot] = await Promise.all([
      db.collection("payments").doc(snapshot.id).get(),
      snapshot.ref.collection("serviceReservations").get(),
    ]);
    const customer = booking.customer ?? {};
    return {
      bookingId: snapshot.id,
      createdAt: booking.createdAt?.toDate?.().toISOString?.() ?? null,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      refundStatus: booking.refundStatus,
      guestName: customer.name ?? "",
      guestEmail: customer.email ?? null,
      guestPhone: customer.phone ?? null,
      currency: booking.currency,
      totalPaise: booking.totalPaise,
      paymentReference: paymentSnapshot.exists ? paymentSnapshot.data().transactionReference ?? null : null,
      reservations: reservationsSnapshot.docs.map((reservationSnapshot) => {
        const reservation = reservationSnapshot.data();
        return { serviceType: reservation.serviceType, itemId: reservation.itemId, date: reservation.date, slotId: reservation.slotId, quantity: reservation.quantity, status: reservation.reservationStatus };
      }),
    };
  }));
  const [refundSnapshots, auditSnapshots] = await Promise.all([
    db.collection("refunds").orderBy("updatedAt", "desc").limit(50).get(),
    role === "owner" ? db.collection("auditLogs").orderBy("createdAt", "desc").limit(100).get() : Promise.resolve(null),
  ]);
  const counts = bookings.reduce((result, booking) => {
    result.bookingStatuses[booking.bookingStatus] = (result.bookingStatuses[booking.bookingStatus] ?? 0) + 1;
    result.paymentStatuses[booking.paymentStatus] = (result.paymentStatuses[booking.paymentStatus] ?? 0) + 1;
    return result;
  }, { bookingStatuses: {}, paymentStatuses: {} });
  return {
    role,
    scope: "latest 100 bookings",
    bookings,
    refunds: refundSnapshots.docs.map((snapshot) => ({ refundId: snapshot.id, ...jsonSafeRecord(snapshot.data()) })),
    reports: { ...counts, bookingsIncluded: bookings.length, note: "Counts cover the latest 100 bookings only." },
    ...(auditSnapshots ? { audit: auditSnapshots.docs.map((snapshot) => ({ auditId: snapshot.id, ...jsonSafeRecord(snapshot.data()) })) } : {}),
  };
});

export const saveNotificationPreferences = callable(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in to save notification preferences.");
  let preferences;
  try {
    preferences = validateNotificationPreferences(request.data?.preferences);
  } catch (error) {
    throw convertDomainError(error);
  }
  const preferencesRef = db.collection("notificationPreferences").doc(request.auth.uid);
  await preferencesRef.set({ ...preferences, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { locale: preferences.locale, channels: preferences.channels, events: preferences.events, deliveryConfigured: false };
});

export const getNotificationPreferences = callable(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in to read notification preferences.");
  const snapshot = await db.collection("notificationPreferences").doc(request.auth.uid).get();
  if (!snapshot.exists) return { locale: "en", channels: {}, events: {}, deliveryConfigured: false };
  const data = snapshot.data();
  return {
    locale: data.locale,
    channels: data.channels ?? {},
    events: data.events ?? {},
    deliveryConfigured: false,
  };
});

export const setServiceConfiguration = callable(async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Only the owner can change service catalog settings.");
  let config;
  try {
    config = validateServiceConfiguration(request.data?.service);
  } catch (error) {
    throw convertDomainError(error);
  }
  const serviceRef = db.doc(`serviceCatalog/${config.serviceType}/items/${config.itemId}`);
  const auditRef = db.collection("auditLogs").doc();
  await db.runTransaction(async (transaction) => {
    const previous = await transaction.get(serviceRef);
    transaction.set(serviceRef, { ...config, updatedBy: request.auth.uid, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(auditRef, {
      action: "service.configuration_updated",
      actorUid: request.auth.uid,
      actorRole: "owner",
      target: `${config.serviceType}/${config.itemId}`,
      previousState: previous.exists ? previous.data().isBookable ? "bookable" : "not_bookable" : "not_configured",
      nextState: config.isBookable ? "bookable" : "not_bookable",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { serviceType: config.serviceType, itemId: config.itemId, isBookable: config.isBookable };
});

export const setAvailability = callable(async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Only the owner can configure service availability.");
  let config;
  try {
    config = validateAvailabilityConfiguration(request.data?.availability);
  } catch (error) {
    throw convertDomainError(error);
  }
  if (config.date < dateInFarmTimezone()) throw new HttpsError("invalid-argument", "Availability must be for today or a future date in the farm timezone.");
  const inventoryRef = db.collection("inventory").doc(inventoryDocumentId(config));
  const serviceRef = db.doc(`serviceCatalog/${config.serviceType}/items/${config.itemId}`);
  const auditRef = db.collection("auditLogs").doc();
  await db.runTransaction(async (transaction) => {
    const [serviceSnapshot, inventorySnapshot] = await Promise.all([transaction.get(serviceRef), transaction.get(inventoryRef)]);
    if (!serviceSnapshot.exists) throw new HttpsError("failed-precondition", "Configure the service before adding availability.");
    const existing = inventorySnapshot.exists ? inventorySnapshot.data() : { held: 0, reserved: 0 };
    const held = parseConfiguredCounter(existing.held, "held inventory");
    const reserved = parseConfiguredCounter(existing.reserved, "reserved inventory");
    if (!Number.isSafeInteger(held + reserved) || config.capacity < held + reserved) throw new HttpsError("failed-precondition", "Capacity cannot be lower than already held and reserved inventory.");
    transaction.set(inventoryRef, {
      serviceType: config.serviceType,
      itemId: config.itemId,
      date: config.date,
      slotId: config.slotId,
      serviceStartAt: Timestamp.fromDate(config.serviceStartAt),
      capacity: config.capacity,
      held,
      reserved,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, {
      action: "availability.configured",
      actorUid: request.auth.uid,
      actorRole: "owner",
      target: `${config.serviceType}/${config.itemId}/${config.date}/${config.slotId}`,
      nextState: "configured",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { serviceType: config.serviceType, itemId: config.itemId, date: config.date, slotId: config.slotId, capacity: config.capacity };
});

export const updateStaffRole = callable(async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Only an owner can assign staff roles.");
  const uid = safeText(request.data?.uid, "Staff user ID", 128);
  const role = safeText(request.data?.staffRole, "Staff role", 40);
  if (!VALID_STAFF_ROLES.has(role)) throw new HttpsError("invalid-argument", "Choose owner, booking, or restaurant.");
  if (uid === request.auth.uid && role !== "owner") throw new HttpsError("failed-precondition", "An owner cannot remove their own owner role.");
  const { getAuth } = await import("firebase-admin/auth");
  const auth = getAuth();
  const user = await auth.getUser(uid);
  const claims = { ...user.customClaims, staffRole: role };
  await auth.setCustomUserClaims(uid, claims);
  await db.collection("staffRoles").doc(uid).set({ staffRole: role, updatedBy: request.auth.uid, updatedAt: FieldValue.serverTimestamp() });
  await db.collection("auditLogs").add({ action: "staff.role_updated", actorUid: request.auth.uid, actorRole: "owner", targetUid: uid, nextState: role, createdAt: FieldValue.serverTimestamp() });
  return { uid, staffRole: role };
});
