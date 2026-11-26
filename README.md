# Bethel Organic Farm website and booking platform

Project for Bethel Organic Farm in Nochupully, Mundur, Palakkad, Kerala. The public site, design system, local booking journey, Firebase rules, data model, and first trusted backend operations are in place. No Firebase project is connected and nothing has been deployed.

## Current stage

Stage 09: Quality and launch readiness. The implementation is not launch-ready: it has no connected Firebase project, real farm configuration, or production test pass.

## Project structure

```text
public/                         Static public site and local-only booking preview
  css/                          Public design system and admin/booking styles
  js/                           Public-site and local booking-preview modules
content/locales.json            Owner-managed translated content field schema
docs/NOTIFICATIONS.md           Translation coverage and notification setup notes
functions/
  domain.js                     Pure validators, money helpers, and state machines
  admin.js                      Service and availability configuration validation
  index.js                      Trusted callable and scheduled functions
  scripts/bootstrap-owner.mjs   Private, manual initial-owner setup using ADC
  test/                          Pure domain, payment, and operations tests
firestore.rules                 Explicit client access; default deny
storage.rules                   Default deny, including payment evidence
firestore.indexes.json          Queries for holds and booking operations
firebase.json                   Hosting and local emulator configuration
tests/security.rules.test.mjs   Firestore and Storage emulator rule tests
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the model, state transitions, security boundaries, and workflows; [ROADMAP.md](ROADMAP.md) for the staged build plan.

See [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md) for the owner information checklist, release gates, controlled deployment outline, and rollback/incident notes. It is a preparation guide; no Firebase deployment or paid service was activated.

See [docs/QA-REPORT.md](docs/QA-REPORT.md) for the Stage 09 checks completed and the verification gaps that remain.

## Preview the website

Use any local static-file server that supports ES modules. From this folder, for example:

```powershell
& 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1123-915-0_26.1123.915.0_x64__3k8sg7r9htsxt\dependencies\python\python.exe' -m http.server 8000 --directory public
```

Open `http://localhost:8000` for the public site or `http://localhost:8000/booking.html` for the booking preview. The preview keeps entered guest details in page memory only; it does not submit or save them.

## Install development dependencies and run local checks

Use Node.js 22 or later. From this folder, install the test/emulator tools and the Functions dependencies:

```powershell
npm install
npm --prefix functions install
```

Run the dependency-free state, validation, and money tests:

```powershell
npm run test:domain
```

Run the Firestore and Storage security-rule tests using only the local emulators and a demo project ID:

```powershell
npm run test:rules
```

Run both suites with `npm test`. The Firebase Emulator Suite may download its emulator binaries the first time. These commands do not connect to a farm Firebase project.

## Firebase setup and owner bootstrap

No project ID, Firebase web config, UPI details, service account, owner UID, or billing choice is supplied. The farm has supplied its phone/WhatsApp number, email, and postal address for the public contact section; a map pin is still needed. `.firebaserc` is intentionally absent. Choose a Firebase project and confirm its billing/setup before linking one with Firebase CLI. Keep service-account files, private keys, `.env` files, payment details, and evidence out of source control.

The Functions deployment runtime is Node.js 22. Deploying Cloud Functions currently requires the Firebase Blaze plan, and the scheduled hold cleanup uses Cloud Scheduler. Local emulators can be used without connecting or deploying to a production project. Do not enable billing or deploy as part of this stage.

After a project and initial owner account are confirmed, set `FIREBASE_PROJECT_ID` and `BETHEL_OWNER_UID`, authenticate locally with Application Default Credentials, review `functions/scripts/bootstrap-owner.mjs`, then run it once from `functions/`. It sets the owner custom claim and records the bootstrap; there is no public “make me owner” function. Staff roles can then be assigned by an owner callable.

## Required owner configuration before reservations can be created

Set `businessSettings/booking` with explicit `checkoutEnabled`, `pricingConfigured`, `feePolicyConfigured`, `currency`, and `holdDurationMinutes`. For every bookable service item, configure `isBookable`, `currency`, `unitPricePaise`, `taxRateBps`, and `feePaisePerUnit`. Create inventory documents for each date and configured time slot with `date`, `slotId`, `capacity`, `held`, and `reserved` counters. The backend intentionally rejects missing values rather than inventing rates, availability, taxes, fees, or hold periods.

The farm must also provide service categories, capacities, schedules, guest terms, cancellation/refund rules, official contact details, UPI instructions, and an approved Firebase project. Direct UPI evidence is only evidence; an authorised staff member must verify it before a booking is confirmed.

Stage 06 adds owner-only audited functions to configure UPI instructions and a versioned refund policy. The UPI setting remains disabled until the owner supplies and verifies the VPA/payee. Refund percentages are explicit per service type and saved as a snapshot on each reservation; cancellation calculations use service start times and integer paise. Positive refund amounts enter the manual staff workflow and are never sent automatically. Review the customer guide at `public/payment.html` and staff preview at `public/payment-review.html`.

Stage 07 expands `public/admin-preview.html` into a role-aware operations workspace preview. Trusted callable functions provide an overview scoped to owner/booking or restaurant roles, audited owner-only service pricing and availability setup, and capacity checks that preserve held/reserved inventory. Service and availability inputs are validated using INR integer paise and the farm timezone. The screen does not sign in, show seeded customer data, or enable actions until the frontend is connected to Firebase Auth and the approved project.

Stage 08 adds a stable translation dictionary and keyboard-accessible language selector on the public home and booking pages. English, Malayalam, Tamil, and Hindi core navigation, key headings, visit choices, and booking summary labels are translated. Guest locale choice stays in local browser storage. English remains the fallback; most descriptive content and all safety/payment/cancellation/legal copy remain English until owner-reviewed translations are supplied. The locale content schema includes accommodation, experiences, menu items, packages, policies, and FAQs.

Notification preference callables store a signed-in customer's chosen locale and event preferences. Event opt-ins default off and no channel can be enabled until an owner selects channels and an appropriate consent flow is approved. A provider-neutral outbox record builder provides deduplication and safe status/error fields, but no worker, paid provider, or sending path is enabled. WhatsApp automation remains out of scope.

## Current limitations

No frontend is connected to Firebase yet. The customer and staff screens are previews and do not create real reservations or expose live records. Rate limits and production App Check registration need review before launch. Payment evidence uploads are blocked in Storage until scoped private access is implemented. Refunds require owner-supplied rules and manual staff processing; no refund is sent automatically. No production deployment has been attempted. The public site now shows farm-supplied contact/address details and information; rates, operating schedules, policies, and a map pin remain to be supplied. The pure Node domain and payment tests run locally; Firestore/Storage emulator rules tests could not be run because the package registry was unavailable during dependency installation.
