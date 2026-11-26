# Architecture

## Confirmed direction

- Public brand: Bethel Organic Farm
- Location: Dhoni, Palakkad, Kerala, India
- Frontend: semantic HTML, CSS, and vanilla JavaScript ES modules
- Planned backend: Firebase Authentication, Cloud Firestore, Cloud Functions, Cloud Storage, and Firebase Hosting
- Planned languages: English, Malayalam, Tamil, and Hindi
- Visual direction for a later stage: Cinematic Wilderness

## Stages 01-04 boundaries

The foundation, design system, public website, and local-only booking preview are complete. The booking preview does not collect information on a server, create reservations, check live prices/availability, or accept payments. Public content remains explicit about owner-supplied details.

## Stage 02 visual system

The public hospitality system uses deep forest, warm ivory, soft leaf, earthy brown, and muted gold; an editorial serif display stack; and a readable sans-serif interface stack. Shared patterns cover buttons, navigation, cards, badges, form states, notices, spacing, and responsive layouts. Keyboard focus, reduced motion, disabled, loading, error, and success treatments are included.

The staff operations preview has its own compact, neutral interface palette and navigation pattern. Both previews are static design examples: the admin preview has no sign-in or live records, and the public abstract landscape is clearly labelled rather than presented as farm photography.

## Stage 03 public website

The public site is a static, single-page experience with semantic sections for the farm, accommodation, experiences, restaurant, packages, gallery, verified guest stories, FAQs, and contact/directions. It uses CSS-only abstract landscape art with visible placeholder labels. Stays, menu, packages, guest reviews, schedules, rates, policies, map pin, and contact channels remain owner inputs.

The mobile navigation is an accessible disclosure menu. Enquiry calls to action lead to the contact section; the WhatsApp link is configured from `public/js/config.js` and remains an on-page link until the farm supplies an official number. There is no booking form, customer data collection, live inventory, payment handling, or Firebase integration in this stage. SEO metadata, a sitemap, robots rules, and a small Organization record use only confirmed farm name and location facts; domain values are placeholders for launch setup.

## Stage 04 customer booking journey prototype

`public/booking.html` is a four-step local-only preference and review flow for stay, day visit, camping, or experience requests. It collects a preferred date and group size, optional confirmed experience types and food interest, and guest contact fields for validation. Data stays in page memory and is not stored or transmitted. The rate, inventory, time-slot, and payment controls stay unavailable until owner settings and the trusted backend are connected.

The review shows no fabricated totals and does not generate a booking reference. The selected payment direction is Cashfree hosted payment links, sent after the farm confirms the date, price, and advance. Payment collection remains disabled until merchant onboarding, farm pricing and refund terms, secure server credentials, and a live booking connection exist. The existing backend still contains direct-UPI scaffolding; it is not connected to the public site and must not be treated as the selected live payment flow. Secure lookup remains unavailable until a backend supports scoped customer verification. Future server code must keep inventory separate by service while grouping compatible service records under one parent booking reference.

## Public and admin boundaries

- The public website will present stays, day visits, activities, restaurant information, and enquiry routes.
- The customer booking journey is a separate frontend flow. The backend model below groups a customer's request under one parent booking while accommodation, camping, restaurant, and experience inventory remain separately managed.
- A future admin area will have Owner, Reception/Booking Staff, and Restaurant Staff roles. Hiding interface controls is not security; role checks must be enforced by trusted server code and Firebase rules.
- Customer-submitted payment references or screenshots are evidence only. A booking must remain pending until an authorised staff member or an explicitly approved provider integration verifies payment.

## Planned Firebase responsibilities

- **Authentication:** customer accounts and staff identity; guest checkout will require a secure scoped mechanism.
- **Firestore:** business content, service-specific inventory, booking records, payment/refund state, and audit history.
- **Cloud Functions:** trusted price and availability checks, reservation holds, booking state changes, payment verification, cancellations/refunds, and role administration.
- **Storage:** genuine public media and restricted payment evidence, with separate access rules.
- **Hosting:** serve the static frontend after the owner approves a deployment plan.

All prices, availability, discounts, permissions, and payment states must be validated server-side. Use integer paise values for money. Prevent double-booking with transactional server-side inventory holds and expiry handling. Keep booking, payment, and refund statuses separate and restrict sensitive actions to authorised roles.

## Configuration and security

No Firebase project ID or credentials are known yet. Public Firebase web configuration can be supplied in a later setup stage; private credentials must never be committed or shipped to the browser. Firestore and Storage rules default to deny except explicitly published service/review content and scoped staff/customer reads. Functions use Admin SDK and therefore must repeat authorization and validation in server code. Paid Firebase services, a payment provider, messaging, and production deployment require owner decisions and approval.

## Workflows to design in later stages

1. A visitor explores the farm and requests assisted booking or starts a booking journey.
2. Trusted backend code validates configured services, dates, capacities, and prices, then places service-specific holds.
3. The customer reviews one itemised reservation and follows configured payment instructions.
4. Payment evidence remains pending until manually verified; booking confirmation follows only after verification.
5. Staff manage only the operations permitted by their role; sensitive changes are audited.
6. Cancellations and partial refunds follow owner-configured rules, not invented defaults.

## Stage 05 backend and security foundation

The code under `functions/` uses Cloud Functions for Firebase 2nd gen and Node.js 22. Callable operations enforce App Check and validate inputs in trusted code. The local rules and emulator configuration use the non-production project ID `demo-bethel-organic-farm`; no Firebase project is selected in `.firebaserc` and none is connected.

### Firestore data model

| Path | Purpose and ownership |
| --- | --- |
| `publicServices/{serviceType}/items/{itemId}` | Owner-managed public display content. Public clients can read only explicitly published records. Kept separate from internal service pricing and operations data. |
| `serviceCatalog/{serviceType}/items/{itemId}` | Private booking configuration. Booking functions require `isBookable`, configured price, currency, tax basis points, and fee per unit. Client reads and writes are denied. |
| `inventory/{sha256(serviceType|itemId|date|slotId)}` | Separate capacity counters per service item, date, and configured time slot: `capacity`, `held`, `reserved`, `date`, and `slotId`. Clients cannot read or write these counters. |
| `businessSettings/booking` | Owner-configured `checkoutEnabled`, currency, pricing flag, fee-policy flag, and hold duration. Checkout fails closed until required values exist. |
| `bookings/{bookingId}` | Parent reservation and customer snapshot; stores integer-paise components, separate booking/payment/refund statuses, optional customer UID, hashed guest token, hold link, and idempotency hash. |
| `bookings/{bookingId}/serviceReservations/{reservationId}` | One reservation record per service line, linked to the service inventory path and parent booking. Keeps service operations separate under a shared booking. |
| `holds/{bookingId}` | Expiring inventory hold with state, expiry, and inventory path/quantity list. Scheduler releases only still-pending holds transactionally. |
| `payments/{bookingId}` and `/events/{eventId}` | Private payment state, server-calculated due amount, submitted transaction reference, reviewer, timestamps, and append-only event history. Client access is denied. |
| `refunds/{refundId}` | Refund state, reason, policy version, exact integer-paise amount and line breakdown, external reference, and staff history. |
| `users/{uid}` and `staffRoles/{uid}` | Customer profile and server-managed role record. Direct client writes and role reads are denied. Staff authorization uses Admin-managed `staffRole` custom claims. |
| `auditLogs/{logId}` | Append-only records for sensitive state, payment, refund, and role actions. Only owners can read them; clients cannot write. |
| `notificationPreferences/{uid}` | Server-only customer locale, channel preferences (all disabled until approved), and event opt-ins. Customers access this through scoped callables. |
| `notificationOutbox/{eventId}` | Reserved server-only provider-neutral delivery records, deduplication key, attempt count, held/sent/failed status and safe error code. No sender is active. |
| `idempotencyKeys/{sha256}` | Prevents duplicate reservation creation for the same caller/request key. Client access is denied. |

Price and availability are read from owner-configured records inside one Firestore transaction before any writes. The function calculates line subtotal, tax in basis points, per-unit fees, and the parent total using integer paise. The transaction increments each service's `held` counter, creates the parent booking, service reservations, payment record, hold, and idempotency record atomically. Missing settings, catalog entries, rates, tax/fee policy, or availability fail closed.

### Trusted operations and state boundaries

- `createReservation`: validates guest details and service lines; requires App Check and owner-configured checkout, rates, fees/tax, date/slot inventory, currency, and hold length. Guest clients supply a cryptographically random 32-byte access token, retain it for safe retries, and receive it back; only its SHA-256 hash is stored.
- `getBookingSummary`: returns a consistent, minimal snapshot only to the matching signed-in customer or a guest with the scoped token. It does not return UPI references or staff notes.
- `submitPaymentEvidence`: legacy direct-UPI scaffolding; not connected to the current booking preview or selected Cashfree payment plan.
- `getPaymentInstructions`: legacy direct-UPI scaffolding; not connected to the current booking preview or selected Cashfree payment plan.
- `setPaymentInstructions` and `setRefundPolicy`: owner-only audited configuration operations. Direct UPI remains disabled; refund rules must be explicit, versioned, and scoped by service type.
- `decidePayment`: Owner or Booking Staff can verify or reject. Verification transactionally converts held counters to reserved and confirms all service reservations. Rejection records a reason and reopens the hold for the configured hold duration.
- `expireReservationHolds`: scheduled cleanup releases only unsubmitted expired holds through a transaction. Holds in payment review are retained for staff resolution so customer-submitted evidence is not lost to automatic expiry.
- `requestCancellation`: records a scoped cancellation request. Confirmed paid bookings use their saved policy snapshot and service start times to calculate a line-level refund. Zero-eligible outcomes are recorded separately; positive amounts create a staff refund case. No money is sent automatically.
- `updateRefundStatus`: staff can move a refund through allowed states only after an amount is configured. Marking completed requires an external transaction reference and records that staff-reported outcome; no refund is sent by this function.
- `updateStaffRole`: only an Owner claim can assign Owner, Booking, or Restaurant roles. Initial owner setup uses a local ADC-based bootstrap script; there is no public owner-creation endpoint.

Booking, payment, and refund state maps are centralized in `functions/domain.js`. Invalid transitions are rejected. Callable operations use idempotency for reservation creation, repeated payment submission, payment review, cancellation requests, and same-state refund updates.

Stage 06 adds a customer payment/status guide (`public/payment.html`) and a staff payment review preview (`public/payment-review.html`). Both are static previews, with disabled actions until real Firebase identity and client integration are added. Cashfree is the selected gateway; hosted payment links are planned after the farm confirms a booking. No gateway credentials, rates, refund policy, customer case, or payment QR is fabricated. The existing direct-UPI backend functions are legacy scaffolding and should be replaced or isolated before any live payment deployment.

## Stage 07 operations workspace

`public/admin-preview.html` presents owner, booking, and restaurant work areas, bookings, service configuration, availability, payment/refund review, team access, settings, and reporting as labelled empty previews. Its controls are disabled because there is no connected staff identity or Firebase project. `getOperationsOverview` enforces staff claims on the server: owner/booking roles receive the latest 100 booking records and recent refund cases; only owner receives audit history. Restaurant staff receive only restaurant reservation lines without guest contact or payment details. Report counts state their 100-booking limit.

`setServiceConfiguration` and `setAvailability` are owner-only audited callables. Rates and fees are validated as integer paise; tax is basis points; availability uses Asia/Kolkata dates and a timezone-bearing service start. Capacity cannot be reduced below held plus reserved units. Existing service reservations preserve their stored amounts when the catalog changes. The frontend still needs Firebase Auth, callable integration, and owner supplied settings before these operations can be used in the farm's account.

## Stage 08 languages and notifications

`public/js/i18n.js` keeps stable interface keys and English, Malayalam, Tamil, and Hindi values in one module. The public home and booking preview expose a keyboard-accessible selector. The guest's locale is stored locally; date display uses the selected locale and `Asia/Kolkata`, while stored dates and integer-paise amounts remain locale-neutral. English is the missing-key fallback. `content/locales.json` defines translated owner-content fields and pending review states. Legal, cancellation, safety, and payment instructions remain English until approved human translations exist.

Signed-in customers can store locale and event preferences through server callables; direct Firestore access is denied. Event preferences default off. No channel has been selected, channel preferences cannot be turned on, and no provider worker is active. `functions/notifications.js` defines supported event types and a provider-neutral outbox record with a stable idempotency key, held status, attempts and safe error-code fields. Message data contains only the booking reference, never payment evidence or customer contact data. WhatsApp automation stays out of scope until separately approved.

### Security, indexing, and outstanding items

Firestore and Storage deny all unspecified client reads and writes. Explicitly published public service content, public settings, and approved reviews are the only published-data exceptions. Internal service prices and inventory are kept in separate collections. Customers can read their own booking and service reservation by authenticated UID; guest access is via a scoped callable token, never a guessable reference. Restaurant Staff cannot read unrelated booking or payment records. Payment evidence Storage paths remain closed until a later stage implements private upload/download handling.

Indexes cover expiring hold cleanup and staff/customer booking queries. Emulator rule tests are in `tests/security.rules.test.mjs`; pure money, validation, and state-transition tests are in `functions/test/domain.test.js`. Abuse rate limiting, App Check production registration, guest token delivery/storage in the future frontend, secure evidence uploads, refund calculation/settlement, cancellation inventory release, and operational alerting still need review before launch. The Firebase Admin SDK bypasses Security Rules, so each callable must retain its own authorization checks.
