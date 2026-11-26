# Owner launch checklist

Use this checklist with the farm owner before connecting a production Firebase project or publishing the site. A checked development item does not count as owner approval to deploy.

## Farm information and approved media

- [ ] Approved logo, wordmark, colours, and brand assets.
- [ ] Genuine photos/videos of the farm, accommodation, restaurant/food, river/stream, facilities, and activities, with permission to publish.
- [ ] Owner-approved farm story and values.
- [ ] Accommodation categories, unit counts, capacities, amenities, rates, check-in/check-out times, and booking cutoff.
- [ ] Experience list, schedules, capacities, prices, safety notes, age/fitness guidance, and weather/cancellation operating rules.
- [ ] Restaurant menu, allergens, prices, preorder cutoff, and fulfilment rules.
- [ ] Package names, inclusions, rates, and terms, if packages are offered.
- [x] Farm-supplied phone/WhatsApp number, email, and postal address are shown on the site.
- [ ] Verify the public contact details, provide a map pin/link, and set enquiry response hours.
- [ ] Owner-reviewed Malayalam, Tamil, and Hindi interface and business-content translations. Legal, safety, cancellation, and payment copy requires a qualified human review.

## Booking, payment, and customer terms

- [ ] Booking/guest terms, privacy notice, data-retention period, and consent wording.
- [ ] Whether customer accounts, guest checkout, or assisted bookings are supported at launch.
- [ ] Inventory capacities, operating dates, service slots, and hold duration for each service type.
- [ ] Rates, currency, tax and fee treatment, deposits/advance amount, and price display.
- [ ] Versioned cancellation/refund percentages and time thresholds by service type, including zero-refund cases.
- [ ] Cashfree merchant account approved; current offer eligibility and payment-method pricing checked directly in the merchant dashboard.
- [ ] Cashfree production credentials stored in Firebase Secret Manager (never in frontend code or source control); sandbox-to-live rollout reviewed.
- [ ] Hosted payment-link flow configured for farm-confirmed bookings, including advance amount, link expiry, and payment confirmation handling.
- [ ] Owner decision on notification channels and consent. No channel is active and WhatsApp automation is out of scope.
- [ ] Human-reviewed templates for booking, payment review, confirmation, cancellation, arrival, service updates, and refunds.

## Accounts, Firebase, and operations

- [ ] Owner-approved Firebase project, billing plan, region, domain, and staging/production separation.
- [ ] First owner Firebase Auth account and one-time local owner bootstrap.
- [ ] Staff identities and least-privilege role assignments for Booking and Restaurant staff.
- [ ] Production App Check app registrations and callable-function rate/abuse limits.
- [ ] Private Storage workflow and scoped upload/download rules before accepting payment evidence files.
- [ ] Customer sign-in, callable integration, live booking UI, and notification-preference UI.
- [ ] Owner approval of backup cadence, access to exports, retention, and restore exercise.
- [ ] Error monitoring, alert recipients, support contact, incident owner, and on-call response procedure.

## Release verification

- [ ] Resolve the canonical domain; replace `YOUR-DOMAIN.example` in page metadata and sitemap.
- [ ] Run local domain/payment/admin/i18n tests and Firestore/Storage rules emulator tests successfully.
- [ ] Review authenticated owner, Booking, Restaurant, customer, and unauthenticated access in staging.
- [ ] Test conflicting simultaneous reservations, hold expiry, rejected payment retry, cancellation, and partial refunds.
- [ ] Test all public pages, links, keyboard flow, screen-reader labels, mobile/tablet/desktop layouts, and failed/slow connections.
- [ ] Review SEO metadata, robots, sitemap, schema markup, privacy copy, image rights/size, and measured performance.
- [ ] Take a verified backup and document the exact rollback target before production release.
- [ ] Get explicit owner approval for the production deployment and release window.

## Current readiness

The static website, booking preview, trusted functions, rules, role-oriented dashboard preview, four-locale core UI, and notification data model exist. They are not connected to a Firebase project. Cashfree is the selected payment provider, but no merchant account, production or sandbox credentials, owner account, domain, rates, advance/refund policies, notification provider, map pin, or genuine stay/hero photos have been supplied. The current payment UI is an inactive preview; no payments are collected. Contact details and the postal address were supplied and added to the site, pending owner review. Firebase emulator rule tests have not run because the package manager is unavailable in the current environment and the earlier registry fetch failed. Therefore this repository is **not launch-ready**.

## Controlled deployment outline (only after approval)

1. Create/confirm the owner-selected staging and production projects, billing, region, domain, and backup/export plan.
2. Install the supported Firebase CLI and project dependencies from the official package registry on the release workstation; review lockfiles and project selection.
3. Use Firebase CLI project aliases only after verifying the target ID; never deploy against an implicit/default project.
4. Deploy and verify rules/indexes before functions or hosting. Exercise the full flow in staging with test-only records and payment references.
5. Bootstrap the first owner from a trusted local workstation, verify App Check and staff roles, then apply owner configuration through audited operations.
6. Back up the current production data/configuration, record the current Hosting release and source revision, and obtain a final release go-ahead.
7. Deploy the explicitly selected components to the approved production project and smoke-test public pages, sign-in, booking, payment review, and access boundaries.

Example component command after target confirmation: `firebase deploy --project <approved-project-id> --only firestore:rules,firestore:indexes,storage,functions,hosting`. This command is documentation only; it has not been run.

## Rollback and incident basics

- For a bad Hosting release, use the Firebase Console's Hosting release history to restore the previously recorded release; verify canonical URLs and core booking links afterward.
- For a Functions regression, redeploy the last reviewed source revision to the explicitly named project and recheck callable access, App Check, and scheduled tasks.
- For an access-rule regression, restore the last reviewed rules file and redeploy rules. Then test customer, Booking, Restaurant, and unauthenticated boundaries.
- Do not use an application rollback to erase or rewrite bookings, payments, refunds, audit records, or inventory counters. Preserve evidence and use a separately reviewed correction procedure.
- If access or payment handling is suspect, disable checkout and UPI instructions through owner controls if available, suspend affected staff access through the approved procedure, preserve audit/log evidence, and contact the named incident owner. Do not make a promise about a refund or booking outcome until records are reconciled.
- Record incident time, affected services, actions/actors, customer impact, and recovery checks. Notify the owner and affected customers using owner-approved channels and templates only.
